# Reusable DB Helpers, Simple CRUD and Cross-Collection Reads — Plan

_As of 2026-11-15 · Note: the shared `api/data/{schema}` route and `ReportEndpoints.cs` were later replaced by one controller per API — see [PLAN-controllers.md](PLAN-controllers.md). The `Db` helpers, `Query`, `ref` and `include` are unchanged. · Status: implemented (exception types are named `ValidationError`, `NotFoundError`, `ConflictError`) · Follows [PLAN-json-schemas.md](PLAN-json-schemas.md)_

## 1. Goal

Today the MongoDB logic lives inside `DataController` (145 lines), so a custom endpoint would have to repeat it. This plan moves it into one reusable helper, **`Db`**. That gives three results:

1. **CRUD stays automatic.** Every schema file still gets CRUD with no code, and `DataController` shrinks to about 40 lines of one-line actions.
2. **Custom endpoints are a few lines.** Any custom API can use the same helpers: `db.List("product", ...)`, `db.Get("supplier", id)`.
3. **Cross-collection reads take one keyword.** A new `ref` field type links schemas, and `include` pulls in related records.

## 2. The `Db` helper (one service, works for every schema)

```csharp
public class Db   // registered once; inject it anywhere
{
    // Read
    Task<Record?>      Get(string schema, string id, params string[] include);
    Task<List<Record>> List(string schema, Query? query = null);
    Task<Record?>      FindOne(string schema, Query query);
    Task<long>         Count(string schema, Query? query = null);
    Task<bool>         Exists(string schema, string id);

    // Write (validated against the schema)
    Task<Record>       Create(string schema, object data);
    Task<Record>       Update(string schema, string id, object data);  // full replace
    Task<Record>       Patch(string schema, string id, object data);   // only the given fields
    Task               Delete(string schema, string id);
}
```

- **`Record`** is a `Dictionary<string, object?>`: `id`, the schema's fields, `createdAt` and `updatedAt`, plus anything pulled in with `include`. It serializes straight to JSON.
- **`data`** can be a `JsonElement`, a dictionary or an anonymous object, so `db.Create("product", new { name = "Pen", price = 2 })` works.
- **`Query`** is a small fluent builder: filters, sort, paging, includes.

  ```csharp
  Query.Where("category", "hardware").And("price", Op.Lt, 100)
       .Sort("-price").Take(20).Include("supplier");
  ```

- **Failures throw typed exceptions,** and one global handler turns them into HTTP responses, so endpoints never need try/catch:

  | Exception | HTTP |
  | --- | --- |
  | `ValidationFailed` (per-field errors) | 400 |
  | `NotFound` (unknown schema or id) | 404 |
  | `Conflict` (duplicate unique value, or delete blocked by references) | 409 |

- **The typed C# path** (`IRepository<T>`, `CrudController<T>`) is unchanged.

## 3. Automatic CRUD after the change

```csharp
[ApiController, Route("api/data/{schema}")]
public class DataController(Db db) : ControllerBase
{
    [HttpGet]         public Task<List<Record>> List(string schema)          => db.List(schema, Query.FromRequest(Request));
    [HttpGet("{id}")] public Task<Record?> Get(string schema, string id)      => db.Get(schema, id, Query.FromRequest(Request).Includes);
    [HttpPost]        public async Task<IActionResult> Create(string schema, JsonElement body) => Created(..., await db.Create(schema, body));
    [HttpPut("{id}")]   public Task<Record> Update(string schema, string id, JsonElement body) => db.Update(schema, id, body);
    [HttpPatch("{id}")] public Task<Record> Patch(string schema, string id, JsonElement body)  => db.Patch(schema, id, body);
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(string schema, string id) { await db.Delete(schema, id); return NoContent(); }
}
```

A new schema file still means zero code. `PATCH` is new, for partial updates.

### Query string (same filters as `Query`, for any schema)

| Example | Meaning |
| --- | --- |
| `?category=hardware` | equals |
| `?price.lt=100&price.gte=10` | `lt`, `lte`, `gt`, `gte`, `ne` |
| `?category.in=hardware,service` | one of |
| `?name.contains=key` | case-insensitive substring (string, text and email fields) |
| `?inStock=true` | values are converted to the field's type |
| `?sort=-price,name&limit=20&skip=40` | sort, then page (default: newest first, limit 100, max 500) |
| `?include=supplier` | embed related records (section 4) |

Unknown fields, operators or values that don't fit the field type return a 400 naming the problem.

## 4. Cross-collection reads

### New field type: `ref`

```jsonc
// schemas/supplier.json
{ "name": "supplier", "title": "Suppliers", "display": "name",
  "fields": { "name": { "type": "string", "required": true }, "country": { "type": "string" } } }

// schemas/product.json (added field)
"supplier": { "type": "ref", "ref": "supplier" }
```

- **Storage:** a `ref` is stored as an ObjectId, and the API reads and writes it as an id string. Writes are rejected (400) if the referenced record doesn't exist.
- **Indexes:** each ref field gets a `ref_<field>` index automatically, so reverse lookups stay fast.
- **`display` (optional, schema level):** which field names a record in the UI. It defaults to the first `string` field.
- **MongoDB validation:** the field is checked as `objectId` in the `$jsonSchema` validator, so Compass shows it as a real link id.

### Reading related data with `include`

| Request | Result |
| --- | --- |
| `GET /api/data/product?include=supplier` | each product gets `"supplier": { "id": …, "name": …, "country": … }` in place of the id |
| `GET /api/data/supplier/{id}?include=products` | the supplier gets `"products": [ … ]`, every product whose `supplier` points to it (reverse, found automatically) |
| `GET /api/data/supplier?include=products` | the same for a list |

- **Names:** a forward include uses the **field name** (`supplier`). A reverse include uses the **other schema's collection name** (`products`).
- **How it runs:** a single MongoDB `$lookup` aggregation, so there's no per-row query.
- **Limits:** one level deep in v1. Nesting (`include=supplier.country`) can come later.

### Deleting a referenced record

Deleting a supplier that products still point to returns **409**, with a message like "3 products reference this supplier". Remove or re-point them first. This is the safe default; `onDelete: "setNull"` per field can come later.

## 5. Custom endpoints with the helpers

Two examples of what a custom endpoint looks like. They also serve as templates in `api/Endpoints/ReportEndpoints.cs`:

```csharp
app.MapGet("/api/reports/low-stock", (Db db) =>
    db.List("product", Query.Where("quantity", Op.Lt, 10).And("inStock", true).Sort("quantity")));

app.MapGet("/api/reports/suppliers/{id}/summary", async (Db db, string id) =>
{
    var supplier = await db.Get("supplier", id, "products") ?? throw new NotFound("supplier", id);
    var products = (List<Record>)supplier["products"]!;
    return new { supplier = supplier["name"], productCount = products.Count, stock = products.Sum(p => Convert.ToInt64(p["quantity"] ?? 0)) };
});
```

## 6. UI changes

| Piece | Change |
| --- | --- |
| `ref` fields in forms | A dropdown of the referenced records, labelled by their `display` field, loaded from `/api/data/{ref}` |
| `ref` fields in tables | Lists request `?include=<ref fields>`, so tables show the supplier's name instead of an id |
| Field types | `ref` is added to the UI types, and `schemaToResource` passes `ref` + `display` through |

## 7. Code layout

| File | Contents |
| --- | --- |
| `api/Data/Db.cs` | The helper service (section 2) |
| `api/Data/Query.cs` | `Query`, `Op` and `Query.FromRequest` (query-string parsing) |
| `api/Data/DataErrors.cs` | `ValidationFailed`, `NotFound`, `Conflict` + the global `IExceptionHandler` |
| `api/Schemas/DocumentMapper.cs` | Gains `ref` conversion and partial (PATCH) validation |
| `api/Schemas/SchemaLoader.cs`, `SchemaSync.cs` | Gain the `ref` type, `display`, ref checks (target schema exists) and `ref_*` indexes |
| `api/Controllers/DataController.cs` | Shrinks to the one-liners in section 3 |
| `api/Endpoints/ReportEndpoints.cs` | The two example custom endpoints |
| `schemas/supplier.json` + `product.supplier` | Sample relation |

## 8. Steps and checks

1. **`Db` + `Query` + errors**
   - Move the logic out of `DataController`.
   - Check: every CRUD check from phase 2 still returns the same codes.
2. **Query string**
   - Check: each operator in section 3 filters correctly against the sample products.
   - Check: a bad field, operator or value gets 400.
3. **PATCH**
   - Check: a partial update changes only the given fields.
   - Check: required fields aren't demanded on PATCH.
   - Check: `null` clears an optional field.
4. **`ref` type**
   - Add `supplier.json` and `product.supplier`, and seed 3 suppliers linked to the 12 sample products.
   - Check: a write with an id that doesn't exist gets 400.
   - Check: Compass shows the ObjectId plus the `ref_supplier` index.
   - Check: a schema whose `ref` points to an unknown schema is reported as invalid.
5. **`include`**
   - Check: a forward include on a list and on a single record embeds the related record.
   - Check: a reverse include on a supplier lists its products.
   - Check: an unknown include name gets 400.
6. **Delete protection**
   - Check: deleting a referenced supplier gets 409 with a count, and deleting an unreferenced one succeeds.
7. **Custom endpoints**
   - Check: both report endpoints return correct numbers for the sample data.
8. **UI**
   - Check: the product form shows a supplier dropdown, and the products table shows supplier names.
9. **Docs and commit**
   - Update the README (helper reference + query syntax), then commit.

## 9. Decisions to confirm

| # | Decision | Recommendation |
| --- | --- | --- |
| H1 | Helper style | One schema-aware `Db` service that returns `Record` dictionaries; typed `IRepository<T>` stays for C# entities |
| H2 | Errors | Typed exceptions + one global handler (no try/catch in endpoints) |
| H3 | Query-string filters | `field.op=value` syntax (section 3) |
| H4 | Relations | New `ref` field type; `include` for forward and reverse; one level deep in v1 |
| H5 | Ref integrity | Check the target exists on write; block deletes of referenced records (409) |
| H6 | PATCH | Add it (partial update) alongside PUT |
| H7 | Sample data | Add a `supplier` schema with 3 suppliers and link the 12 sample products to them |
| H8 | Custom endpoint examples | Minimal-API style in `api/Endpoints/` (shortest form); controllers work too |
