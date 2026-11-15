using Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class HealthController(MongoContext ctx) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        await ctx.Database.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
        return Ok(new { status = "ok", database = ctx.Database.DatabaseNamespace.DatabaseName });
    }
}
