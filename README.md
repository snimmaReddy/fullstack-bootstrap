# Upstart

This boilerplate has a C# .NET 11 API, MongoDB and a React 19 + TypeScript UI. Adding a new entity (schema, API and UI page) takes one command.

See [PLAN.md](PLAN.md) for the full design.

## Prerequisites

- .NET 11 SDK
- Node.js 22+
- MongoDB 8 (MongoDB 5.0+ also works)

## Run it

```bash
# 1. Database (project-local data in .data/mongo)
scripts/db.sh start

# 2. API → http://localhost:5080  (API docs at /scalar)
cd api && dotnet run

# 3. UI → http://localhost:5173
cd web && npm install && npm run dev
```

`api/appsettings.Development.json` holds the local JWT signing key and is git-ignored. On a new machine, copy `appsettings.Development.example.json` to that file and set a key, for example with `openssl rand -base64 48`. In production, set the `Jwt__Key` and `Mongo__ConnectionString` environment variables instead.

## Add a resource

```bash
node scripts/new-resource.mjs Product name:string! price:number inStock:bool description:text
node scripts/new-resource.mjs Faq question:string! answer:text! --public
```

- **Field types:** `string`, `text`, `email`, `number`, `bool`, `date`. Append `!` to make a field required.
- **Access:** resources require sign-in by default. `--public` makes the endpoints anonymous.
- **Generated files:** `api/Models/X.cs`, `api/Controllers/XsController.cs` and `web/src/resources/xs.ts`, plus a registry entry in `web/src/resources/index.ts`.

After generating, restart the API. To customise, add actions to the controller, override the virtual CRUD actions, or register your own page in `App.tsx`.

## Authentication (API)

| Endpoint | Access |
| --- | --- |
| `POST /api/auth/register` `{email, password}` | public |
| `POST /api/auth/login` `{email, password}` | public |
| `POST /api/auth/logout` | public |
| `GET /api/auth/me` | signed in |

Logging in sets an HttpOnly `auth` cookie containing a JWT. API clients can send the JWT as `Authorization: Bearer <token>` instead.

To try it with curl:

```bash
curl -c jar -H 'Content-Type: application/json' -d '{"email":"a@b.com","password":"secret123"}' localhost:5080/api/auth/register
curl -b jar localhost:5080/api/auth/me
```

To make a user an admin, run `db.users.updateOne({email:"a@b.com"},{$set:{roles:["User","Admin"]}})` in mongosh. Admin-only endpoints use `[Authorize(Roles = "Admin")]`.

UI login and register pages are a planned follow-up (PLAN.md section 11).
