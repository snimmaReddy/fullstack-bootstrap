# JSON Schemas — Implementation Plan

_As of 2026-11-15 · Status: implemented · Follows [PLAN.md](PLAN.md) (phase 1, done)_

## 1. Goal

Each entity is defined by **one JSON file** in `schemas/`. Saving the file updates the API, the MongoDB validation and the UI page, with no C# or TypeScript changes and no restart. Deleting the file removes the entity. MongoDB Compass shows each collection's data, its enforced schema and its indexes.

| Action | How |
| --- | --- |
| Create a schema | Add `schemas/product.json` (by hand, or `node scripts/schema.mjs new product name:string! price:number`) |
| Update a schema | Edit and save the file; the API reloads it within about a second |
| Delete a schema | Delete the file (or `node scripts/schema.mjs delete product`); data is kept unless you pass `--drop-data` |
| See schema and data | MongoDB Compass → `upstart` database → the collection's Documents, Schema, Validation and Indexes tabs |

## 2. Schema file format

```jsonc
// schemas/product.json
{
  "$schema": "./schema.schema.json",   // editor autocomplete + validation in VS Code
  "name": "product",                   // lower-case, singular: URL + id
  "collection": "products",            // optional, defaults to name + "s"
  "title": "Products",                 // nav label + page heading
  "fields": {
    "name":     { "type": "string",  "required": true, "maxLength": 100 },
    "sku":      { "type": "string",  "unique": true, "pattern": "^[A-Z0-9-]+$" },
    "price":    { "type": "number",  "min": 0 },
    "quantity": { "type": "integer", "min": 0, "default": 0 },
    "category": { "type": "enum",    "values": ["hardware", "software", "service"] },
    "inStock":  { "type": "boolean" },
    "releasedOn": { "type": "date" },
    "notes":    { "type": "text", "label": "Internal notes", "showInTable": false }
  }
}
```

- `id`, `createdAt` and `updatedAt` are added automatically, as in phase 1.
- `schemas/schema.schema.json` is a JSON Schema for these files, so VS Code flags typos and unknown keys as you type.
- **No access rules in schema files.** A schema describes data shape only. Authorization is enforced by the API (section 4).

### Field types

| Type | Stored in MongoDB as | Options | UI input |
| --- | --- | --- | --- |
| `string` | string | `minLength`, `maxLength`, `pattern` | text |
| `text` | string | `maxLength` | textarea |
| `email` | string (email pattern) | — | email |
| `number` | double | `min`, `max` | number |
| `integer` | long | `min`, `max` | number (step 1) |
| `boolean` | bool | — | checkbox |
| `date` | date (ISO string in JSON) | — | date |
| `enum` | string | `values` (required) | select |

Every type also takes these options: `required`, `unique`, `default`, `label` and `showInTable`.

Not in v1: arrays, nested objects and references to other schemas. The format leaves room for them later (see section 8).

### Rules the API enforces when loading a file

- **Names:** `name` matches `^[a-z][a-z0-9]*$` and is unique across files. Field names are camelCase and can't be `id`, `_id`, `createdAt` or `updatedAt`.
- **Collections:** the collection can't be a reserved one (`users`, anything starting with `_`) or a collection used by a typed C# entity.
- **Invalid files:** the API logs the error, **keeps the last good version** live and reports the error at `GET /api/schemas` (for example, a syntax error while you're mid-edit).

## 3. How it works

```mermaid
flowchart LR
  F[schemas/*.json] -->|load + watch| R[SchemaRegistry]
  R -->|createCollection / collMod<br/>$jsonSchema validator + unique indexes| M[(MongoDB)]
  R -->|mirror definition| S[(_schemas collection)]
  R --> D[DynamicDataController<br/>/api/data/{name}]
  R --> E[/api/schemas/]
  D <--> M
  UI[React UI] -->|GET /api/schemas → routes, nav, forms| E
  UI -->|CRUD| D
  C[MongoDB Compass] --> M
```

Validation happens at two layers:
1. **The API** validates against the schema and returns 400 errors per field, in the same shape the UI already displays.
2. **MongoDB's `$jsonSchema` validator** also rejects bad writes made directly, for example from Compass or mongosh.

## 4. Backend design

| Piece | Responsibility |
| --- | --- |
| `SchemaDefinition` | C# model of a schema file, plus the load-time rules in section 2. |
| `SchemaRegistry` (singleton) | Loads `schemas/*.json` at startup. In Development, a file watcher reloads on save or delete (debounced to about 300 ms). Holds the current valid set and any errors. |
| `SchemaSync` | For each schema it creates the collection with a validator, or updates it (`collMod`) with `validationLevel: moderate` and `validationAction: error`. It keeps unique indexes in step, using the name `uniq_<field>`; only indexes with that prefix are touched. It also writes the definition to the `_schemas` collection as a read-only mirror. |
| `DynamicDataController` | `GET/POST /api/data/{name}` and `GET/PUT/DELETE /api/data/{name}/{id}`. Lists support `?limit=&skip=&sort=field` (sort `-field` for descending; default newest first, limit 100). It uses `BsonDocument` and converts types per field (ISO date to BSON date, integer to long). Unknown fields are rejected, and only schema fields are returned. |
| Access control | Schema data endpoints need **no user sign-in**. The API is the only application that can read and write the database (section 4a). Any future rules, such as an API key or user sign-in, go in API code, never in schema files. The phase-1 auth endpoints (`/api/auth/*`) stay available for later. |
| Errors | Unknown schema: 404. Duplicate unique value: 409 naming the field. Validation: 400 `ValidationProblemDetails`. |
| `SchemasController` | `GET /api/schemas` returns all schemas, their UI metadata and load errors. `GET /api/schemas/{name}` returns one. Read-only, because files are the source of truth. |
| Config | `Schemas:Path` defaults to `../schemas` relative to the API. In production it's loaded once at startup with no watcher. |

**Deleting a schema file** removes its endpoints and UI page and its `_schemas` mirror entry. The collection, its data and its validator stay, so a mistaken delete is recoverable. `schema.mjs delete <name> --drop-data` drops the collection after a confirmation prompt.

**Changing a schema with existing data:** there are no automatic migrations.

| Change | What happens |
| --- | --- |
| Add an optional field | Safe |
| Add a required field | Old documents still read fine, but editing one requires filling the field |
| Rename a field | The old values stay under the old name and the API stops returning them; move them with a mongosh `$rename` (the CLI prints the command) |
| Change a field's type | Existing values are returned as stored |

The typed path from phase 1 (`CrudController<T>` + a C# model) **stays** for entities that need custom C# logic. `User` keeps using it.

## 4a. Database access: only the API can read and write

MongoDB authentication is turned on, and each application gets its own database user with only the rights it needs.

| DB user | Defined in | Roles | Used by |
| --- | --- | --- | --- |
| `admin` | `admin` | `root` | One-time setup and emergencies only |
| `upstart_api` | `upstart` | `readWrite` + `dbAdmin` on `upstart` only | The API. `dbAdmin` is needed to create collections, update validators (`collMod`) and manage indexes. |
| `upstart_viewer` | `upstart` | `read` on `upstart` only | MongoDB Compass, for viewing data, schemas, validators and indexes |

- **Turning it on:** `scripts/db.sh start` runs `mongod --auth`, still bound to `127.0.0.1` only.
- **First-time setup:** `scripts/db.sh init-users` creates the three users. It uses MongoDB's localhost exception, which allows creating the first user when none exist. It generates random passwords and writes:
  - the API connection string `mongodb://upstart_api:<pw>@localhost:27017/upstart?authSource=upstart` into `api/appsettings.Development.json` (git-ignored)
  - the Compass and admin connection strings into `.data/credentials.txt` (git-ignored)
- **Production:** the connection string comes from the `Mongo__ConnectionString` environment variable; no passwords in the repo.
- **Existing dev data:** the current `.data/mongo` holds only test data, so it's reset when auth is turned on.
- **API startup:** the API logs a clear error if the database rejects its credentials, and `/api/health` reports it.
- **Exposure:** schema data endpoints are open to any caller of the API. That's fine while everything is bound to localhost. Before exposing the API publicly, add an API-side gate (API key or user sign-in).

## 5. Frontend design

| Piece | Change |
| --- | --- |
| Schema loading | On start the UI fetches `/api/schemas` and builds routes, nav, forms and tables from it. It refetches when the browser tab regains focus, so a saved schema change shows up without a rebuild. |
| `schemaToResource()` | Adapter from a schema to the existing `ResourceConfig`, so `ResourcePage`, `DynamicForm` and `DataTable` are reused. |
| `DynamicForm` | Adds `select` (enum), `integer` and `default` support. |
| Endpoints | Data calls go to `/api/data/{name}`. |
| Static registry | `web/src/resources/index.ts` remains for typed resources and is merged with the schema list. |
| Errors | A schema load error shows as a banner in Development. |

There are no per-entity TypeScript files. A generated TypeScript types file (`npm run gen:types`) is an optional follow-up.

## 6. CLI: `scripts/schema.mjs`

This replaces `new-resource.mjs`.

```bash
node scripts/schema.mjs new product name:string! price:number category:enum=hardware,software
node scripts/schema.mjs list                      # name, collection, field count
node scripts/schema.mjs delete product            # removes the file, keeps data
node scripts/schema.mjs delete product --drop-data
```

`new` writes a starter JSON file that you then edit. Editing the file is the main way to update a schema.

## 7. MongoDB Compass

- **Connect:** use the `upstart_viewer` connection string from `.data/credentials.txt`, then open the `upstart` database. It's read-only, so to edit data in Compass, connect as `admin` instead.

| Compass tab | Shows |
| --- | --- |
| Documents | The data; edits are checked by the validator |
| Schema | Field types and value spread, analyzed from documents |
| Validation | The `$jsonSchema` generated from your JSON file |
| Indexes | `uniq_*` unique indexes |
| `_schemas` collection | The full source definition, including labels (mirror only; edit the file instead) |

- **Upgrade Compass:** the installed version is **1.36.1 (2023)**. Upgrading to the latest (`brew install --cask mongodb-compass`) gives full MongoDB 8.3 support.

## 8. Implementation steps and verification

0. **Database auth**
   - Add `--auth` and `init-users` to `db.sh`, reset `.data/mongo`, create the users and update the API connection string.
   - Check: mongosh with no credentials can't list or read `upstart`.
   - Check: `upstart_viewer` can read but an insert is rejected.
   - Check: `upstart_api` can read, write, create collections and run `collMod`.
   - Check: a wrong password is rejected.
   - Check: the API health check returns 200 with the new credentials.
1. **Format**
   - Write `schema.schema.json`, convert the Contacts sample to `schemas/contact.json`, and remove the typed `Contact` model and its `[AllowAnonymous]` controller.
   - Check: VS Code flags an unknown field type in a schema file.
2. **Registry + sync**
   - Load, validate, watch, then apply validators, indexes and the mirror.
   - Check: Compass's Validation tab for `contacts` shows the generated validator.
   - Check: inserting `{ email: 5 }` from Compass (as `admin`) is rejected by the validator.
3. **Data API**
   - Check that list, get, create, update and delete return 200/201/204, plus:
     - an unknown field gets 400
     - a missing required field gets 400
     - a bad enum value gets 400
     - a duplicate unique value gets 409
     - data endpoints work without a cookie
     - an unknown schema gets 404
     - a date round-trips as a BSON date (checked in Compass)
4. **Hot reload**
   - With the API running, add `product.json`.
     - Check: `/api/data/product` works within about a second.
     - Check: the new collection, validator and index appear in Compass.
   - Add a field.
     - Check: the validator updates.
   - Introduce a syntax error.
     - Check: the last good version stays live and the error is reported.
   - Delete the file.
     - Check: the endpoint returns 404 and the data is still there.
5. **UI**
   - Check: the Products page appears in the nav after a tab refocus.
   - Check: the enum renders as a select, and invalid input shows field errors.
6. **CLI**
   - Check: `new`, `list`, `delete` and `delete --drop-data` all work.
7. **Docs and commit**
   - Update the README and PLAN.md, then commit.

## 9. Decisions to confirm

| # | Decision | Recommendation |
| --- | --- | --- |
| S1 | Where schemas live | **JSON files in `schemas/`** (confirmed) |
| S2 | Contacts sample | Convert to `schemas/contact.json`; remove the typed `Contact` and its public controller |
| S3 | Typed C# path (`CrudController<T>`) | Keep as an escape hatch for custom logic; retire `new-resource.mjs` |
| S4 | Deleting a schema | Keep data by default; drop only with `--drop-data` + confirmation |
| S5 | Access | **Confirmed:** no access rules in schemas. MongoDB is locked to the API's own DB user (section 4a), and schema data endpoints need no user sign-in, so the UI works without a login page. UI login stays a later follow-up. |
| S10 | DB users | `upstart_api` (readWrite + dbAdmin on `upstart`), `upstart_viewer` (read, for Compass), `admin` (setup only); random passwords in git-ignored files |
| S6 | Hot reload | Development only; production loads at startup |
| S7 | Field types in v1 | The 8 in section 2; arrays, nested objects and references come later |
| S8 | Mongo validation strictness | `moderate` + `error`: new and valid documents are enforced, and old documents that don't match a newer schema can still be read |
| S9 | Compass | Upgrade to the latest version |
