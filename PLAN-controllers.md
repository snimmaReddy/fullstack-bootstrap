# One Controller per API — Plan

_As of 2026-11-15 · Status: implemented · Follows [PLAN-data-helpers.md](PLAN-data-helpers.md)_

## 1. Goal

Replace the shared `/api/data/{schema}` route with the **standard ASP.NET Core pattern**: one controller per API, each with its own route and its own visible actions.

- `ProductsController` → `api/products`
- `SuppliersController` → `api/suppliers`
- `ContactsController` → `api/contacts`
- `ReportsController` → `api/reports`

Controllers are created **as needed**. A schema only gets an API when its controller exists. The reusable `Db` helpers, `Query`, validation and error handling stay as they are, so each action is still one or two lines.

## 2. The pattern

```csharp
// api/Controllers/ProductsController.cs
[ApiController]
[Route("api/products")]
[Tags("Products")]
public class ProductsController(Db db) : ControllerBase
{
    private const string Schema = "product";   // schemas/product.json

    /// <summary>List products. Filters: ?category=hardware&price.lt=100&sort=-price&include=supplier</summary>
    [HttpGet]
    [ProducesResponseType<List<Record>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<Record>>> GetAll() =>
        await db.List(Schema, Query.FromRequest(Request));

    [HttpGet("{id}")]
    [ProducesResponseType<Record>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Record>> GetById(string id, [FromQuery] string? include)
    {
        var product = await db.Get(Schema, id, Split(include));
        return product is null ? NotFound() : product;
    }

    [HttpPost]
    [ProducesResponseType<Record>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Record>> Create([FromBody] JsonElement body)
    {
        var product = await db.Create(Schema, body);
        return CreatedAtAction(nameof(GetById), new { id = product["id"] }, product);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Record>> Update(string id, [FromBody] JsonElement body) =>
        await db.Update(Schema, id, body);

    [HttpPatch("{id}")]
    public async Task<ActionResult<Record>> Patch(string id, [FromBody] JsonElement body) =>
        await db.Patch(Schema, id, body);

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(string id)
    {
        await db.Delete(Schema, id);
        return NoContent();
    }

    // Product-specific endpoints go here, e.g.:
    // [HttpPost("{id}/restock")] public async Task<ActionResult<Record>> Restock(string id, int amount) { ... }
}
```

- **Explicit actions:** each controller lists its own actions, so you can see, change or remove any of them per API (e.g. drop `Delete` for an API that shouldn't allow it).
- **Custom actions:** product-specific actions go **in that controller**, not in a shared file.
- **Request bodies:** these are `JsonElement` validated against `schemas/product.json`, because the schema file stays the source of truth for fields. Typed C# request DTOs would duplicate the schema (decision C3).
- **Errors:** the 400/409 errors from `Db` are still mapped by the global handler. `404` uses the standard `NotFound()`.
- **API docs:** Scalar groups the endpoints by controller (`Products`, `Suppliers`, …).

## 3. Routes after the change

| Controller | Routes |
| --- | --- |
| `ProductsController` | `GET/POST api/products`, `GET/PUT/PATCH/DELETE api/products/{id}` |
| `SuppliersController` | `GET/POST api/suppliers`, `GET/PUT/PATCH/DELETE api/suppliers/{id}` |
| `ContactsController` | `GET/POST api/contacts`, `GET/PUT/PATCH/DELETE api/contacts/{id}` |
| `ReportsController` | `GET api/reports/low-stock`, `GET api/reports/suppliers/{id}/summary` (moved from minimal APIs) |
| `AuthController`, `HealthController`, `SchemasController` | unchanged |

The route is the schema's **collection name** (`products`), the usual plural REST style. Query-string filters, `include`, sort and paging work the same as before on every `GetAll`.

**Removed:**
- `DataController` (the shared `api/data/{schema}` route)
- `Endpoints/ReportEndpoints.cs`

## 4. Creating a controller (as needed)

```bash
node scripts/schema.mjs new task title:string! due:date        # schema file + TasksController
node scripts/schema.mjs new task title:string! --no-controller # schema only (no API yet)
node scripts/schema.mjs controller task                        # add a controller for an existing schema
node scripts/schema.mjs delete task                            # removes schema; asks before removing the controller
```

- **Generated code:** the generated controller is the pattern in section 2, with the names filled in. After that it's your code: edit freely.
- **Restart needed:** adding or changing a controller is C# code, so the API needs a restart (or `dotnet watch`). Schema-only edits still hot-reload as before.
- **Schema without a controller:** its collection and validator are still created in MongoDB, but it has no API and no UI page.

## 5. UI

- **Endpoints:** `GET /api/schemas` adds an `endpoint` per schema (e.g. `/api/products`), found by checking which routes are registered. A schema with no controller gets `null`.
- **Pages:** the UI builds pages only for schemas that have an endpoint and calls that endpoint instead of `/api/data/...`.
- **Unchanged:** supplier dropdowns and names in tables keep working.

## 6. Steps and checks

1. **Add the controllers and remove the old route**
   - Add Products, Suppliers, Contacts and Reports controllers; remove `DataController` and `ReportEndpoints`.
   - Check: every previous CRUD, filter, include, PATCH and delete-protection check passes on the new routes.
   - Check: `api/data/product` returns 404.
   - Check: both reports return the same numbers as before.
2. **Report endpoints in `/api/schemas`**
   - Check: products, suppliers and contacts show their endpoints.
   - Check: a schema with no controller shows `null`.
3. **CLI**
   - Check: `new` creates the schema and the controller.
   - Check: `--no-controller` creates the schema only.
   - Check: `controller <name>` adds one.
   - Check: the generated controller builds and serves its routes after a restart.
   - Check: `delete` asks about the controller.
4. **UI**
   - Check: pages call the new endpoints; type-check and build pass.
5. **API docs**
   - Check: Scalar shows the endpoints grouped per controller.
6. **Docs and commit**
   - Update the README and earlier plans, then commit.

## 7. Decisions to confirm

| # | Decision | Recommendation |
| --- | --- | --- |
| C1 | Controller style | **Explicit actions in each controller** (shown above), generated from a template. The alternative is a shared base class, which is shorter but hides the actions. |
| C2 | Route naming | `api/{collection}`, e.g. `api/products` |
| C3 | Request/response types | `JsonElement` in, `Record` out, validated by the JSON schema (no duplicate C# DTOs) |
| C4 | Schemas without a controller | No API and no UI page; collection + validator still synced |
| C5 | Reports | Move to `ReportsController` for consistency |
| C6 | `delete` CLI | Removes the schema file; asks before deleting its controller |
