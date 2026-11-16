import type { ComponentType } from 'react';
import { IconDatabase } from '@tabler/icons-react';
import type { Schema, SchemaField } from '../api/schemas';

export type IconComponent = ComponentType<{ size?: number | string; stroke?: number }>;

/** One UI entity, registered in app/entities.ts. Only `schema` is required. */
export interface EntityConfig {
  /** Name of schemas/<schema>.json. */
  schema: string;
  /** UI path, e.g. "customers" → /customers. Default: the schema's collection. */
  path?: string;
  /** API base route. Default: /api/<collection> (the controller template's route). */
  endpoint?: string;
  /** Sidebar label and page title. Default: the schema's title. */
  title?: string;
  /** Sidebar icon (any @tabler/icons-react icon). */
  icon?: IconComponent;
  /** Table columns, in order. Default: fields with showInTable (up to 6). */
  columns?: string[];
  /** Filter dropdowns on the list page. Default: enum and boolean fields. */
  filters?: string[];
  /** Default sort, e.g. "name" or "-createdAt" (default). */
  defaultSort?: string;
  /** Rows per page (default 20). */
  pageSize?: number;
}

/** A custom page in the sidebar, registered in app/entities.ts. */
export interface CustomPage {
  path: string;
  label: string;
  icon?: IconComponent;
  /** The page component, e.g. ReportsPage from pages/ReportsPage.tsx. */
  component: ComponentType;
}

/** An EntityConfig resolved against its loaded schema. */
export interface Entity {
  schema: Schema;
  path: string;
  endpoint: string;
  title: string;
  icon: IconComponent;
  columns: SchemaField[];
  filters: SchemaField[];
  refFields: SchemaField[];
  defaultSort: string;
  pageSize: number;
}

export function resolveEntity(config: EntityConfig, schema: Schema): Entity {
  const pick = (names: string[] | undefined) =>
    names?.map((n) => schema.fields.find((f) => f.name === n)).filter((f): f is SchemaField => !!f);

  return {
    schema,
    path: config.path ?? schema.collection,
    endpoint: config.endpoint ?? `/api/${schema.collection}`,
    title: config.title ?? schema.title,
    icon: config.icon ?? IconDatabase,
    columns: pick(config.columns) ?? schema.fields.filter((f) => f.showInTable).slice(0, 6),
    filters: pick(config.filters) ?? schema.fields.filter((f) => f.type === 'enum' || f.type === 'boolean'),
    refFields: schema.fields.filter((f) => f.type === 'ref'),
    defaultSort: config.defaultSort ?? '-createdAt',
    pageSize: config.pageSize ?? 20,
  };
}
