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
        var database = ctx.Database.DatabaseNamespace.DatabaseName;
        try
        {
            // listCollections (unlike ping) needs valid credentials, so this also checks the API's DB login.
            await ctx.Database.ListCollectionNamesAsync();
            return Ok(new { status = "ok", database });
        }
        catch (MongoAuthenticationException)
        {
            return StatusCode(503, new { status = "error", database, error = "MongoDB rejected the API's credentials (check Mongo:ConnectionString)." });
        }
        catch (Exception e) when (e is MongoException or TimeoutException)
        {
            return StatusCode(503, new { status = "error", database, error = "MongoDB is unreachable: " + e.Message });
        }
    }
}
