using System.Text.Json;
using Api.Data;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/demo")]
[Tags("Demo")]
public class DemoController : ControllerBase
{
    private const string Schema = "task";

    [HttpGet]
    [ProducesResponseType<List<Record>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public ActionResult<List<Record>> GetAll()
    {
        return NotImplemented();
    }

    [HttpGet("{id}")]
    [ProducesResponseType<Record>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public ActionResult<Record> GetById(string id, [FromQuery] string? include)
    {
        return NotImplemented();
    }

    [HttpPost]
    [ProducesResponseType<Record>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public ActionResult<Record> Create([FromBody] JsonElement body)
    {
        return NotImplemented();
    }

    [HttpPut("{id}")]
    [ProducesResponseType<Record>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public ActionResult<Record> Update(string id, [FromBody] JsonElement body)
    {
        return NotImplemented();
    }

    [HttpPatch("{id}")]
    [ProducesResponseType<Record>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public ActionResult<Record> Patch(string id, [FromBody] JsonElement body)
    {
        return NotImplemented();
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status501NotImplemented)]
    public IActionResult Delete(string id)
    {
        return NotImplemented();
    }

    private ObjectResult NotImplemented() =>
        Problem(statusCode: StatusCodes.Status501NotImplemented, title: "Not implemented",
            detail: $"{ControllerContext.ActionDescriptor.ActionName} is not implemented yet.");
}
