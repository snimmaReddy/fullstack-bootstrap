/**
 * Development-only catalogue of the UI kit (components/ui), with placeholder data and usage snippets.
 * Not included in production builds (see app/App.tsx).
 */
import { Button, Code, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconChartBar, IconClock, IconForms, IconLayout, IconListDetails, IconMessage, IconStar, IconUsers } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import {
  AvatarText, BarChart, CardGrid, ChartCard, DateRangeInput, DonutChart, FileDrop, FormSection, InlineAlert,
  KeyValueList, LineChart, notify, PageHeader, ProgressStat, SearchInput, Section, SplitLayout, StatGroup,
  StatusBadge, TabsPanel, Timeline, Toolbar, useConfirm, Wizard, type DateRange,
} from '../components/ui';

function Demo({ name, description, code, children }: { name: string; description: string; code: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <div>
        <Title order={5}>{name}</Title>
        <Text size="sm" c="dimmed">{description}</Text>
      </div>
      <div>{children}</div>
      <Code block style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{code}</Code>
    </Stack>
  );
}

const months = [
  { month: 'Jan', seriesA: 12, seriesB: 8 }, { month: 'Feb', seriesA: 18, seriesB: 11 },
  { month: 'Mar', seriesA: 15, seriesB: 14 }, { month: 'Apr', seriesA: 24, seriesB: 13 },
  { month: 'May', seriesA: 21, seriesB: 19 }, { month: 'Jun', seriesA: 29, seriesB: 22 },
];

function LayoutDemos() {
  return (
    <Stack gap="xl">
      <Demo name="Section" description="Titled card with actions and footer — the basic page building block."
        code={`<Section title="Title" description="Description" actions={<Button>Action</Button>} footer="Footer">…</Section>`}>
        <Section title="Section title" description="Optional description" actions={<Button size="xs" variant="light">Action</Button>}
          footer={<Text size="sm" c="dimmed">Optional footer</Text>}>
          <Text size="sm">Any content goes here.</Text>
        </Section>
      </Demo>
      <Demo name="SplitLayout" description="Main content plus a side column; stacks on phones."
        code={`<SplitLayout main={<Main />} side={<Side />} sideWidth={4} />`}>
        <SplitLayout main={<Section title="Main"><Text size="sm">8 of 12 columns</Text></Section>}
          side={<Section title="Side"><Text size="sm">4 of 12 columns</Text></Section>} />
      </Demo>
      <Demo name="Toolbar" description="Controls on the left, actions on the right; wraps on small screens."
        code={`<Toolbar left={<SearchInput … />} right={<Button>Export</Button>} />`}>
        <Toolbar left={<TextInput placeholder="Filter…" w={220} />} right={<Button variant="default">Export</Button>} />
      </Demo>
      <Demo name="PageHeader" description="Page title with breadcrumbs and actions (already used on every page)."
        code={`<PageHeader title="Title" crumbs={[{ label: 'Home', to: '/' }, { label: 'Title' }]} actions={<Button>New</Button>} />`}>
        <PageHeader title="Page title" description="Optional description" crumbs={[{ label: 'Home', to: '/' }, { label: 'Page title' }]}
          actions={<Button size="xs">New</Button>} />
      </Demo>
    </Stack>
  );
}

function DisplayDemos() {
  return (
    <Stack gap="xl">
      <Demo name="StatGroup" description="A row of metrics with optional change indicator."
        code={`<StatGroup items={[{ label: 'Metric A', value: 1284, change: 12, hint: 'vs last month' }]} />`}>
        <StatGroup items={[
          { label: 'Metric A', value: '1,284', change: 12, hint: 'vs last month', icon: IconUsers },
          { label: 'Metric B', value: 342, change: -4, hint: 'vs last month', icon: IconStar },
          { label: 'Metric C', value: '98%', change: 1.5, icon: IconClock },
          { label: 'Errors', value: 7, change: -30, higherIsBetter: false, icon: IconMessage },
        ]} />
      </Demo>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="KeyValueList" description="Label/value pairs; stacked on phones."
          code={`<KeyValueList items={[{ label: 'Status', value: <StatusBadge value="active" /> }]} />`}>
          <Section>
            <KeyValueList items={[
              { label: 'Name', value: 'Item A' },
              { label: 'Status', value: <StatusBadge value="active" colors={{ active: 'teal' }} /> },
              { label: 'Owner', value: <AvatarText name="Sam Taylor" size="sm" /> },
            ]} />
          </Section>
        </Demo>
        <Demo name="Timeline" description="Dated activity or event list."
          code={`<Timeline items={[{ title: 'Created', description: '…', time: date }]} />`}>
          <Section>
            <Timeline items={[
              { title: 'Item created', description: 'By Sam Taylor', time: '2026-11-10T09:30:00Z' },
              { title: 'Status changed', description: 'draft → active', time: '2026-11-12T14:05:00Z', color: 'teal' },
              { title: 'Comment added', time: '2026-11-14T16:45:00Z' },
            ]} />
          </Section>
        </Demo>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="StatusBadge" description="Badge coloured by value."
          code={`<StatusBadge value={status} colors={{ active: 'teal', paused: 'yellow', closed: 'gray' }} />`}>
          <Group>
            {['active', 'paused', 'closed', 'unknown'].map((v) => (
              <StatusBadge key={v} value={v} colors={{ active: 'teal', paused: 'yellow', closed: 'gray' }} fallback="red" />
            ))}
          </Group>
        </Demo>
        <Demo name="AvatarText" description="Avatar (initials or image) with name and a secondary line."
          code={`<AvatarText name="Sam Taylor" description="sam@example.com" />`}>
          <Group gap="xl">
            <AvatarText name="Sam Taylor" description="sam@example.com" />
            <AvatarText name="Alex Kim" description="Owner" />
          </Group>
        </Demo>
      </SimpleGrid>
      <Demo name="ProgressStat" description="Progress towards a target, as a bar or ring."
        code={`<ProgressStat label="Completed" value={18} max={25} variant="ring" />`}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          <ProgressStat label="Completed" value={18} max={25} />
          <ProgressStat label="Completed" value={18} max={25} variant="ring" color="teal" description="7 remaining" />
        </SimpleGrid>
      </Demo>
      <Demo name="CardGrid" description="Responsive grid of cards from a list."
        code={`<CardGrid items={rows} render={(r) => <Text>{r.name}</Text>} onClick={(r) => navigate(r.id)} />`}>
        <CardGrid items={['Item A', 'Item B', 'Item C']} render={(t) => (
          <>
            <Text fw={600}>{t}</Text>
            <Text size="sm" c="dimmed">Secondary text</Text>
            <StatusBadge value="active" colors={{ active: 'teal' }} />
          </>
        )} onClick={(t) => notify.info(`Clicked ${t}`)} />
      </Demo>
    </Stack>
  );
}

function ChartDemos() {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="BarChart" description="Compare values across categories."
          code={`<BarChart data={rows} dataKey="month" series={['seriesA', 'seriesB']} />`}>
          <ChartCard title="Per month"><BarChart data={months} dataKey="month" series={['seriesA', 'seriesB']} /></ChartCard>
        </Demo>
        <Demo name="LineChart" description="A value over time."
          code={`<LineChart data={rows} dataKey="month" series={['seriesA']} />`}>
          <ChartCard title="Trend"><LineChart data={months} dataKey="month" series={['seriesA', 'seriesB']} /></ChartCard>
        </Demo>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="DonutChart" description="Parts of a whole."
          code={`<DonutChart data={[{ name: 'A', value: 40 }, …]} label="100" />`}>
          <ChartCard title="Share">
            <DonutChart data={[{ name: 'Group A', value: 40 }, { name: 'Group B', value: 35 }, { name: 'Group C', value: 25 }]} label="100" />
          </ChartCard>
        </Demo>
        <Demo name="ChartCard (states)" description="Built-in loading and empty states."
          code={`<ChartCard title="…" loading={q.isLoading} empty={!rows.length}>…</ChartCard>`}>
          <ChartCard title="No data yet" empty height={180}>{null}</ChartCard>
        </Demo>
      </SimpleGrid>
    </Stack>
  );
}

function FormDemos() {
  const [q, setQ] = useState('');
  const [range, setRange] = useState<DateRange>([null, null]);
  const [files, setFiles] = useState<File[]>([]);
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="SearchInput" description="Debounced search with a clear button."
          code={`<SearchInput value={q} onChange={setQ} />`}>
          <Stack gap={4}>
            <SearchInput value={q} onChange={setQ} />
            <Text size="xs" c="dimmed">Debounced value: “{q}”</Text>
          </Stack>
        </Demo>
        <Demo name="DateRangeInput" description="From/to dates as YYYY-MM-DD strings."
          code={`<DateRangeInput label="Period" value={range} onChange={setRange} />`}>
          <DateRangeInput label="Period" value={range} onChange={setRange} />
        </Demo>
      </SimpleGrid>
      <Demo name="FileDrop" description="Drag-and-drop file picker (selection only)."
        code={`<FileDrop value={files} onChange={setFiles} accept={['image/*', 'application/pdf']} maxSizeMb={5} />`}>
        <FileDrop value={files} onChange={setFiles} accept={['image/*', 'application/pdf']} maxSizeMb={5} />
      </Demo>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Demo name="FormSection" description="Group related fields under a heading."
          code={`<FormSection title="Details" description="…">…inputs…</FormSection>`}>
          <Section>
            <Stack>
              <TextInput label="Field 1" />
              <FormSection title="More details" description="Optional fields">
                <TextInput label="Field 2" />
                <TextInput label="Field 3" />
              </FormSection>
            </Stack>
          </Section>
        </Demo>
        <Demo name="Wizard" description="Multi-step flow with per-step validation."
          code={`<Wizard steps={[{ label: 'Step 1', content: …, validate: () => true }, …]} onFinish={save} />`}>
          <Section>
            <Wizard
              steps={[
                { label: 'Details', content: <TextInput label="Name" mt="md" /> },
                { label: 'Options', content: <TextInput label="Option" mt="md" /> },
                { label: 'Review', content: <Text mt="md" size="sm">Ready to finish.</Text> },
              ]}
              onFinish={() => { notify.success('Wizard finished'); }}
            />
          </Section>
        </Demo>
      </SimpleGrid>
    </Stack>
  );
}

function FeedbackDemos() {
  const confirm = useConfirm();
  return (
    <Stack gap="xl">
      <Demo name="useConfirm" description="Promise-based confirmation dialog; optional async action with error display."
        code={`const confirm = useConfirm();\nif (await confirm({ title: 'Archive item?', confirmLabel: 'Archive' })) { … }`}>
        <Group>
          <Button variant="default" onClick={async () => {
            const ok = await confirm({ title: 'Archive this item?', message: 'You can restore it later.', confirmLabel: 'Archive' });
            notify.info(ok ? 'Confirmed' : 'Cancelled');
          }}>Open confirm</Button>
          <Button variant="light" color="red" onClick={() => confirm({
            title: 'Delete “Item A”?', color: 'red', confirmLabel: 'Delete',
            onConfirm: async () => { throw new Error('Example: the API refused (409).'); },
          })}>Confirm with a failing action</Button>
        </Group>
      </Demo>
      <Demo name="notify" description="One-line toasts."
        code={`notify.success('Saved'); notify.error(err); notify.info('…'); notify.warning('…');`}>
        <Group>
          <Button variant="light" color="teal" onClick={() => notify.success('Saved successfully', 'Success')}>success</Button>
          <Button variant="light" onClick={() => notify.info('Something happened')}>info</Button>
          <Button variant="light" color="yellow" onClick={() => notify.warning('Check this')}>warning</Button>
          <Button variant="light" color="red" onClick={() => notify.error(new Error('Request failed'))}>error</Button>
        </Group>
      </Demo>
      <Demo name="InlineAlert" description="Message box inside a page or form."
        code={`<InlineAlert type="warning" title="Heads up">…</InlineAlert>`}>
        <Stack gap="sm">
          <InlineAlert type="info" title="Info">Informational message.</InlineAlert>
          <InlineAlert type="success">Saved successfully.</InlineAlert>
          <InlineAlert type="warning" title="Heads up">This can't be undone.</InlineAlert>
          <InlineAlert type="error">Something went wrong.</InlineAlert>
        </Stack>
      </Demo>
    </Stack>
  );
}

export default function UiGalleryPage() {
  return (
    <>
      <PageHeader title="UI gallery" description="Reusable components in components/ui — import from '../components/ui'. Development only."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'UI gallery' }]} />
      <TabsPanel tabs={[
        { value: 'layout', label: 'Layout', icon: IconLayout, content: <LayoutDemos /> },
        { value: 'display', label: 'Data display', icon: IconListDetails, content: <DisplayDemos /> },
        { value: 'charts', label: 'Charts', icon: IconChartBar, content: <ChartDemos /> },
        { value: 'forms', label: 'Forms', icon: IconForms, content: <FormDemos /> },
        { value: 'feedback', label: 'Feedback', icon: IconMessage, content: <FeedbackDemos /> },
      ]} />
    </>
  );
}
