import { Alert, Button, Drawer, Group, Skeleton, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useRecord, useSaveRecord } from '../api/hooks';
import { recordTitle, type DataRecord } from '../api/schemas';
import { FieldInput, toApiValue, toFormValue, validateField, type FormValue } from './fields';
import type { Entity } from './types';
import { useCurrentEntity } from './useCurrentEntity';

/**
 * /:entity/new and /:entity/:id/edit — a side drawer over the list or detail page.
 * The form is generated from the schema; server validation errors appear on their fields.
 */
export function EntityFormDrawer({ mode }: { mode: 'create' | 'edit' }) {
  const { entity, id } = useCurrentEntity();
  const navigate = useNavigate();
  const location = useLocation();
  const record = useRecord(mode === 'edit' ? entity : undefined, id);

  if (!entity) return null;

  // Close back to where the drawer was opened from (keeping the list's search and filters).
  const close = () =>
    navigate(mode === 'create' ? { pathname: `/${entity.path}`, search: location.search } : `/${entity.path}/${id}`);

  const title = mode === 'create' ? `New ${entity.schema.name}`
    : `Edit ${record.data ? recordTitle(entity.schema, record.data) : entity.schema.name}`;

  return (
    <Drawer opened onClose={close} position="right" size="lg" title={title}
      styles={{ title: { fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' } }}>
      {mode === 'edit' && !record.data ? (
        <Stack>{entity.schema.fields.map((f) => <Skeleton key={f.name} height={36} />)}</Stack>
      ) : (
        <EntityForm
          key={record.data?.id ?? 'new'}
          entity={entity}
          initial={mode === 'edit' ? record.data : undefined}
          onCancel={close}
          onSaved={(saved) => navigate(`/${entity.path}/${saved.id}`)}
        />
      )}
    </Drawer>
  );
}

function EntityForm({ entity, initial, onCancel, onSaved }: {
  entity: Entity;
  initial?: DataRecord;
  onCancel: () => void;
  onSaved: (record: DataRecord) => void;
}) {
  const fields = entity.schema.fields;
  const save = useSaveRecord(entity);
  const [formError, setFormError] = useState<string | null>(null);

  const initialValues = Object.fromEntries(fields.map((f) => [f.name, toFormValue(f, initial?.[f.name])])) as Record<string, FormValue>;
  const form = useForm<Record<string, FormValue>>({
    initialValues,
    validate: Object.fromEntries(fields.map((f) => [f.name, (v: FormValue) => validateField(f, v)])),
  });

  const submit = async (values: Record<string, FormValue>) => {
    setFormError(null);
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const value = toApiValue(f, values[f.name]);
      // Edits send only what changed (PATCH); creates send everything.
      if (initial && JSON.stringify(value) === JSON.stringify(toApiValue(f, initialValues[f.name]))) continue;
      data[f.name] = value;
    }
    if (initial && Object.keys(data).length === 0) {
      notifications.show({ color: 'gray', message: 'No changes to save.' });
      onCancel();
      return;
    }

    try {
      const saved = await save.mutateAsync({ id: initial?.id, data });
      notifications.show({
        color: 'teal',
        title: initial ? 'Changes saved' : 'Created',
        message: `“${recordTitle(entity.schema, saved)}” was ${initial ? 'updated' : 'created'}.`,
      });
      onSaved(saved);
    } catch (e) {
      if (e instanceof ApiError) {
        const known = Object.fromEntries(Object.entries(e.fieldErrors).filter(([k]) => fields.some((f) => f.name === k)));
        form.setErrors(known);
        const unknown = Object.entries(e.fieldErrors).filter(([k]) => !(k in known)).map(([, m]) => m);
        setFormError(Object.keys(known).length && !unknown.length ? null : [e.message, ...unknown].join(' '));
      } else {
        setFormError(e instanceof Error ? e.message : String(e));
      }
    }
  };

  return (
    <form onSubmit={form.onSubmit(submit)} noValidate>
      <Stack gap="md">
        {formError && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>{formError}</Alert>
        )}
        {fields.map((f) => (
          <FieldInput key={f.name} field={f} value={form.getValues()[f.name]} error={form.errors[f.name]}
            onChange={(v) => form.setFieldValue(f.name, v)} />
        ))}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>{initial ? 'Save changes' : `Create ${entity.schema.name}`}</Button>
        </Group>
      </Stack>
    </form>
  );
}
