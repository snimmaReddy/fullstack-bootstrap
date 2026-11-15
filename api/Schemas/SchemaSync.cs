using System.Text.Json;
using Api.Data;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Schemas;

/// <summary>
/// Applies a schema to MongoDB: collection + $jsonSchema validator, managed unique indexes (uniq_*),
/// and a read-only copy of the definition in the _schemas collection (for MongoDB Compass).
/// </summary>
public class SchemaSync(MongoContext ctx, ILogger<SchemaSync> log)
{
    public const string MirrorCollection = "_schemas";
    private const string UniquePrefix = "uniq_";
    private const string RefPrefix = "ref_";

    private static readonly JsonSerializerOptions MirrorJson = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Returns non-fatal problems (e.g. a unique index blocked by existing duplicates).</summary>
    public async Task<List<string>> ApplyAsync(Schema s, CancellationToken ct)
    {
        var problems = new List<string>();
        var db = ctx.Database;
        var validator = BuildValidator(s);

        var exists = await (await db.ListCollectionNamesAsync(
            new ListCollectionNamesOptions { Filter = new BsonDocument("name", s.Collection) }, ct)).AnyAsync(ct);

        if (!exists)
            await db.CreateCollectionAsync(s.Collection, new CreateCollectionOptions<BsonDocument>
            {
                Validator = validator,
                ValidationLevel = DocumentValidationLevel.Moderate,
                ValidationAction = DocumentValidationAction.Error,
            }, ct);
        else
            await db.RunCommandAsync<BsonDocument>(new BsonDocument
            {
                { "collMod", s.Collection },
                { "validator", validator },
                { "validationLevel", "moderate" },
                { "validationAction", "error" },
            }, cancellationToken: ct);

        var col = db.GetCollection<BsonDocument>(s.Collection);
        // Managed indexes: uniq_<field> (unique) and ref_<field> (fast lookups for includes / delete checks).
        var existing = (await (await col.Indexes.ListAsync(ct)).ToListAsync(ct))
            .Select(i => i["name"].AsString).Where(n => n.StartsWith(UniquePrefix) || n.StartsWith(RefPrefix)).ToHashSet();
        var wanted = s.Fields.Where(f => f.Unique).Select(f => (Name: UniquePrefix + f.Name, Field: f, Unique: true))
            .Concat(s.Fields.Where(f => f.Type == FieldType.Ref && !f.Unique).Select(f => (Name: RefPrefix + f.Name, Field: f, Unique: false)))
            .ToList();

        foreach (var name in existing.Except(wanted.Select(w => w.Name)))
            await col.Indexes.DropOneAsync(name, ct);

        foreach (var (name, f, unique) in wanted)
        {
            if (existing.Contains(name)) continue;
            try
            {
                var opts = new CreateIndexOptions<BsonDocument> { Name = name, Unique = unique };
                // Optional fields may be absent on many documents; only enforce uniqueness where a value exists.
                if (unique) opts.PartialFilterExpression = new BsonDocument(f.Name, new BsonDocument("$exists", true));
                await col.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(new BsonDocument(f.Name, 1), opts), cancellationToken: ct);
            }
            catch (MongoCommandException e)
            {
                problems.Add($"Index {name} not created: {e.ErrorMessage}");
            }
        }

        var mirror = BsonDocument.Parse(JsonSerializer.Serialize(SchemaDto.From(s), MirrorJson));
        mirror.Remove("name");
        mirror.InsertAt(0, new BsonElement("_id", s.Name));
        mirror["note"] = "Read-only copy maintained by the API. Edit " + mirror["file"].AsString + " instead.";
        mirror["syncedAt"] = DateTime.UtcNow;
        await db.GetCollection<BsonDocument>(MirrorCollection)
            .ReplaceOneAsync(new BsonDocument("_id", s.Name), mirror, new ReplaceOptions { IsUpsert = true }, ct);

        log.LogInformation("Synced schema {Schema} → collection {Collection}", s.Name, s.Collection);
        return problems;
    }

    /// <summary>Schema file deleted: remove the mirror entry. The collection and its data are kept.</summary>
    public Task RemoveAsync(string name, CancellationToken ct) =>
        ctx.Database.GetCollection<BsonDocument>(MirrorCollection).DeleteOneAsync(new BsonDocument("_id", name), ct);

    public static BsonDocument BuildValidator(Schema s)
    {
        var props = new BsonDocument
        {
            { "_id", new BsonDocument("bsonType", "objectId") },
            { "createdAt", new BsonDocument("bsonType", "date") },
            { "updatedAt", new BsonDocument("bsonType", "date") },
        };
        foreach (var f in s.Fields) props[f.Name] = FieldSchema(f);

        var schema = new BsonDocument { { "bsonType", "object" }, { "title", s.Title } };
        var required = s.Fields.Where(f => f.Required).Select(f => f.Name).ToList();
        if (required.Count > 0) schema["required"] = new BsonArray(required);
        schema["properties"] = props;
        return new BsonDocument("$jsonSchema", schema);
    }

    private static BsonDocument FieldSchema(Field f)
    {
        var types = new BsonArray(f.Type switch
        {
            FieldType.Number => ["double", "int", "long", "decimal"],
            FieldType.Integer => ["int", "long"],
            FieldType.Boolean => ["bool"],
            FieldType.Date => ["date"],
            FieldType.Ref => ["objectId"],
            _ => new[] { "string" },
        });
        if (!f.Required) types.Add("null");

        var d = new BsonDocument { { "bsonType", types.Count == 1 ? types[0] : types }, { "description", f.Label } };
        if (f.MinLength is { } minLen) d["minLength"] = minLen;
        if (f.MaxLength is { } maxLen) d["maxLength"] = maxLen;
        if (f.Pattern is { } pattern) d["pattern"] = pattern;
        if (f.Type == FieldType.Email) d["pattern"] = DocumentMapper.EmailPattern;
        if (f.Min is { } min) d["minimum"] = min;
        if (f.Max is { } max) d["maximum"] = max;
        if (f.Type == FieldType.Enum)
        {
            var values = new BsonArray(f.Values!);
            if (!f.Required) values.Add(BsonNull.Value);
            d["enum"] = values;
        }
        return d;
    }
}
