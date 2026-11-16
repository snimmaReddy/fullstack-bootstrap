/**
 * Field type → form input and display. Supporting a new schema field type means adding it here.
 */
import { Anchor, Badge, NumberInput, Select, Switch, Text, TextInput, Textarea, type SelectProps } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconAt } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useEntities, useList, targetFor } from '../api/hooks';
import { recordTitle, type DataRecord, type SchemaField } from '../api/schemas';

export type FormValue = string | number | boolean | null;

// ---------------------------------------------------------------- value conversion

/** API value → form value. */
export function toFormValue(field: SchemaField, value: unknown): FormValue {
  switch (field.type) {
    case 'boolean':
      return Boolean(value ?? field.default ?? false);
    case 'number':
    case 'integer':
      return typeof value === 'number' ? value : typeof field.default === 'number' ? field.default : '';
    case 'date':
      return value ? String(value).slice(0, 10) : null;
    case 'ref':
      return value && typeof value === 'object' ? (value as DataRecord).id : ((value as string) ?? null);
    case 'enum':
      return (value as string) ?? (field.default as string) ?? null;
    default:
      return value == null ? ((field.default as string) ?? '') : String(value);
  }
}

/** Form value → API value ('' and empty selections become null). */
export function toApiValue(field: SchemaField, value: FormValue): unknown {
  if (value === '' || value === undefined) return null;
  if ((field.type === 'number' || field.type === 'integer') && typeof value === 'string') return Number(value);
  return value;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Quick client-side checks; the API validates everything again. */
export function validateField(field: SchemaField, value: FormValue): string | null {
  const empty = value === '' || value === null || value === undefined;
  if (empty) return field.required && field.type !== 'boolean' ? `${field.label} is required` : null;
  if (typeof value === 'string') {
    if (field.minLength != null && value.length < field.minLength) return `At least ${field.minLength} characters`;
    if (field.maxLength != null && value.length > field.maxLength) return `At most ${field.maxLength} characters`;
    if (field.type === 'email' && !EMAIL.test(value)) return 'Enter a valid email address';
  }
  if (typeof value === 'number') {
    if (field.min != null && value < field.min) return `Must be at least ${field.min}`;
    if (field.max != null && value > field.max) return `Must be at most ${field.max}`;
  }
  return null;
}

// ---------------------------------------------------------------- inputs

interface InputProps {
  value: FormValue;
  onChange: (value: FormValue) => void;
  error?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function FieldInput({ field, ...input }: { field: SchemaField } & InputProps) {
  const common = {
    label: field.label,
    withAsterisk: field.required && field.type !== 'boolean',
    error: input.error,
    onFocus: input.onFocus,
    onBlur: input.onBlur,
  };

  switch (field.type) {
    case 'text':
      return <Textarea {...common} autosize minRows={3} maxRows={8} value={(input.value as string) ?? ''}
        onChange={(e) => input.onChange(e.currentTarget.value)} />;
    case 'number':
    case 'integer':
      return <NumberInput {...common} value={(input.value as number | string) ?? ''} onChange={input.onChange}
        min={field.min ?? undefined} max={field.max ?? undefined}
        allowDecimal={field.type === 'number'} decimalScale={field.type === 'number' ? 6 : 0} thousandSeparator="," />;
    case 'boolean':
      return <Switch label={field.label} error={input.error} mt="xs" checked={Boolean(input.value)}
        onChange={(e) => input.onChange(e.currentTarget.checked)} />;
    case 'date':
      return <DateInput {...common} clearable valueFormat="D MMM YYYY" placeholder="Pick a date"
        value={(input.value as string) || null} onChange={(v) => input.onChange(v)} />;
    case 'enum':
      return <Select {...common} clearable={!field.required} placeholder="Select…" data={field.values ?? []}
        value={(input.value as string) || null} onChange={(v) => input.onChange(v)} />;
    case 'ref':
      return <RefSelect {...common} schemaName={field.ref} value={(input.value as string) || null}
        onChange={(v) => input.onChange(v)} clearable={!field.required} />;
    case 'email':
      return <TextInput {...common} type="email" leftSection={<IconAt size={16} />} value={(input.value as string) ?? ''}
        onChange={(e) => input.onChange(e.currentTarget.value)} />;
    default:
      return <TextInput {...common} value={(input.value as string) ?? ''} maxLength={field.maxLength ?? undefined}
        onChange={(e) => input.onChange(e.currentTarget.value)} />;
  }
}

/** Searchable dropdown of records from another schema, labelled by its display field. */
export function RefSelect({ schemaName, value, onChange, ...props }: {
  schemaName: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  label?: React.ReactNode;
  placeholder?: string;
  error?: React.ReactNode;
  withAsterisk?: boolean;
  clearable?: boolean;
  w?: SelectProps['w'];
}) {
  const ctx = useEntities();
  const target = targetFor(schemaName, ctx);
  const list = useList(target, { pageSize: 500, sort: target?.schema.display });
  const data = (list.data?.items ?? []).map((r) => ({ value: r.id, label: recordTitle(target!.schema, r) }));

  return (
    <Select
      placeholder={list.isError ? `Couldn't load ${schemaName ?? 'options'}` : 'Search…'}
      {...props}
      searchable
      nothingFoundMessage="No matches"
      data={data}
      value={value}
      onChange={onChange}
      disabled={list.isError}
    />
  );
}

// ---------------------------------------------------------------- display

/** Renders a field value for tables and detail pages. */
export function FieldValue({ field, value }: { field: SchemaField; value: unknown }) {
  const ctx = useEntities();
  if (value == null || value === '') return <Text c="dimmed" span>—</Text>;

  switch (field.type) {
    case 'boolean':
      return <Badge variant="light" color={value ? 'teal' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
    case 'enum':
      return <Badge variant="light">{String(value)}</Badge>;
    case 'date':
      return <>{dayjs(String(value).slice(0, 10)).format('D MMM YYYY')}</>;
    case 'number':
    case 'integer':
      return <>{Number(value).toLocaleString()}</>;
    case 'email':
      return <Anchor inherit href={`mailto:${value}`} onClick={(e) => e.stopPropagation()} style={{ wordBreak: 'break-all' }}>{String(value)}</Anchor>;
    case 'text':
      return <Text span inherit lineClamp={3} style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</Text>;
    case 'ref': {
      const target = targetFor(field.ref, ctx);
      const record = typeof value === 'object' ? (value as DataRecord) : null;
      const label = record && target ? recordTitle(target.schema, record) : String(value);
      const id = record?.id ?? String(value);
      return target?.path
        ? <Anchor inherit component={Link} to={`/${target.path}/${id}`} onClick={(e) => e.stopPropagation()}>{label}</Anchor>
        : <>{label}</>;
    }
    default:
      return <>{String(value)}</>;
  }
}
