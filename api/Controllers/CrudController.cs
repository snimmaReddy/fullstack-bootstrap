using Api.Models;
using Api.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Generic CRUD endpoints. Route is api/{ControllerName minus "Controller"}.
/// Requires a signed-in user by default: put [AllowAnonymous] or [Authorize(Roles = "...")]
/// on the derived controller to change that. Actions are virtual, so override any of them.
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public abstract class CrudController<T>(IRepository<T> repo) : ControllerBase where T : BaseEntity
{
    [HttpGet]
    public virtual async Task<ActionResult<List<T>>> GetAll() => Ok(await repo.GetAllAsync());

    [HttpGet("{id}")]
    public virtual async Task<ActionResult<T>> GetById(string id) =>
        await repo.GetByIdAsync(id) is { } e ? Ok(e) : NotFound();

    [HttpPost]
    public virtual async Task<ActionResult<T>> Create([FromBody] T entity)
    {
        var created = await repo.CreateAsync(entity);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public virtual async Task<ActionResult<T>> Update(string id, [FromBody] T entity) =>
        await repo.UpdateAsync(id, entity) is { } e ? Ok(e) : NotFound();

    [HttpDelete("{id}")]
    public virtual async Task<IActionResult> Delete(string id) =>
        await repo.DeleteAsync(id) ? NoContent() : NotFound();
}
