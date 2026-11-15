using System.Text.Json;
using Api.Data;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// CRUD for every schema in schemas/*.json at /api/data/{schema}. Adding a schema file needs no code here.
/// Query string: ?field=value, ?field.lt=..., ?sort=-price, ?limit=, ?skip=, ?include=supplier
/// Errors (400/404/409) are thrown by Db and turned into responses by DataErrorHandler.
/// </summary>
[ApiController]
[Route("api/data/{schema}")]
public class DataController(Db db) : ControllerBase
{
    [HttpGet]
    public Task<List<Record>> List(string schema) => db.List(schema, Query.FromRequest(Request));

    [HttpGet("{id}")]
    public async Task<Record> Get(string schema, string id) =>
        await db.Get(schema, id, [.. Query.FromRequest(Request).Includes]) ?? throw NotFoundError.Record(schema, id);

    [HttpPost]
    public async Task<IActionResult> Create(string schema, [FromBody] JsonElement body)
    {
        var record = await db.Create(schema, body);
        return CreatedAtAction(nameof(Get), new { schema, id = record["id"] }, record);
    }

    [HttpPut("{id}")]
    public Task<Record> Update(string schema, string id, [FromBody] JsonElement body) => db.Update(schema, id, body);

    [HttpPatch("{id}")]
    public Task<Record> Patch(string schema, string id, [FromBody] JsonElement body) => db.Patch(schema, id, body);

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string schema, string id)
    {
        await db.Delete(schema, id);
        return NoContent();
    }
}
