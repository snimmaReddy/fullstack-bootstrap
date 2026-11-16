import { Badge, Card, SimpleGrid, Table, Text, Title } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { requestList } from '../api/client';
import { useCount, useEntities } from '../api/hooks';
import { recordTitle, type DataRecord } from '../api/schemas';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/StateViews';
import type { Entity } from '../entity/types';

/** Generic overview: a count per entity and the most recently added records. */
export function DashboardPage() {
  const { entities, isLoading } = useEntities();
  const navigate = useNavigate();

  const recent = useQueries({
    queries: entities.map((e) => ({
      queryKey: ['list', e.endpoint, { recent: true }],
      queryFn: () => requestList<DataRecord>(`${e.endpoint}?sort=-createdAt&limit=5`),
    })),
  });
  const latest = recent
    .flatMap((q, i) => (q.data?.items ?? []).map((r) => ({ record: r, entity: entities[i] })))
    .sort((a, b) => (b.record.createdAt ?? '').localeCompare(a.record.createdAt ?? ''))
    .slice(0, 8);

  return (
    <>
      <PageHeader title="Dashboard" description="An overview of your data." />

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb="lg">
        {entities.map((e) => <EntityStat key={e.path} entity={e} onClick={() => navigate(`/${e.path}`)} />)}
      </SimpleGrid>

      <Card padding={0}>
        <Title order={4} p="md">Recently added</Title>
        {!isLoading && latest.length === 0 && recent.every((q) => !q.isLoading) ? (
          <EmptyState title="Nothing here yet" description="Records you create will show up here." />
        ) : (
          <Table.ScrollContainer minWidth={480}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Created</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {latest.map(({ record, entity }) => (
                  <Table.Tr key={`${entity.path}/${record.id}`} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/${entity.path}/${record.id}`)}>
                    <Table.Td><Text fw={500} size="sm">{recordTitle(entity.schema, record)}</Text></Table.Td>
                    <Table.Td><Badge variant="light" leftSection={<entity.icon size={12} />}>{entity.schema.name}</Badge></Table.Td>
                    <Table.Td c="dimmed">{record.createdAt ? dayjs(record.createdAt).format('D MMM YYYY, HH:mm') : '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </>
  );
}

function EntityStat({ entity, onClick }: { entity: Entity; onClick: () => void }) {
  const count = useCount(entity.endpoint);
  return <StatCard label={entity.title} value={count.data} icon={entity.icon} loading={count.isLoading} onClick={onClick} />;
}
