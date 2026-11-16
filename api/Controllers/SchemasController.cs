using Api.Schemas;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>Read-only view of schemas/*.json (fields, types, labels). Edit the files to change schemas.</summary>
[ApiController]
[Route("api/schemas")]
[Tags("Schemas")]
public class SchemasController(SchemaRegistry registry) : ControllerBase
{
    [HttpGet]
    public IActionResult List() => Ok(new
    {
        schemas = registry.All.Select(SchemaDto.From),
        errors = registry.Errors,
    });

    [HttpGet("{name}")]
    public IActionResult Get(string name) =>
        registry.Get(name) is { } s ? Ok(SchemaDto.From(s)) : Problem(statusCode: 404, title: $"Unknown schema \"{name}\".");
}
