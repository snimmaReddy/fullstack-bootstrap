# Upstart

This boilerplate has a C# .NET 11 API, MongoDB 8 and a React 19 + TypeScript + Mantine UI. Each entity is **one JSON file** in `schemas/`, which drives the MongoDB validation, the API and the UI forms and tables.

The `product`, `supplier` and `contact` schemas are only sample data. Replace them with your own.

For the design, see:
- [PLAN.md](PLAN.md): phase 1, the API, UI and auth
- [PLAN-json-schemas.md](PLAN-json-schemas.md): phase 2, JSON schemas and the database lock-down
- [PLAN-data-helpers.md](PLAN-data-helpers.md): phase 3, the reusable DB helpers, query filters and links between schemas
- [PLAN-controllers.md](PLAN-controllers.md): phase 4, one controller per API (`api/<collection>`)
- [PLAN-ui.md](PLAN-ui.md): phase 5, the Mantine UI with left navigation and the list → detail → edit workflow

## Prerequisites

- .NET 11 SDK
- Node.js 22+
- MongoDB 8 (`brew install mongodb/brew/mongodb-community`)
- MongoDB Compass (optional, for browsing data)

## First-time setup

```bash
scripts/db.sh start        # MongoDB with auth on, project-local data in .data/mongo
scripts/db.sh init-users   # creates DB users, writes the API connection string + Compass logins
cd web && npm install
```

## Run it

```bash
scripts/db.sh start              # if not already running
cd api && dotnet run             # API → http://localhost:5080 (docs at /scalar)
cd web && npm run dev            # UI  → http://localhost:5173
```

## Schemas and controllers: create, update, delete

```bash
node scripts/schema.mjs new product name:string! price:number category:enum=hardware,software inStock:boolean
                                                    # → schemas/product.json + api/Controllers/ProductsController.cs
node scripts/schema.mjs new note text:text! --no-controller   # schema only, no API yet
node scripts/schema.mjs controller note             # add a controller later
node scripts/schema.mjs list                        # schemas, their API routes and controllers
node scripts/schema.mjs delete product              # removes the schema file, keeps the data; asks about the controller
node scripts/schema.mjs delete product --drop-data  # also drops the collection (asks to confirm)
```

**Each API has its own standard ASP.NET Core controller,** for example [ProductsController.cs](api/Controllers/ProductsController.cs) at `api/products`:
- **Actions:** `GetAll`, `GetById`, `Create`, `Update`, `Patch` and `Delete`. Each one is a line or two that calls the reusable `Db` helpers.
- **Editing:** the generated controller is regular code. Add product-specific actions to it, or remove actions you don't want.
- **Restart:** a new or changed controller needs an API restart (or `dotnet watch`).
- **No controller:** a schema without one still gets its MongoDB collection and validator, but no API.
- **UI page:** add one line to `web/src/app/entities.ts` (see [UI](#ui)).

To **update** a schema, edit its file and save. While the API runs in Development, it reloads within about a second, updates MongoDB's validator and indexes, and the UI picks up the change when you switch back to the tab. If you save an invalid file, the API keeps serving the last valid version and shows the error at `/api/schemas` and in a banner in the UI.

```json
{
  "$schema": "./schema.schema.json",
  "name": "product",
  "title": "Products",
  "fields": {
    "name":     { "type": "string",  "required": true, "maxLength": 100 },
    "sku":      { "type": "string",  "unique": true, "pattern": "^[A-Z0-9-]+$", "label": "SKU" },
    "price":    { "type": "number",  "min": 0 },
    "quantity": { "type": "integer", "min": 0, "default": 0 },
    "category": { "type": "enum",    "values": ["hardware", "software", "service"] },
    "inStock":  { "type": "boolean", "default": true },
    "released": { "type": "date" },
    "notes":    { "type": "text", "showInTable": false }
  }
}
```

- **Field types:** `string`, `text`, `email`, `number`, `integer`, `boolean`, `date`, `enum`, `ref` (a link to another schema).
- **Options for every type:** `required`, `unique`, `default`, `label`, `showInTable`.
- **Type-specific options:** `minLength`, `maxLength`, `pattern`, `min`, `max`, `values`, `ref`.
- **Schema-level `display`:** names the field shown for a record in dropdowns and tables. It defaults to the first string field.
- **Automatic fields:** `id`, `createdAt` and `updatedAt` are added for you.
- **Editor help:** `schemas/schema.schema.json` gives autocomplete and error highlighting in VS Code.

Each schema gets:

| | |
| --- | --- |
| API (once it has a controller) | `GET/POST /api/{collection}`, `GET/PUT/PATCH/DELETE /api/{collection}/{id}` (filters below) |
| MongoDB | Collection `{name}s` with a `$jsonSchema` validator, `uniq_*` / `ref_*` indexes, and a copy in `_schemas` |
| UI | A page at `/{name}` with a form and a table |

### Query string (every controller's `GetAll`)

| Example | Meaning |
| --- | --- |
| `?category=hardware` | equals |
| `?price.lt=100&price.gte=10` | `lt`, `lte`, `gt`, `gte`, `ne` |
| `?category.in=hardware,service` | one of |
| `?name.contains=key` | case-insensitive substring (text fields) |
| `?sort=-price,name&limit=20&skip=40` | sort and page (default: newest first, limit 100, max 500) |
| `?include=supplier` | embed the linked record (a `ref` field) |
| `?include=products` | on a supplier: embed every product that links to it |

Values are converted to the field's type. An unknown field, operator or include, or a value of the wrong type, returns a 400 naming the problem.

### Linking schemas

```json
"supplier": { "type": "ref", "ref": "supplier" }
```

- **Storage:** the link is stored as an ObjectId, and the API reads and writes it as an id string.
- **Integrity:** writes are rejected if the linked record doesn't exist. Deleting a record that others still link to returns 409.
- **UI:** forms show a dropdown of the linked schema, and tables show the linked record's display name.

**Changing a schema with existing data:** there are no automatic migrations.
- Adding optional fields is safe.
- When you rename a field, the old values stay under the old name. Move them in mongosh, connected as admin with the string from `.data/credentials.txt`:

  ```js
  db.getSiblingDB("upstart").products.updateMany({}, { $rename: { oldName: "newName" } })
  ```

## UI

The UI is built on [Mantine](https://mantine.dev). It has:
- **A left sidebar:** the dashboard, one link per registered entity with a live record count, and any custom pages.
- **The same workflow for every entity:**

| Route | Page |
| --- | --- |
| `/<path>` | Table with search (on the display field), filters (enum/boolean fields), sortable columns and pagination. Search, filter and page state is kept in the URL. |
| `/<path>/:id` | All fields, formatted. Linked records are shown as links, and records of other registered entities that link here are shown as small tables. Edit and Delete buttons. |
| `/<path>/new`, `/<path>/:id/edit` | A side drawer with a form generated from the schema. Edits save only the changed fields (PATCH). Server errors, including unique conflicts, show on the right field. |
| Delete | A confirmation dialog. If the API refuses (e.g. other records link to this one), its message is shown. |

### Add or change UI

| To… | Do this |
| --- | --- |
| Add an entity's pages | Add one line to [web/src/app/entities.ts](web/src/app/entities.ts): `{ schema: '<name>', icon: IconSomething }`. Its API is assumed at `/api/<collection>` (the controller template's route). |
| Adjust an entity | Optional keys on that line: `title`, `path`, `endpoint`, `columns`, `filters`, `defaultSort`, `pageSize` (see [entity/types.ts](web/src/entity/types.ts)). |
| Add a custom page | Create `web/src/pages/<Name>Page.tsx` and add `{ path, label, icon, component }` to `customPages` in the same file. |
| Support a new field type | Add it to [web/src/entity/fields.tsx](web/src/entity/fields.tsx) (form input + display). |
| Change the look | [web/src/app/theme.ts](web/src/app/theme.ts): app name, brand colour, font, radius. |

Reusable building blocks for custom pages:
- `components/`: `PageHeader`, `EntityTable`, `StatCard`, `ConfirmDelete`, `EmptyState`, `ErrorState`
- `entity/fields.tsx`: `FieldInput`, `FieldValue`, `RefSelect`
- `api/hooks.ts`: `useList`, `useRecord`, `useSaveRecord`, `useDeleteRecord`, `useCount`

## Database access and Compass

MongoDB runs with authentication on, and only the API can read and write data:

| User | Rights | Used by |
| --- | --- | --- |
| `upstart_api` | readWrite + dbAdmin on `upstart` | The API (connection string in `api/appsettings.Development.json`, git-ignored) |
| `upstart_viewer` | read on `upstart` | MongoDB Compass, viewing only |
| `admin` | root | Setup, and editing data in Compass |

The connection strings are in `.data/credentials.txt`, which is git-ignored. In Compass, connect with the `upstart_viewer` string and open the `upstart` database. Each collection has these tabs:
- **Documents:** the data.
- **Schema:** field analysis.
- **Validation:** the rules generated from your JSON file.
- **Indexes:** the unique indexes.

The `_schemas` collection holds each full definition.

In production, set `Mongo__ConnectionString` and `Jwt__Key` as environment variables.

The schema data endpoints need no user sign-in. That's fine while everything is bound to localhost. Before exposing the API publicly, add an API-side gate such as an API key or user sign-in.

## Reusable DB helpers for custom APIs

Inject `Db` into any controller. It works with every schema, validates writes, and throws errors that become 400/404/409 responses automatically, so actions need no try/catch.

```csharp
[HttpGet("low-stock")]
public async Task<ActionResult<List<Record>>> LowStock([FromQuery] int below = 10) =>
    await db.List("product", Query.Where("quantity", Op.Lt, below).And("inStock", true).Sort("quantity").Include("supplier"));
```

| Method | Does |
| --- | --- |
| `db.List(schema, query?)` | Filtered, sorted, paged list (`Query.Where(...).And(...).Sort(...).Take(n).Skip(n).Include(...)`) |
| `db.Get(schema, id, includes...)` | One record or `null` |
| `db.FindOne(schema, query)` / `db.Count(...)` / `db.Exists(...)` | Lookups |
| `db.Create(schema, data)` | Insert; `data` can be an anonymous object, a dictionary or JSON |
| `db.Update(schema, id, data)` | Full replace of the schema fields |
| `db.Patch(schema, id, data)` | Only the given fields; `null` clears one |
| `db.Delete(schema, id)` | Refuses (409) while other records link to it |

Records come back as `Record` (a dictionary: `id`, fields, `createdAt`, `updatedAt`, plus includes). See [ReportsController.cs](api/Controllers/ReportsController.cs) for two examples:
- `GET /api/reports/low-stock?below=10`
- `GET /api/reports/suppliers/{id}/summary`

## Other API features

- **Auth endpoints:** `POST /api/auth/register | login | logout`, `GET /api/auth/me`. The JWT is set in an HttpOnly cookie, and `Authorization: Bearer` also works.
- **Typed entities:** for entities that need custom C# logic, write a model inheriting `BaseEntity` and a one-line controller deriving `CrudController<T>`. These require sign-in by default.
