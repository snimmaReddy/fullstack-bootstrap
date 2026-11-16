# How To: Build a Full-Stack Feature From a Use Case

This guide takes you from a problem statement ("we need to track X") to a working feature: MongoDB collection → API → UI pages → a custom screen, all in this boilerplate.

- **Sections 1–9:** the steps, which work for any use case.
- **Section 10:** a complete worked example (a support ticket tracker). Every command and code block in it was run and tested, but it is **not** part of the repo; it's there to copy from.

Before starting, get the app running as described in the [README](README.md): `scripts/db.sh start`, `cd api && dotnet run`, `cd web && npm run dev`.

---

## 1. The flow at a glance

| Step | What you do | Where | Effort |
| --- | --- | --- | --- |
| 1 | Turn the use case into entities, fields, links and rules | on paper | 10–30 min |
| 2 | Define each entity as a schema | `schemas/<entity>.json` (CLI creates it) | 1 command + small edits |
| 3 | Generate a controller per entity (full CRUD API) | `api/Controllers/<Entities>Controller.cs` | created by step 2's command |
| 4 | Add business rules and custom endpoints | the same controller, using `Db` | a few lines each |
| 5 | Test the API | Scalar at `/scalar`, or curl | minutes |
| 6 | Register UI pages (list, detail, create/edit, delete) | `web/src/app/entities.ts` | 1 line per entity |
| 7 | Build custom screens (dashboards, workflows) | `web/src/pages/<Name>Page.tsx` | 1 file + 1 line |
| 8 | Check it end to end | browser | checklist |

What you get for free from steps 2–3 and 6, with no code:
- **Data:** a MongoDB collection with validation and unique indexes.
- **API:** CRUD, filtering, sorting, paging, linked-record includes, delete protection, and 400/404/409 errors.
- **UI:** a sidebar entry, a searchable and filterable table, a detail page, create/edit forms and delete confirmation.

You only write code for what is specific to your use case: business rules (step 4) and custom screens (step 7).

### Which layer handles what

| Need | Where it goes | How |
| --- | --- | --- |
| A field is mandatory, has a max length, a min/max, a fixed list of values, or a format | Schema | `required`, `maxLength`, `min`/`max`, `enum` + `values`, `pattern`, `email` type |
| No two records may share a value | Schema | `"unique": true` |
| A default value | Schema | `"default": …` |
| Record A belongs to record B | Schema | `ref` field on A pointing at B |
| A rule involving state or several fields ("can't resolve twice", "end date after start date") | Controller | a custom action using `Db`, throwing `ValidationError` / `ConflictError` |
| An action that isn't plain CRUD (approve, resolve, assign, recalculate) | Controller | `[HttpPost("{id}/<action>")]` |
| Aggregates, counts, summaries | Controller | `[HttpGet("<name>")]` using `db.Count` / `db.List` |
| Who may call an endpoint | Controller | `[Authorize]` / `[Authorize(Roles = "Admin")]` (auth endpoints already exist) |
| Standard list/detail/edit screens | UI config | one line in `entities.ts` |
| Dashboards, overviews, multi-step flows | UI page | `web/src/pages/`, built from `components/ui` |

---

## 2. Step 1: Analyse the use case

Write these four lists before touching code. They map directly onto the next steps.

1. **Entities:** the nouns that are stored and listed (e.g. *customer*, *ticket*). Each becomes a schema, a collection, an API and a UI page.
2. **Fields per entity**, with a type for each:

   | Type | Use for | UI input |
   | --- | --- | --- |
   | `string` | short text (names, codes) | text box |
   | `text` | long text (descriptions, notes) | multi-line box |
   | `email` | email addresses | email box |
   | `number` / `integer` | amounts / counts | number box |
   | `boolean` | yes/no flags | switch |
   | `date` | dates | date picker |
   | `enum` | one value from a fixed list (status, priority) | dropdown |
   | `ref` | a link to a record of another entity | searchable dropdown |

   Also mark which fields are **required** and **unique**, and which have **defaults**.
3. **Links between entities:** "a ticket belongs to a customer" becomes a `ref` field on *ticket*. The reverse ("a customer's tickets") comes for free.
4. **Rules and actions** that aren't just "fill in a form": state changes, calculations and summaries. These become custom controller actions (step 4).
5. **Screens** beyond the standard list/detail/edit, if any: an overview, a dashboard, a guided flow. These become custom pages (step 7).

---

## 3. Step 2: Define the schemas

Create each entity with the CLI. Create the entities that others link to first.

```bash
node scripts/schema.mjs new <entity> <field>:<type>[!] ...
#   ! = required
#   enum values:  status:enum!=open,closed
#   links:        owner:ref=<other entity>
```

This writes `schemas/<entity>.json` **and** `api/Controllers/<Entities>Controller.cs`. Use `--no-controller` to skip the API for now.

Then open the JSON file and refine it. Your editor autocompletes the options and flags mistakes.

```jsonc
{
  "$schema": "./schema.schema.json",
  "name": "<entity>",                  // lower-case, matches the file name
  "title": "<Entities>",               // sidebar label and page title
  "display": "<field>",                // the field that names a record in dropdowns, links and titles
  "fields": {
    "<field>": { "type": "string", "required": true, "maxLength": 100, "unique": true, "label": "Nice label" },
    "<field>": { "type": "enum", "values": ["a", "b"], "default": "a" },
    "<field>": { "type": "text", "showInTable": false }
  }
}
```

**Good to know:**
- **Saving reloads:** saving a schema file reloads it in the running API within about a second. It also updates MongoDB's validator and indexes; you can see them in Compass → collection → Validation / Indexes.
- **Invalid files:** if you save an invalid file, the last valid version keeps working, and the error shows in a yellow banner in the UI and at `GET /api/schemas`.
- **Automatic fields:** `id`, `createdAt` and `updatedAt` are added for you.

---

## 4. Step 3: The generated controller

`api/Controllers/<Entities>Controller.cs` is a standard ASP.NET Core controller at `api/<collection>`:

| Action | Route | Notes |
| --- | --- | --- |
| `GetAll` | `GET /api/<collection>` | filters, sort, paging, include (see below); total in `X-Total-Count` |
| `GetById` | `GET /api/<collection>/{id}` | `?include=` embeds linked records |
| `Create` | `POST /api/<collection>` | validated against the schema |
| `Update` | `PUT /api/<collection>/{id}` | full replace |
| `Patch` | `PATCH /api/<collection>/{id}` | only the fields you send |
| `Delete` | `DELETE /api/<collection>/{id}` | 409 while other records link to it |

It's regular code: remove actions you don't want (e.g. `Delete`) and add your own (step 4).

**Restart the API after adding or changing a controller.** Use `dotnet watch` in `api/` to restart automatically.

**List query string,** which works on every `GetAll`:

| Example | Meaning |
| --- | --- |
| `?status=open` | equals |
| `?amount.gte=10&amount.lt=100` | `lt`, `lte`, `gt`, `gte`, `ne` |
| `?status.in=open,pending` | one of |
| `?name.contains=abc` | case-insensitive text search |
| `?owner=<id>` | records linked to a given record |
| `?sort=-dueDate,name&limit=20&skip=40` | sort (`-` = descending) and paging |
| `?include=owner` | embed the linked record in place of its id |
| `?include=<collection>` | (on the linked-to entity) embed every record that links here |

---

## 5. Step 4: Business rules and custom endpoints

Add actions to the entity's controller. The `Db` helper (already injected as `db`) does all data access. It validates writes against the schema and throws errors that become proper HTTP responses, so you never write try/catch or MongoDB code.

```csharp
// A state change with a rule
[HttpPost("{id}/<action>")]
public async Task<ActionResult<Record>> DoAction(string id)
{
    var item = await db.Get(Schema, id);
    if (item is null) return NotFound();
    if ((string?)item["status"] == "done") throw new ConflictError("Already done.");      // → 409
    return await db.Patch(Schema, id, new { status = "done" });                           // validated update
}

// A summary
[HttpGet("summary")]
public async Task<ActionResult<object>> Summary() =>
    new { total = await db.Count(Schema), open = await db.Count(Schema, Query.Where("status", "open")) };
```

**`Db` reference:**

| Method | Does |
| --- | --- |
| `db.List(schema, query?)` | filtered, sorted, paged list → `List<Record>` |
| `db.Get(schema, id, includes...)` | one record or `null` |
| `db.FindOne(schema, query)` / `db.Count(schema, query?)` / `db.Exists(schema, id)` | lookups |
| `db.Create(schema, data)` | insert; `data` = anonymous object, dictionary or JSON |
| `db.Update(schema, id, data)` / `db.Patch(schema, id, data)` | full / partial update |
| `db.Delete(schema, id)` | refuses (409) while records link to it |
| `db.SchemaOf(schema)` | the loaded schema, e.g. to read an enum's `Values` |

**`Query`:** `Query.Where("field", value).And("field", Op.Lt, 10).Sort("-createdAt").Take(20).Skip(0).Include("owner")`
(`Op`: `Eq`, `Ne`, `Lt`, `Lte`, `Gt`, `Gte`, `In`, `Contains`)

**Errors:**

| Throw | Response |
| --- | --- |
| `new ValidationError("field", "message")` | 400, shown on that field in UI forms |
| `NotFoundError.Record(schema, id)` | 404 |
| `new ConflictError("message")` | 409 |

**Records:**
- **Shape:** a `Record` is a dictionary: `id`, the schema fields, `createdAt` and `updatedAt`.
- **Reading values:** cast them to their stored types: `(string?)r["status"]`, `r["quantity"] as long?`, `r["price"] as double?`.

Need data that spans entities in one place (e.g. a report)? Add a new controller with `[Route("api/<name>")]` and inject `Db` the same way.

---

## 6. Step 5: Test the API

- **Scalar:** open http://localhost:5080/scalar. Every controller is a group; pick an endpoint and send a request.
- **curl:**
  ```bash
  curl -s -H 'Content-Type: application/json' -d '{"<field>":"value"}' localhost:5080/api/<collection>
  curl -s "localhost:5080/api/<collection>?<field>=value&include=<ref field>"
  ```
- **MongoDB Compass:** connect with the `upstart_viewer` string from `.data/credentials.txt` to see the stored documents, the generated validator and the indexes.

Check the error paths too: missing required fields (400), duplicates (409), and your custom rules.

---

## 7. Step 6: Register the UI pages

Add one line per entity to `web/src/app/entities.ts`:

```ts
export const entities: EntityConfig[] = [
  // …
  { schema: '<entity>', icon: IconSomething },                       // all defaults
  { schema: '<entity>', icon: IconSomething,                         // with options
    columns: ['<field>', '<field>'], filters: ['<enum field>', '<ref field>'], defaultSort: '-createdAt' },
];
```

- **Options** (all optional): `title`, `path` (UI URL), `endpoint` (API route; default `/api/<collection>`), `icon`, `columns`, `filters`, `defaultSort`, `pageSize`.
- **Icons:** any [Tabler icon](https://tabler.io/icons), e.g. `import { IconTicket } from '@tabler/icons-react'`.
- **No restart needed:** the browser updates as soon as you save.

The entity now has a sidebar link with a count, plus:
- **List:** search, filters, sortable columns and paging.
- **Detail:** linked records as links, and related records as tables.
- **Create/edit drawer:** forms from the schema, with server errors shown on the right field.
- **Delete:** a confirmation dialog.

---

## 8. Step 7: Custom screens

For anything beyond list/detail/edit, create a page from the UI kit and the data hooks, then register it.

```tsx
// web/src/pages/<Name>Page.tsx
import { PageHeader, Section, StatGroup } from '../components/ui';
export function <Name>Page() { … }
```

```ts
// web/src/app/entities.ts
export const customPages: CustomPage[] = [
  { path: '<url-path>', label: '<Sidebar label>', icon: IconSomething, component: <Name>Page },
];
```

**Building blocks** (browse them live at http://localhost:5173/ui-gallery in development):
- **Layout:** `PageHeader`, `Section`, `SplitLayout`, `TabsPanel`, `Toolbar`
- **Display:** `StatGroup`, `StatCard`, `KeyValueList`, `CardGrid`, `EntityTable`, `StatusBadge`, `Timeline`, `ProgressStat`, `AvatarText`
- **Charts:** `ChartCard`, `BarChart`, `LineChart`, `DonutChart`
- **Forms:** `SearchInput`, `FormSection`, `DateRangeInput`, `FileDrop`, `Wizard`, `FieldInput`, `RefSelect`
- **Feedback:** `useConfirm()`, `notify.success/error`, `InlineAlert`

**Data** (from `web/src/api/`):

| Need | Use |
| --- | --- |
| A list with filters | `useList(targetFor('<entity>', useEntities()), { filters, sort, pageSize, include })` |
| One record | `useRecord(entity, id)` |
| A count | `useCount('/api/<collection>')` |
| Create / update / delete | `useSaveRecord(entity)`, `useDeleteRecord(entity)` |
| A custom endpoint | `useQuery({ queryKey: [...], queryFn: () => request<T>('/api/…') })` for reads; `await request('/api/…', { method: 'POST' })` for actions |
| Refresh after an action | `useQueryClient().invalidateQueries()` |

---

## 9. Step 8: End-to-end checklist

- [ ] Each schema loads with no errors (no yellow banner; `GET /api/schemas` has empty `errors`)
- [ ] Each entity's API works in Scalar: create, list, get, patch, delete
- [ ] Error paths return 400/409 with clear messages, including your custom rules
- [ ] Each entity appears in the sidebar with a count; list, filters and search work
- [ ] Create/edit forms save; server errors appear on the right field
- [ ] Links between entities show as links; related records show on the detail page
- [ ] Custom pages show correct numbers and refresh after actions
- [ ] Compass shows the documents, the validator and the indexes as expected
- [ ] Checked on a phone-width window

---

## 10. Worked example: a support ticket tracker

> Illustration only: these files are not in the repo. Everything below was run and tested against this boilerplate.

### The use case

> "Customers report problems. We need to log each problem as a ticket against the customer, with a priority and a due date, move it through *open → in progress → resolved*, record when it was resolved, and see at a glance what's urgent and how many tickets are in each state."

### Step 1: Analysis

| Entity | Fields | Rules |
| --- | --- | --- |
| **customer** | name (string, required), email (email, required, **unique**), company (string) | can't be deleted while it has tickets (built in) |
| **ticket** | title (string, required), description (text), status (enum: open / in_progress / resolved, **default open**), priority (enum: low / medium / high, **default medium**), customer (**ref** → customer), dueDate (date), resolvedOn (date) | "resolve" sets status + resolvedOn; can't resolve twice |

**Screens:**
- Standard pages for both entities.
- A "Ticket overview" page: counts per status, a chart, and urgent tickets with a Resolve button.

### Step 2: Schemas

```bash
node scripts/schema.mjs new customer name:string! email:email! company:string
node scripts/schema.mjs new ticket title:string! description:text status:enum!=open,in_progress,resolved \
  priority:enum!=low,medium,high customer:ref=customer dueDate:date resolvedOn:date
```

Then refine the generated files:

```json
// schemas/customer.json: add "display", make email unique
{
  "$schema": "./schema.schema.json",
  "name": "customer",
  "title": "Customers",
  "display": "name",
  "fields": {
    "name": { "type": "string", "required": true, "maxLength": 100 },
    "email": { "type": "email", "required": true, "unique": true },
    "company": { "type": "string" }
  }
}
```

```json
// schemas/ticket.json: add "display", defaults, a label; hide description in tables
{
  "$schema": "./schema.schema.json",
  "name": "ticket",
  "title": "Tickets",
  "display": "title",
  "fields": {
    "title": { "type": "string", "required": true, "maxLength": 200 },
    "description": { "type": "text", "showInTable": false },
    "status": { "type": "enum", "required": true, "values": ["open", "in_progress", "resolved"], "default": "open" },
    "priority": { "type": "enum", "required": true, "values": ["low", "medium", "high"], "default": "medium" },
    "customer": { "type": "ref", "ref": "customer" },
    "dueDate": { "type": "date" },
    "resolvedOn": { "type": "date", "label": "Resolved on" }
  }
}
```

### Step 3: Controllers

The commands above already created `CustomersController.cs` (`/api/customers`) and `TicketsController.cs` (`/api/tickets`) with full CRUD.

### Step 4: Business rules

Added to `api/Controllers/TicketsController.cs`, replacing the commented example at the bottom:

```csharp
/// <summary>Mark a ticket resolved (409 if it already is).</summary>
[HttpPost("{id}/resolve")]
[ProducesResponseType<Record>(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
[ProducesResponseType(StatusCodes.Status409Conflict)]
public async Task<ActionResult<Record>> Resolve(string id)
{
    var ticket = await db.Get(Schema, id);
    if (ticket is null) return NotFound();
    if ((string?)ticket["status"] == "resolved") throw new ConflictError("This ticket is already resolved.");

    return await db.Patch(Schema, id, new { status = "resolved", resolvedOn = DateTime.UtcNow.ToString("yyyy-MM-dd") });
}

/// <summary>Number of tickets per status.</summary>
[HttpGet("summary")]
public async Task<ActionResult<Dictionary<string, long>>> Summary()
{
    var counts = new Dictionary<string, long>();
    foreach (var status in db.SchemaOf(Schema).Find("status")!.Values!)
        counts[status] = await db.Count(Schema, Query.Where("status", status));
    return counts;
}
```

Restart the API (`dotnet run`, or let `dotnet watch` restart it).

### Step 5: Test the API

```bash
H='Content-Type: application/json'
curl -s -H "$H" -d '{"name":"Jordan Lee","email":"jordan@example.com","company":"Example Ltd"}' localhost:5080/api/customers
# → 201 { "id": "<customerId>", ... }

curl -s -H "$H" -d '{"title":"Cannot log in","priority":"high","customer":"<customerId>","dueDate":"2026-11-20"}' localhost:5080/api/tickets
# → 201 { ..., "status": "open" }           (default applied)

curl -s "localhost:5080/api/tickets?status=open&priority=high&include=customer"
# → [ { ..., "customer": { "id": ..., "name": "Jordan Lee", ... } } ]

curl -s localhost:5080/api/tickets/summary
# → { "open": 1, "in_progress": 0, "resolved": 0 }

curl -s -X POST localhost:5080/api/tickets/<ticketId>/resolve
# → 200 { ..., "status": "resolved", "resolvedOn": "..." }   again → 409 "This ticket is already resolved."
```

Error paths that came back as expected when this was tested:

| Request | Response |
| --- | --- |
| Duplicate customer email | 409, error on the `email` field |
| `"status": "done"` | 400 "Status must be one of: open, in_progress, resolved." |
| Deleting a customer with tickets | 409 "2 tickets reference this customer." |

### Step 6: UI pages

In `web/src/app/entities.ts`:

```ts
import { IconChartPie, IconTicket, IconUsers } from '@tabler/icons-react';
import { TicketOverviewPage } from '../pages/TicketOverviewPage';

export const entities: EntityConfig[] = [
  // …
  { schema: 'customer', icon: IconUsers },
  { schema: 'ticket', icon: IconTicket, columns: ['title', 'status', 'priority', 'customer', 'dueDate'],
    filters: ['status', 'priority', 'customer'], defaultSort: 'dueDate' },
];
```

Result:
- **Sidebar:** Customers and Tickets appear.
- **Tickets list:** status, priority and customer filters.
- **Ticket form:** a customer dropdown, and status/priority dropdowns pre-set to their defaults.
- **Customer page:** lists that customer's tickets.

### Step 7: The overview page

`web/src/pages/TicketOverviewPage.tsx`:

```tsx
import { Button, Stack } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { request } from '../api/client';
import { targetFor, useEntities, useList } from '../api/hooks';
import { ChartCard, DonutChart, EntityTable, PageHeader, Section, SplitLayout, StatGroup, notify } from '../components/ui';

export function TicketOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ctx = useEntities();
  const tickets = targetFor('ticket', ctx);

  // Custom endpoint: GET /api/tickets/summary → { open: 2, in_progress: 0, resolved: 1 }
  const summary = useQuery({
    queryKey: ['ticket-summary'],
    queryFn: () => request<Record<string, number>>('/api/tickets/summary'),
  });

  // Generic list endpoint with filters, sort and include.
  const urgent = useList(tickets, {
    filters: { status: 'open', priority: 'high' },
    sort: 'dueDate',
    pageSize: 10,
    include: ['customer'],
  });

  // Custom endpoint: POST /api/tickets/{id}/resolve
  const resolve = async (id: string) => {
    try {
      await request(`/api/tickets/${id}/resolve`, { method: 'POST' });
      notify.success('Ticket resolved');
      queryClient.invalidateQueries(); // refresh lists, counts and the summary
    } catch (e) {
      notify.error(e);
    }
  };

  const counts = summary.data ?? {};
  const columns = (tickets?.schema.fields ?? []).filter((f) => ['title', 'customer', 'dueDate'].includes(f.name));

  return (
    <>
      <PageHeader title="Ticket overview" crumbs={[{ label: 'Home', to: '/' }, { label: 'Ticket overview' }]} />

      <Stack gap="lg">
        <StatGroup items={Object.entries(counts).map(([status, n]) => ({ label: status.replace('_', ' '), value: n }))} />

        <SplitLayout
          main={
            <Section title="Urgent: open, high priority" flush>
              <EntityTable
                columns={columns}
                rows={urgent.data?.items ?? []}
                loading={urgent.isLoading}
                showCreated={false}
                onRowClick={(r) => navigate(`/tickets/${r.id}`)}
              />
              {(urgent.data?.items ?? []).map((t) => (
                <Button key={t.id} size="xs" variant="light" m="xs" onClick={() => resolve(t.id)}>
                  Resolve “{String(t.title)}”
                </Button>
              ))}
            </Section>
          }
          side={
            <ChartCard title="By status" loading={summary.isLoading} empty={!Object.values(counts).some(Boolean)} height={220}>
              <DonutChart data={Object.entries(counts).map(([name, value]) => ({ name, value }))} />
            </ChartCard>
          }
        />
      </Stack>
    </>
  );
}
```

Register it in `web/src/app/entities.ts`:

```ts
export const customPages: CustomPage[] = [
  { path: 'ticket-overview', label: 'Ticket overview', icon: IconChartPie, component: TicketOverviewPage },
];
```

### Step 8: What was verified in the browser

- The sidebar shows Customers, Tickets and Ticket overview with counts.
- A ticket created through the form, with the customer picked from the dropdown, opens a detail page that links to the customer.
- The overview lists the new high-priority ticket. Clicking **Resolve** calls the custom endpoint, shows a toast, and refreshes the list, counts and chart.
- The customer's page lists all their tickets.

---

## 11. Changing things later

| Change | How | Notes |
| --- | --- | --- |
| Add an optional field | Edit the schema JSON | Live; existing records simply don't have it yet |
| Add a required field | Edit the schema JSON | Old records still load; editing one asks for the field |
| Rename a field | Edit the schema, then move old values in mongosh (as admin): `db.getSiblingDB("upstart").<collection>.updateMany({}, { $rename: { old: "new" } })` | No automatic migrations |
| Add a value to an enum | Edit `values` | Live |
| Make a field unique | `"unique": true` | Fails (reported in `/api/schemas` errors) if duplicates already exist; fix the data first |
| Add an endpoint | Add an action to the controller | Restart the API |
| Change columns/filters | Edit the entity's line in `entities.ts` | Live |
| Remove an entity | `node scripts/schema.mjs delete <entity>` (+ `--drop-data` to delete its data, `--delete-controller`), then remove its `entities.ts` line | Restart the API if the controller was removed |

## 12. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Yellow banner "app/entities.ts lists X, but schemas/X.json isn't loaded" | The schema file is missing or invalid; check `GET /api/schemas` → `errors` |
| A page shows 404 / "Unknown schema" from the API | The controller is missing or the API wasn't restarted after adding it |
| New endpoint returns 404 | API not restarted, or the route doesn't match (`[Route("api/<collection>")]`) |
| "No X with id …" when saving a `ref` | The linked record doesn't exist (or the id is wrong) |
| 409 when deleting | Other records still link to this one; re-point or delete them first |
| Unique index not created | Existing duplicate values; see `GET /api/schemas` → `errors` |
| UI doesn't show a schema change | Switch away from the browser tab and back (the UI re-reads schemas on focus) |
| "MongoDB rejected the API's credentials" | Run `scripts/db.sh init-users` on a fresh database, or check `Mongo:ConnectionString` |

## 13. Where things live

```
schemas/<entity>.json                 data definition (fields, types, rules)       ← step 2
api/Controllers/<Entities>Controller.cs   API + business rules                     ← steps 3–4
api/Data/Db.cs, Query.cs, DataErrors.cs   reusable data helpers (don't need editing)
web/src/app/entities.ts               UI pages + custom pages registry             ← steps 6–7
web/src/pages/<Name>Page.tsx          custom screens                               ← step 7
web/src/components/ui/                UI component kit (browse at /ui-gallery)
web/src/api/hooks.ts, client.ts       data hooks and request helper for custom pages
scripts/schema.mjs                    new / controller / list / delete
```
