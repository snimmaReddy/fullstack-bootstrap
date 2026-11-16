# Reusable UI Component Kit — Plan

_As of 2026-11-15 · Status: implemented · Follows [PLAN-ui.md](PLAN-ui.md)_

## 1. Goal

Add a library of ready-made, **generic** UI components in one place, so a new use case (a dashboard, a report, a wizard, a settings page) is assembled from existing pieces instead of written from scratch.

- **Generic:** no knowledge of any schema or sample data. Data goes in through props.
- **Consistent:** built on Mantine with the app theme, so everything looks the same.
- **Easy to find:** one import path, plus a **component gallery page** that shows every component live with example usage.

## 2. Where they live

```
web/src/components/
  ui/                      ← the kit (new)
    index.ts               one import: import { Section, StatGroup, ChartCard, … } from '../components/ui'
    layout/                Section, SplitLayout, TabsPanel, Toolbar
    display/               StatGroup, KeyValueList, CardGrid, StatusBadge, Timeline, ProgressStat, AvatarText
    charts/                ChartCard, LineChart, BarChart, DonutChart
    forms/                 SearchInput, FormSection, DateRangeInput, FileDrop, Wizard
    feedback/              ConfirmDialog + useConfirm, notify helpers, InlineAlert
  PageHeader.tsx, EntityTable.tsx, StatCard.tsx, StateViews.tsx, ConfirmDelete.tsx   (existing; re-exported from ui/)
web/src/pages/
  UiGalleryPage.tsx        live catalogue of every component (development only, at /ui-gallery)
```

The existing shared components stay where they are and are also exported from `components/ui`, so there's a single import path for everything.

## 3. Components

| Group | Component | Use it for |
| --- | --- | --- |
| **Layout** | `Section` | A titled card with optional description, actions and footer: the basic building block of a page |
| | `SplitLayout` | Main content with a side column (e.g. details + activity); stacks on phones |
| | `TabsPanel` | Tabs whose active tab is kept in the URL (`?tab=`) |
| | `Toolbar` | A row of search, filters and buttons that wraps cleanly on small screens |
| **Data display** | `StatGroup` | A row of metrics with optional change indicator (▲ 12% / ▼ 3%) |
| | `KeyValueList` | Label/value pairs (horizontal on desktop, stacked on phones) |
| | `CardGrid` | Responsive grid of cards from a list of items, with a render function per item |
| | `StatusBadge` | A badge whose colour comes from a value → colour map (e.g. active → green) |
| | `Timeline` | Dated activity/event list |
| | `ProgressStat` | Progress ring or bar with label and value (e.g. 72% complete) |
| | `AvatarText` | Avatar (initials or image) with a name and secondary line |
| **Charts** | `ChartCard` | Titled card wrapping a chart, with loading and empty states |
| | `LineChart`, `BarChart`, `DonutChart` | Thin presets over Mantine Charts with theme colours; data in as an array of rows |
| **Forms** | `SearchInput` | Debounced search box with clear button |
| | `FormSection` | Groups related fields under a heading inside a form |
| | `DateRangeInput` | From/to date picker |
| | `FileDrop` | Drag-and-drop file picker with type and size limits (selection only; uploading is up to the page) |
| | `Wizard` | Multi-step flow (Stepper + Back/Next/Finish with per-step validation) |
| **Feedback** | `ConfirmDialog` + `useConfirm()` | Generic "Are you sure?" dialog: `await confirm({ title, message })`. `ConfirmDelete` becomes a preset of it |
| | `notify.success / error / info` | One-line toast helpers |
| | `InlineAlert` | Info/success/warning/error message box |

Already available and kept as they are: `PageHeader`, `EntityTable`, `StatCard`, `EmptyState`, `ErrorState`, `FieldInput`/`FieldValue`/`RefSelect`, and the data hooks.

## 4. Component gallery (`/ui-gallery`)

- **What it shows:** every component in the kit with neutral placeholder data ("Item A", "Metric 1"), grouped like the table above. Each one has a short code snippet showing how to use it.
- **When it's available:** only in development (`npm run dev`). It doesn't appear in production builds or the sidebar of a built app.
- **Purpose:** you see what exists and how it looks before choosing pieces for a new page.

## 5. Using the kit for a new use case

```tsx
// web/src/pages/OverviewPage.tsx: register it with one line in app/entities.ts (customPages)
import { ChartCard, Section, SplitLayout, StatGroup, Timeline } from '../components/ui';

export function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" />
      <StatGroup items={[{ label: 'Open', value: 42, change: 12 }, { label: 'Closed', value: 17, change: -3 }]} />
      <SplitLayout
        main={<ChartCard title="Per month"><BarChart data={rows} dataKey="month" series={['count']} /></ChartCard>}
        side={<Section title="Recent activity"><Timeline items={events} /></Section>}
      />
    </>
  );
}
```

Data comes from the existing hooks (`useList`, `useCount`, …) or any `request(...)` call.

## 6. New libraries

| Package | Version | Why |
| --- | --- | --- |
| `@mantine/charts` + `recharts` | 9.8.1 / its supported version | Charts that match the Mantine theme |
| `@mantine/dropzone` | 9.8.1 | Drag-and-drop file picker |

Both are optional. If you'd rather not add charts or file upload yet, those components can be left out (decisions K2, K3).

## 7. Steps and checks

1. **Add the kit** (folders, components and the `index.ts` barrel); re-export the existing shared components.
   - Check: type-check and build pass.
2. **Refactor where it simplifies:** `ConfirmDelete` becomes a preset of `ConfirmDialog`; the list page's search box becomes `SearchInput`.
   - Check: the 10 UI workflow checks from the last phase still pass.
3. **Add the gallery page** (development only).
   - Check: it renders every component with no browser errors.
   - Check: screenshots at desktop and phone widths are reviewed and any layout issues fixed.
   - Check: `npm run build` doesn't include the gallery.
4. **Docs and commit:** update the README UI section (component list + the recipe in section 5), then commit.

## 8. Decisions to confirm

| # | Decision | Recommendation |
| --- | --- | --- |
| K1 | Location | `web/src/components/ui/`, one barrel import |
| K2 | Charts | Include (`@mantine/charts`): most new use cases need a chart sooner or later |
| K3 | File drop | Include the picker only (no upload API yet) |
| K4 | Gallery page | Include, development only |
| K5 | Scope | The ~25 components above; more can be added to the same folders later |
