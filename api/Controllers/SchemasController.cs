using Api.Schemas;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Api.Controllers;

/// <summary>Read-only view of schemas/*.json. Edit the files to change schemas.</summary>
[ApiController]
[Route("api/schemas")]
[Tags("Schemas")]
public class SchemasController(SchemaRegistry registry, EndpointDataSource endpoints) : ControllerBase
{
    [HttpGet]
    public IActionResult List() => Ok(new
    {
        schemas = registry.All.Select(WithEndpoint),
        errors = registry.Errors,
    });

    [HttpGet("{name}")]
    public IActionResult Get(string name) =>
        registry.Get(name) is { } s ? Ok(WithEndpoint(s)) : Problem(statusCode: 404, title: $"Unknown schema \"{name}\".");

    /// <summary>A schema's API is /api/{collection}, if a controller serves that route; otherwise null.</summary>
    private SchemaDto WithEndpoint(Schema s)
    {
        var route = "api/" + s.Collection;
        var served = endpoints.Endpoints.OfType<RouteEndpoint>()
            .Any(e => string.Equals(e.RoutePattern.RawText?.Trim('/'), route, StringComparison.OrdinalIgnoreCase));
        return SchemaDto.From(s) with { Endpoint = served ? "/" + route : null };
    }
}
