using System.Text.Json;
using System.Text.RegularExpressions;
using Api.Schemas;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Data;

/// <summary>A record as the API returns it: id, schema fields, createdAt, updatedAt (+ any includes).</summary>
public sealed class Record : Dictionary<string, object?>;

/// <summary>
/// Reusable, schema-aware data access for every schema in schemas/*.json. Inject it anywhere:
/// <code>
/// var cheap = await db.List("product", Query.Where("price", Op.Lt, 20).Include("supplier"));
/// var p     = await db.Create("product", new { name = "Pen", price = 2 });
/// await db.Patch("product", p["id"]!.ToString()!, new { price = 3 });
/// </code>
/// Writes are validated against the schema. Problems are thrown as <see cref="ValidationError"/>,
/// <see cref="NotFoundError"/> or <see cref="ConflictError"/> and become 400/404/409 responses.
/// </summary>
public sealed partial class Db(SchemaRegistry registry, MongoContext ctx)
{
    private const string IncludePrefix = "__inc_";
    private const int MaxIncludedPerRecord = 500;
    private static readonly JsonSerializerOptions InputJson = new(JsonSerializerDefaults.Web);

    /// <summary>The loaded schema, or a 404 error.</summary>
    public Schema SchemaOf(string name) => registry.Get(name) ?? throw new NotFoundError($"Unknown schema \"{name}\".");

    // ------------------------------------------------------------------ reads

    public async Task<List<Record>> List(string schema, Query? query = null)
    {
        var s = SchemaOf(schema);
        query ??= new Query();
        var includes = ResolveIncludes(s, query.Includes);

        var stages = new List<BsonDocument>
        {
            new("$match", query.BuildFilter(s)),
            new("$sort", query.BuildSort(s)),
        };
        if (query.SkipCount > 0) stages.Add(new BsonDocument("$skip", query.SkipCount));
        stages.Add(new BsonDocument("$limit", query.TakeCount));
        stages.AddRange(includes.Select(i => i.Lookup));

        var docs = await Aggregate(s, stages);
        return docs.Select(d => ToRecord(s, d, includes)).ToList();
    }

    public async Task<Record?> Get(string schema, string id, params string[] include)
    {
        var s = SchemaOf(schema);
        if (!ObjectId.TryParse(id, out var oid)) return null;
        var includes = ResolveIncludes(s, include);

        var stages = new List<BsonDocument> { new("$match", new BsonDocument("_id", oid)) };
        stages.AddRange(includes.Select(i => i.Lookup));

        var doc = (await Aggregate(s, stages)).FirstOrDefault();
        return doc is null ? null : ToRecord(s, doc, includes);
    }

    public async Task<Record?> FindOne(string schema, Query query) => (await List(schema, query.Take(1))).FirstOrDefault();

    public Task<long> Count(string schema, Query? query = null)
    {
        var s = SchemaOf(schema);
        return Collection(s).CountDocumentsAsync((query ?? new Query()).BuildFilter(s));
    }

    public async Task<bool> Exists(string schema, string id)
    {
        var s = SchemaOf(schema);
        return ObjectId.TryParse(id, out var oid) && await ExistsIn(s, oid);
    }

    // ------------------------------------------------------------------ writes

    public async Task<Record> Create(string schema, object data)
    {
        var s = SchemaOf(schema);
        var changes = DocumentMapper.FromJson(s, ToJson(data));
        await EnsureValid(s, changes);

        var now = DateTime.UtcNow;
        var doc = new BsonDocument("_id", ObjectId.GenerateNewId());
        foreach (var (k, v) in changes.Set) doc[k] = v;
        doc["createdAt"] = now;
        doc["updatedAt"] = now;

        await Guard(s, () => Collection(s).InsertOneAsync(doc));
        return DocumentMapper.ToJson(s, doc);
    }

    /// <summary>Full replace of the schema fields: fields left out are cleared.</summary>
    public Task<Record> Update(string schema, string id, object data) => Write(schema, id, data, partial: false);

    /// <summary>Partial update: only the given fields change; null clears an optional field.</summary>
    public Task<Record> Patch(string schema, string id, object data) => Write(schema, id, data, partial: true);

    /// <summary>Deletes a record; refuses (409) while other records still reference it.</summary>
    public async Task Delete(string schema, string id)
    {
        var s = SchemaOf(schema);
        if (!ObjectId.TryParse(id, out var oid)) throw NotFoundError.Record(schema, id);

        foreach (var (other, field) in ReferencesTo(s))
        {
            var n = await Collection(other).CountDocumentsAsync(new BsonDocument(field.Name, oid));
            if (n > 0)
                throw new ConflictError(n == 1
                    ? $"1 {other.Name} references this {s.Name}. Remove or re-point it first."
                    : $"{n} {other.Collection} reference this {s.Name}. Remove or re-point them first.");
        }

        var result = await Collection(s).DeleteOneAsync(new BsonDocument("_id", oid));
        if (result.DeletedCount == 0) throw NotFoundError.Record(schema, id);
    }

    // ------------------------------------------------------------------ internals

    private IMongoCollection<BsonDocument> Collection(Schema s) => ctx.Database.GetCollection<BsonDocument>(s.Collection);

    private async Task<List<BsonDocument>> Aggregate(Schema s, List<BsonDocument> stages) =>
        await (await Collection(s).AggregateAsync(PipelineDefinition<BsonDocument, BsonDocument>.Create(stages))).ToListAsync();

    private async Task<bool> ExistsIn(Schema s, BsonValue id) =>
        await Collection(s).CountDocumentsAsync(new BsonDocument("_id", id), new CountOptions { Limit = 1 }) > 0;

    private async Task<Record> Write(string schema, string id, object data, bool partial)
    {
        var s = SchemaOf(schema);
        if (!ObjectId.TryParse(id, out var oid)) throw NotFoundError.Record(schema, id);
        var changes = DocumentMapper.FromJson(s, ToJson(data), partial);
        await EnsureValid(s, changes);

        var set = new BsonDocument(changes.Set.Select(kv => new BsonElement(kv.Key, kv.Value)));
        set["updatedAt"] = DateTime.UtcNow;
        var update = new BsonDocument("$set", set);
        if (changes.Unset.Count > 0)
            update["$unset"] = new BsonDocument(changes.Unset.Select(f => new BsonElement(f, "")));

        BsonDocument? updated = null;
        await Guard(s, async () => updated = await Collection(s).FindOneAndUpdateAsync(
            new BsonDocument("_id", oid), update,
            new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After }));

        return updated is null ? throw NotFoundError.Record(schema, id) : DocumentMapper.ToJson(s, updated);
    }

    private static JsonElement ToJson(object data) =>
        data is JsonElement e ? e : JsonSerializer.SerializeToElement(data, InputJson);

    /// <summary>Field errors + checks that every ref points at an existing record.</summary>
    private async Task EnsureValid(Schema s, DocumentChanges changes)
    {
        var errors = new Dictionary<string, string>(changes.Errors);
        foreach (var f in s.Fields)
        {
            if (f.Type != FieldType.Ref || errors.ContainsKey(f.Name) || !changes.Set.TryGetValue(f.Name, out var id)) continue;
            if (registry.Get(f.Ref!) is not { } target)
                errors[f.Name] = $"{f.Label} can't be set: schema \"{f.Ref}\" isn't loaded.";
            else if (!await ExistsIn(target, id))
                errors[f.Name] = $"No {target.Name} with id \"{id}\".";
        }
        if (errors.Count > 0) throw new ValidationError(errors);
    }

    /// <summary>Every (schema, field) that refers to <paramref name="s"/>.</summary>
    private IEnumerable<(Schema Other, Field Field)> ReferencesTo(Schema s) =>
        registry.All.SelectMany(o => o.Fields.Where(f => f.Type == FieldType.Ref && f.Ref == s.Name).Select(f => (o, f)));

    private sealed record Include(string Name, BsonDocument Lookup, Schema Target, bool Forward);

    /// <summary>
    /// "supplier" (a ref field of s) → embed that record.
    /// "products" or "products.supplier" (a collection whose ref points at s) → embed the list of referring records.
    /// </summary>
    private List<Include> ResolveIncludes(Schema s, IEnumerable<string> names)
    {
        var result = new List<Include>();
        foreach (var name in names.Distinct())
        {
            var alias = IncludePrefix + name;

            if (s.Find(name) is { Type: FieldType.Ref } f)
            {
                var target = registry.Get(f.Ref!)
                    ?? throw new ValidationError("include", $"Can't include \"{name}\": schema \"{f.Ref}\" isn't loaded.");
                result.Add(new Include(name, new BsonDocument("$lookup", new BsonDocument
                {
                    { "from", target.Collection },
                    { "localField", f.Name },
                    { "foreignField", "_id" },
                    { "as", alias },
                }), target, Forward: true));
                continue;
            }

            var parts = name.Split('.', 2);
            var matches = ReferencesTo(s)
                .Where(r => r.Other.Collection == parts[0] && (parts.Length == 1 || r.Field.Name == parts[1]))
                .ToList();
            if (matches.Count == 0)
                throw new ValidationError("include",
                    $"Can't include \"{name}\": it isn't a ref field of {s.Name}, and no collection of that name refers to {s.Name}.");
            if (matches.Count > 1)
                throw new ValidationError("include",
                    $"\"{name}\" is ambiguous. Use one of: {string.Join(", ", matches.Select(m => $"{parts[0]}.{m.Field.Name}"))}.");

            var (other, field) = matches[0];
            result.Add(new Include(name, new BsonDocument("$lookup", new BsonDocument
            {
                { "from", other.Collection },
                { "localField", "_id" },
                { "foreignField", field.Name },
                { "pipeline", new BsonArray
                    {
                        new BsonDocument("$sort", new BsonDocument("createdAt", -1)),
                        new BsonDocument("$limit", MaxIncludedPerRecord),
                    } },
                { "as", alias },
            }), other, Forward: false));
        }
        return result;
    }

    private static Record ToRecord(Schema s, BsonDocument doc, List<Include> includes)
    {
        var record = DocumentMapper.ToJson(s, doc);
        foreach (var inc in includes)
        {
            var docs = doc.GetValue(IncludePrefix + inc.Name, new BsonArray()).AsBsonArray;
            if (inc.Forward)
                record[inc.Name] = docs.Count > 0 ? DocumentMapper.ToJson(inc.Target, docs[0].AsBsonDocument) : null;
            else
                record[inc.Name] = docs.Select(d => DocumentMapper.ToJson(inc.Target, d.AsBsonDocument)).ToList();
        }
        return record;
    }

    [GeneratedRegex(@"index: uniq_(\w+)")] private static partial Regex UniqueIndexRx();

    /// <summary>Maps MongoDB duplicate-key (11000) and validator (121) errors to Conflict/Validation errors.</summary>
    private static async Task Guard(Schema s, Func<Task> write)
    {
        try
        {
            await write();
        }
        catch (MongoException e)
        {
            var (code, message) = e switch
            {
                MongoWriteException w => (w.WriteError.Code, w.WriteError.Message),
                MongoCommandException c => (c.Code, c.ErrorMessage),
                _ => (0, ""),
            };
            if (code == 11000)
            {
                var field = UniqueIndexRx().Match(message) is { Success: true } m ? m.Groups[1].Value : null;
                var label = field is null ? "unique value" : s.Find(field)?.Label ?? field;
                throw new ConflictError($"Another {s.Name} already has this {label}.", field);
            }
            if (code == 121)
                throw new ValidationError("", "The database rejected this document (schema validation failed).");
            throw;
        }
    }
}
