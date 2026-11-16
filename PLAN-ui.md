# UI Redesign: Mantine, Left Navigation, Page Workflow — Plan

_As of 2026-11-15 · Status: implemented. Change after review: UI pages are registered explicitly in `web/src/app/entities.ts` (not discovered from the API), and per-entity options live on that line instead of separate `.ui.ts` files · Follows [PLAN-controllers.md](PLAN-controllers.md)_

## 1. Goal

Rebuild the UI as a clean, product-style app on **Mantine 9** (the component library), replacing the hand-written HTML and CSS. Everything is **generic and driven by the schemas**: the UI knows nothing about any particular entity, so the boilerplate works for any use case. The current schemas are only sample data.

- **Left navigation** listing every entity that has an API.
- **Page workflow** for every entity: List → Detail → Create/Edit (side drawer) → Delete (confirmation), with toasts, loading states and empty states.
- **Simple to change:** a new schema + controller gets its pages automatically, and a custom page is one file plus one line.

## 2. Layout

```
┌──────────────────────┬──────────────────────────────────────────────────────────┐
│  ◆ App name          │  Home / <Entities>                                        │
│                      ├──────────────────────────────────────────────────────────┤
│  ▣ Dashboard         │  <Entities>  24                         [+ New <entity>]│
│                      │  [🔍 Search…        ] [<enum field> ▾] [<bool field> ▾]  │
│  DATA                │  ┌──────────────────────────────────────────────────────┐│
│  ▢ <Entities A>  24  │  │ Name ▲         Field 2      Field 3      Created     ││
│  ▢ <Entities B>   3  │  │ ───────────────────────────────────────────────────  ││
│  ▢ <Entities C>   0  │  │ Record one     value        ● badge      15 Nov 2026 ││
│                      │  │ Record two     value        ● badge      14 Nov 2026 ││
│                      │  │ …                                                    ││
│                      │  └──────────────────────────────────────────────────────┘│
│  ──────────────────  │                                    ‹ 1 2 ›  1–20 of 24   │
│  ● Database OK       │                                                          │
└──────────────────────┴──────────────────────────────────────────────────────────┘
```

- **Sidebar:** Dashboard, then one link per entity (icon, title, live count), then any custom pages; a database status dot at the bottom.
- **Small screens:** the sidebar collapses behind a menu button.
- **Header:** the page title and breadcrumbs.
- **Theme:** one light theme (no dark mode).

## 3. Page workflow (every entity, automatically)

| Route | Page | What's on it |
| --- | --- | --- |
| `/<entity>` | **List** | Title + count and a "New …" button. A search box on the display field, a filter per enum/boolean field, sortable columns and pagination (20 per page). |
| `/<entity>/:id` | **Detail** | The display value as the heading, with a field grid (dates, Yes/No and enum badges formatted). Linked records (`ref` fields) shown as links. Related records (other entities that link here) as small tables. Edit and Delete buttons. |
| `/<entity>/new` | **Create** drawer | Opens on top of the list. A form generated from the schema: required markers, client-side checks, server errors shown on the right field. Save shows a toast and opens the new record. |
| `/<entity>/:id/edit` | **Edit** drawer | The same form, pre-filled; saves with PATCH (changed fields only). |
| Delete | **Confirmation** | A modal names the record. If the API refuses (409, e.g. other records link to it), its message is shown in the modal. |

- **Links:** every page and drawer has its own URL, so links, refresh and the back button work.
- **States:** loading shows skeletons; errors show an alert with Retry; empty lists show a "Create the first …" button.

### Field → component mapping (one file: `entity/fields.tsx`)

| Schema type | Form input | Display |
| --- | --- | --- |
| `string`, `email` | `TextInput` | text; email as a `mailto:` link |
| `text` | `Textarea` (autosize) | paragraph |
| `number` / `integer` | `NumberInput` (min/max; step 1 for integer) | number |
| `boolean` | `Switch` | Yes/No badge |
| `date` | `DateInput` | formatted date |
| `enum` | `Select` | badge |
| `ref` | searchable `Select` loaded from the linked entity's API | link to the linked record |

A new field type is one entry in this file.

## 4. Dashboard (`/`)

- **Stat cards:** one card per entity with its record count; click to open the list.
- **Recently added:** the latest records across all entities.
- **Status:** the database health.

The dashboard is all generic: no reports or entity-specific widgets.

## 5. Making UI changes simple

| To… | Do this |
| --- | --- |
| Add an entity's UI | Add the schema + controller (`node scripts/schema.mjs new …`). The nav link, list, detail and form appear with no UI code. |
| Adjust one entity's UI | Optional `web/src/resources/<entity>.ui.ts`: icon, table columns, filters, default sort. None ship by default. |
| Add a custom page | Create `web/src/pages/<Name>Page.tsx` and add one line to `web/src/app/nav.ts`. |
| Change the look | `web/src/app/theme.ts`: brand colour, font, corner radius. |

The optional per-entity file is typed, so the editor autocompletes it:

```ts
// web/src/resources/<entity>.ui.ts   (only if the defaults aren't enough)
export default defineEntityUi({
  icon: IconBox,                       // any Tabler icon
  columns: ['<field>', '<field>'],     // table columns, in order
  filters: ['<enum field>'],           // filter dropdowns
  defaultSort: '-createdAt',
});
```

**Defaults without that file:**
- **Icon:** a generic icon.
- **Columns:** every field with `showInTable`, up to 6.
- **Filters:** one per enum and boolean field.
- **Sort:** newest first.

Reusable building blocks live in `components/` and work in custom pages too: `PageHeader`, `StatCard`, `EntityTable`, `FilterBar`, `EmptyState`, `ConfirmDelete` and `FieldValue`.

## 6. Small API change this needs

**Total count for pagination:** each controller's `GetAll` sets an `X-Total-Count` header, using `db.Count` with the same filters. This is one line in each controller and in the controller template.

## 7. Code layout

```
web/src/
  main.tsx                 MantineProvider, QueryClient, router
  app/
    theme.ts               brand colour, font, radius
    AppLayout.tsx          AppShell: sidebar, header, breadcrumbs
    nav.ts                 custom pages (entities are added automatically)
    routes.tsx             /, /:entity, /:entity/new, /:entity/:id, /:entity/:id/edit, custom pages
  api/
    client.ts              fetch wrapper, ApiError with per-field errors
    schemas.ts             schema types
    hooks.ts               useSchemas, useList, useRecord, useSave, useDelete
  entity/
    EntityListPage.tsx     list workflow
    EntityDetailPage.tsx   detail + related records
    EntityFormDrawer.tsx   create/edit form
    fields.tsx             field type → input/display components
    entityUi.ts            optional per-entity customisation type + defaults
  components/              PageHeader, StatCard, EntityTable, FilterBar, EmptyState, ConfirmDelete, FieldValue
  resources/               (empty: optional <entity>.ui.ts files go here)
  pages/                   DashboardPage.tsx, NotFoundPage.tsx
```

**Removed:**
- `DynamicForm.tsx`, `DataTable.tsx`, `ResourcePage.tsx`
- the old hooks
- `styles.css`

## 8. Libraries (latest stable, pinned)

| Package | Version | Why |
| --- | --- | --- |
| `@mantine/core`, `hooks`, `form`, `notifications`, `modals`, `dates` | 9.8.1 | Components, forms, toasts, confirmation dialogs, date input (supports React 19.2+) |
| `@tabler/icons-react` | 3.52.0 | Icons |
| `@tanstack/react-query` | latest | Fetching with caching; lists and counts refresh after saves without manual code |
| `dayjs` | 1.11.23 | Required by Mantine dates |
| `postcss-preset-mantine` | 1.18.0 | Mantine's CSS setup |

## 9. Steps and checks

1. **Foundation**
   - Install the packages; add the theme, layout, sidebar (from `/api/schemas`) and routes.
   - Check: type-check and build pass; the sidebar lists every entity with an API, with counts.
2. **List**
   - Check: search, filters, column sort and pagination produce the right API queries and results.
   - Check: the empty and error states show.
3. **Detail**
   - Check: fields are formatted.
   - Check: `ref` fields link to the linked record.
   - Check: related records are listed.
4. **Create/Edit**
   - Check: create works, the toast shows and the new record opens.
   - Check: edit sends only changed fields.
   - Check: server errors (required, unique, invalid) show on the right field.
5. **Delete**
   - Check: the confirmation shows, and a 409 message is shown in the modal.
6. **Dashboard**
   - Check: the counts match the API.
7. **Extensibility**
   - Check: a throwaway schema + controller gets full pages with no UI code.
   - Check: an optional `.ui.ts` file changes its columns.
   - Check: a custom page is one file + one nav line.
   - Remove the throwaway files afterwards.
8. **Visual check**
   - Screenshot each page at desktop and phone widths, then review and fix layout issues (U4).
9. **Docs and commit**

## 10. Decisions to confirm

| # | Decision | Recommendation |
| --- | --- | --- |
| U1 | Library | **Mantine 9** (confirmed) |
| U2 | Style | Polished app with list/detail/drawer workflow; table list view; light theme only (confirmed) |
| U3 | Data fetching | Add **TanStack Query** (less code: caching and refresh after saves are automatic) |
| U4 | Visual check | Add **Playwright** (dev only, headless Chromium ~150 MB) so I can screenshot pages and fix layout issues before handing over |
| U5 | Edit saves | PATCH with changed fields only |
| U6 | Existing sample-specific API code | `ReportsController` (low-stock, supplier summary) is written for the sample data. **Recommendation:** remove it, and keep the "custom endpoint with `Db`" pattern in the README using placeholders. |
