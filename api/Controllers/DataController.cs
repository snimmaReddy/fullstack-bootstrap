using System.Text.Json;
using System.Text.RegularExpressions;
using Api.Data;
using Api.Schemas;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Controllers;

/// <summary>
/// CRUD for every schema in schemas/*.json: /api/data/{schema}.
/// No user sign-in: the API is the only application with database credentials.
/// </summary>
[ApiController]
[Route("api/data/{schema}")]
public partial class DataController(SchemaRegistry registry, MongoContext ctx) : ControllerBase
{
    private const int MaxLimit = 500;

    [HttpGet]
    public async Task<IActionResult> List(string schema, int limit = 100, int skip = 0, string? sort = null)
    {
        if (registry.Get(schema) is not { } s) return UnknownSchema(schema);

        var desc = sort?.StartsWith('-') ?? true;
        var field = sort?.TrimStart('-') ?? "createdAt";
        if (field != "id" && field != "createdAt" && field != "updatedAt" && s.Find(field) is null)
            return Problem(statusCode: 400, title: $"Can't sort by \"{field}\": not a field of {s.Name}.");

        var docs = await Collection(s)
            .Find(FilterDefinition<BsonDocument>.Empty)
            .Sort(new BsonDocument(field == "id" ? "_id" : field, desc ? -1 : 1))
            .Skip(Math.Max(0, skip))
            .Limit(Math.Clamp(limit, 1, MaxLimit))
            .ToListAsync();
        return Ok(docs.Select(d => DocumentMapper.ToJson(s, d)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string schema, string id)
    {
        if (registry.Get(schema) is not { } s) return UnknownSchema(schema);
        if (!ObjectId.TryParse(id, out var oid)) return NotFound();
        var doc = await Collection(s).Find(new BsonDocument("_id", oid)).FirstOrDefaultAsync();
        return doc is null ? NotFound() : Ok(DocumentMapper.ToJson(s, doc));
    }

    [HttpPost]
    public async Task<IActionResult> Create(string schema, [FromBody] JsonElement body)
    {
        if (registry.Get(schema) is not { } s) return UnknownSchema(schema);
        var (values, errors) = DocumentMapper.FromJson(s, body);
        if (errors.Count > 0) return Invalid(errors);

        var now = DateTime.UtcNow;
        var doc = new BsonDocument("_id", ObjectId.GenerateNewId());
        foreach (var (k, v) in values) doc[k] = v;
        doc["createdAt"] = now;
        doc["updatedAt"] = now;

        try
        {
            await Collection(s).InsertOneAsync(doc);
        }
        catch (MongoException e) when (WriteFailure(e, s) is not null)
        {
            return WriteFailure(e, s)!;
        }

        var json = DocumentMapper.ToJson(s, doc);
        return CreatedAtAction(nameof(Get), new { schema, id = json["id"] }, json);
    }

    /// <summary>Full update: fields left out are cleared. Data under names no longer in the schema is kept.</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string schema, string id, [FromBody] JsonElement body)
    {
        if (registry.Get(schema) is not { } s) return UnknownSchema(schema);
        if (!ObjectId.TryParse(id, out var oid)) return NotFound();
        var (values, errors) = DocumentMapper.FromJson(s, body);
        if (errors.Count > 0) return Invalid(errors);

        var set = new BsonDocument();
        foreach (var (k, v) in values) set[k] = v;
        set["updatedAt"] = DateTime.UtcNow;
        var update = new BsonDocument("$set", set);
        var unset = new BsonDocument(s.Fields.Where(f => !values.ContainsKey(f.Name)).Select(f => new BsonElement(f.Name, "")));
        if (unset.ElementCount > 0) update["$unset"] = unset;

        BsonDocument? updated;
        try
        {
            updated = await Collection(s).FindOneAndUpdateAsync(
                new BsonDocument("_id", oid), update,
                new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After });
        }
        catch (MongoException e) when (WriteFailure(e, s) is not null)
        {
            return WriteFailure(e, s)!;
        }
        return updated is null ? NotFound() : Ok(DocumentMapper.ToJson(s, updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string schema, string id)
    {
        if (registry.Get(schema) is not { } s) return UnknownSchema(schema);
        if (!ObjectId.TryParse(id, out var oid)) return NotFound();
        var result = await Collection(s).DeleteOneAsync(new BsonDocument("_id", oid));
        return result.DeletedCount > 0 ? NoContent() : NotFound();
    }

    private IMongoCollection<BsonDocument> Collection(Schema s) => ctx.Database.GetCollection<BsonDocument>(s.Collection);

    private ObjectResult UnknownSchema(string name) => Problem(statusCode: 404, title: $"Unknown schema \"{name}\".");

    private IActionResult Invalid(Dictionary<string, string> errors)
    {
        foreach (var (k, v) in errors) ModelState.AddModelError(k, v);
        return ValidationProblem(ModelState);
    }

    [GeneratedRegex(@"index: uniq_(\w+)")] private static partial Regex UniqueIndexRx();

    /// <summary>Maps duplicate-key (11000) and validator (121) errors to 409/400; null = not handled.</summary>
    private ObjectResult? WriteFailure(MongoException e, Schema s)
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
            var label = field is null ? "a unique field" : s.Find(field)?.Label ?? field;
            return Problem(statusCode: 409, title: $"Another {s.Name} already has this {label}.");
        }
        if (code == 121)
            return Problem(statusCode: 400, title: "The database rejected this document (schema validation failed).");
        return null;
    }
}
