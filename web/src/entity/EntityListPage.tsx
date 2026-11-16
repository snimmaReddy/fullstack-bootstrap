import { Button, Card, Group, Pagination, Select, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { searchField, useList, type Target } from '../api/hooks';
import type { SchemaField } from '../api/schemas';
import { EntityTable } from '../components/EntityTable';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState, SearchInput } from '../components/ui';
import { RefSelect } from './fields';
import { useCurrentEntity } from './useCurrentEntity';
import { NotFoundPage } from '../pages/NotFoundPage';

/** /:entity — searchable, filterable, sortable, paged table. List state lives in the URL. */
export function EntityListPage() {
  const { entity, isLoading } = useCurrentEntity();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const search = params.get('q') ?? '';
  const sort = params.get('sort') ?? entity?.defaultSort;
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const filters = Object.fromEntries([...params].filter(([k]) => k.startsWith('f.')).map(([k, v]) => [k.slice(2), v]));

  const update = (changes: Record<string, string | null>) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      for (const [k, v] of Object.entries(changes)) (v == null || v === '' ? next.delete(k) : next.set(k, v));
      return next;
    }, { replace: true });

  const target: Target | null = entity ? { schema: entity.schema, endpoint: entity.endpoint, path: entity.path } : null;
  const list = useList(target, {
    search,
    filters,
    sort,
    page,
    pageSize: entity?.pageSize,
    include: entity?.refFields.map((f) => f.name),
  });

  if (!entity) return isLoading ? null : <NotFoundPage />;

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / entity.pageSize));
  const from = total === 0 ? 0 : (page - 1) * entity.pageSize + 1;
  const to = Math.min(total, page * entity.pageSize);
  const filtering = !!search || Object.keys(filters).length > 0;
  const singular = entity.schema.name;
  const canSearch = searchField(entity.schema);

  return (
    <>
      <PageHeader
        title={entity.title}
        description={list.data ? `${total} ${total === 1 ? 'record' : 'records'}${filtering ? ' match' : ''}` : ' '}
        crumbs={[{ label: 'Home', to: '/' }, { label: entity.title }]}
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate({ pathname: 'new', search: params.toString() })}>
            New {singular}
          </Button>
        }
      />

      <Card padding={0}>
        <Group p="md" gap="sm" wrap="wrap">
          {canSearch && (
            <SearchInput
              placeholder={`Search ${canSearch.label.toLowerCase()}…`}
              value={search}
              onChange={(q) => update({ q: q || null, page: null })}
              w={{ base: '100%', sm: 280 }}
            />
          )}
          {entity.filters.map((f) => (
            <FilterSelect key={f.name} field={f} value={filters[f.name] ?? null}
              onChange={(v) => update({ [`f.${f.name}`]: v, page: null })} />
          ))}
          {filtering && (
            <Button variant="subtle" color="gray" size="sm"
              onClick={() => setParams(sort ? { sort } : {}, { replace: true })}>
              Clear
            </Button>
          )}
        </Group>

        {list.isError ? (
          <div style={{ padding: 16 }}><ErrorState error={list.error} onRetry={() => list.refetch()} /></div>
        ) : !list.isLoading && rows.length === 0 ? (
          <EmptyState
            title={filtering ? 'No matching records' : `No ${entity.title.toLowerCase()} yet`}
            description={filtering ? 'Try a different search or clear the filters.' : `Create the first ${singular} to get started.`}
            action={!filtering && (
              <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('new')}>New {singular}</Button>
            )}
          />
        ) : (
          <EntityTable
            columns={entity.columns}
            rows={rows}
            loading={list.isLoading}
            sort={sort}
            onSort={(s) => update({ sort: s, page: null })}
            onRowClick={(r) => navigate(r.id)}
          />
        )}

        {total > 0 && (
          <Group justify="space-between" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Text size="sm" c="dimmed">{from}–{to} of {total}</Text>
            {pages > 1 && <Pagination size="sm" total={pages} value={page} onChange={(p) => update({ page: String(p) })} />}
          </Group>
        )}
      </Card>

      <Outlet />
    </>
  );
}

function FilterSelect({ field, value, onChange }: { field: SchemaField; value: string | null; onChange: (v: string | null) => void }) {
  if (field.type === 'ref')
    return <RefSelect schemaName={field.ref} value={value} onChange={onChange} placeholder={field.label} clearable w={FILTER_WIDTH} />;
  const data = field.type === 'boolean'
    ? [{ value: 'true', label: `${field.label}: Yes` }, { value: 'false', label: `${field.label}: No` }]
    : (field.values ?? []).map((v) => ({ value: v, label: v }));
  return <Select placeholder={field.label} data={data} value={value} onChange={onChange} clearable w={FILTER_WIDTH} />;
}

const FILTER_WIDTH = { base: 'calc(50% - 6px)', sm: 190 };
