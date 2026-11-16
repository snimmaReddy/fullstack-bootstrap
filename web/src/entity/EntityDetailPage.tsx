import { Anchor, Button, Card, DataList, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useDeleteRecord, useList, useRecord } from '../api/hooks';
import { recordTitle } from '../api/schemas';
import { ConfirmDelete } from '../components/ui';
import { EntityTable } from '../components/EntityTable';
import { PageHeader } from '../components/PageHeader';
import { ErrorState } from '../components/StateViews';
import { NotFoundPage } from '../pages/NotFoundPage';
import { FieldValue } from './fields';
import type { Entity } from './types';
import { useCurrentEntity } from './useCurrentEntity';

/** /:entity/:id — all fields, linked records, related records, edit and delete. */
export function EntityDetailPage() {
  const { entity, entities, id, isLoading } = useCurrentEntity();
  const navigate = useNavigate();
  const record = useRecord(entity, id);
  const remove = useDeleteRecord(entity);
  const [deleting, deleteDialog] = useDisclosure(false);
  const narrow = useMediaQuery('(max-width: 48em)');

  if (!entity) return isLoading ? null : <NotFoundPage />;
  if (record.isError) {
    const notFound = (record.error as { status?: number }).status === 404;
    return notFound ? <NotFoundPage message={`This ${entity.schema.name} doesn't exist (it may have been deleted).`} />
      : <ErrorState error={record.error} onRetry={() => record.refetch()} />;
  }

  const data = record.data;
  const name = data ? recordTitle(entity.schema, data) : '';

  // Other registered entities with a ref field pointing at this one.
  const related = entities.flatMap((other) =>
    other.schema.fields.filter((f) => f.type === 'ref' && f.ref === entity.schema.name).map((field) => ({ other, field })));

  return (
    <>
      <PageHeader
        title={data ? name : <Skeleton height={32} width={240} />}
        crumbs={[{ label: 'Home', to: '/' }, { label: entity.title, to: `/${entity.path}` }, { label: name || '…' }]}
        actions={data && (
          <>
            <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => navigate('edit')}>Edit</Button>
            <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={deleteDialog.open}>Delete</Button>
          </>
        )}
      />

      <Stack gap="lg">
        <Card padding="lg">
          {!data ? (
            <Stack>{entity.schema.fields.map((f) => <Skeleton key={f.name} height={16} />)}</Stack>
          ) : (
            <DataList orientation={narrow ? 'vertical' : 'horizontal'} withDivider labelWidth={180}>
              {entity.schema.fields.map((f) => (
                <DataList.Item key={f.name}>
                  <DataList.ItemLabel>{f.label}</DataList.ItemLabel>
                  <DataList.ItemValue><FieldValue field={f} value={data[f.name]} /></DataList.ItemValue>
                </DataList.Item>
              ))}
              <DataList.Item>
                <DataList.ItemLabel>Created</DataList.ItemLabel>
                <DataList.ItemValue>{data.createdAt ? dayjs(data.createdAt).format('D MMM YYYY, HH:mm') : '—'}</DataList.ItemValue>
              </DataList.Item>
              <DataList.Item>
                <DataList.ItemLabel>Last updated</DataList.ItemLabel>
                <DataList.ItemValue>{data.updatedAt ? dayjs(data.updatedAt).format('D MMM YYYY, HH:mm') : '—'}</DataList.ItemValue>
              </DataList.Item>
            </DataList>
          )}
        </Card>

        {data && related.map(({ other, field }) => (
          <RelatedRecords key={`${other.path}.${field.name}`} other={other} field={field.name} id={data.id} />
        ))}
      </Stack>

      <ConfirmDelete
        opened={deleting}
        onClose={deleteDialog.close}
        name={name}
        onConfirm={async () => {
          await remove.mutateAsync(data!.id);
          deleteDialog.close();
          notifications.show({ color: 'teal', title: 'Deleted', message: `“${name}” was deleted.` });
          navigate(`/${entity.path}`, { replace: true });
        }}
      />
      <Outlet />
    </>
  );
}

/** Records of another entity whose ref field points at this record. */
function RelatedRecords({ other, field, id }: { other: Entity; field: string; id: string }) {
  const navigate = useNavigate();
  const list = useList(
    { schema: other.schema, endpoint: other.endpoint, path: other.path },
    { filters: { [field]: id }, pageSize: 10, include: other.refFields.map((f) => f.name) },
  );
  const total = list.data?.total ?? 0;

  return (
    <Card padding={0}>
      <Group justify="space-between" p="md">
        <Title order={4}>{other.title} <Text span c="dimmed" fw={400}>({total})</Text></Title>
        {total > 0 && <Anchor component={Link} to={`/${other.path}?f.${field}=${id}`} size="sm">View all</Anchor>}
      </Group>
      {total === 0 && !list.isLoading ? (
        <Text c="dimmed" size="sm" px="md" pb="md">None yet.</Text>
      ) : (
        <EntityTable columns={other.columns.filter((c) => c.name !== field)} rows={list.data?.items ?? []}
          loading={list.isLoading} skeletonRows={3} onRowClick={(r) => navigate(`/${other.path}/${r.id}`)} />
      )}
    </Card>
  );
}
