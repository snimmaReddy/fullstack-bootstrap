# Upstart

This boilerplate has a C# .NET 11 API, MongoDB 8 and a React 19 + TypeScript UI. Each entity is **one JSON file** in `schemas/`, and the API, the MongoDB validation and the UI page all come from that file.

For the design, see [PLAN.md](PLAN.md) (phase 1: API, UI, auth) and [PLAN-json-schemas.md](PLAN-json-schemas.md) (phase 2: JSON schemas, database lock-down).

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

## Schemas: create, update, delete

```bash
node scripts/schema.mjs new product name:string! price:number category:enum=hardware,software inStock:boolean
node scripts/schema.mjs list
node scripts/schema.mjs delete product              # removes the file, keeps the data
node scripts/schema.mjs delete product --drop-data  # also drops the collection (asks to confirm)
```

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

- **Field types:** `string`, `text`, `email`, `number`, `integer`, `boolean`, `date`, `enum`.
- **Options for every type:** `required`, `unique`, `default`, `label`, `showInTable`.
- **Type-specific options:** `minLength`, `maxLength`, `pattern`, `min`, `max`, `values`.
- **Automatic fields:** `id`, `createdAt` and `updatedAt` are added for you.
- **Editor help:** `schemas/schema.schema.json` gives autocomplete and error highlighting in VS Code.

Each schema gets:

| | |
| --- | --- |
| API | `GET/POST /api/data/{name}`, `GET/PUT/DELETE /api/data/{name}/{id}` (`?limit=&skip=&sort=-price`) |
| MongoDB | Collection `{name}s` with a `$jsonSchema` validator, `uniq_*` unique indexes, and a copy in `_schemas` |
| UI | A page at `/{name}` with a form and a table |

**Changing a schema with existing data:** there are no automatic migrations.
- Adding optional fields is safe.
- When you rename a field, the old values stay under the old name. Move them in mongosh, connected as admin with the string from `.data/credentials.txt`:

  ```js
  db.getSiblingDB("upstart").products.updateMany({}, { $rename: { oldName: "newName" } })
  ```

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

## Other API features

- **Auth endpoints:** `POST /api/auth/register | login | logout`, `GET /api/auth/me`. The JWT is set in an HttpOnly cookie, and `Authorization: Bearer` also works.
- **Typed entities:** for entities that need custom C# logic, write a model inheriting `BaseEntity` and a one-line controller deriving `CrudController<T>`. These require sign-in by default.
