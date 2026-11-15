import type { FieldType, ResourceConfig } from '../types';

/** Shapes returned by GET /api/schemas (see api/Schemas/SchemaDefinition.cs). */
export type SchemaFieldType =
  | 'string' | 'text' | 'email' | 'number' | 'integer' | 'boolean' | 'date' | 'enum' | 'ref';

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  unique: boolean;
  showInTable: boolean;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  min: number | null;
  max: number | null;
  values: string[] | null;
  default: unknown;
  ref: string | null;
}

export interface Schema {
  name: string;
  collection: string;
  title: string;
  display: string;
  file: string;
  endpoint: string | null; // e.g. "/api/products"; null when no controller serves this schema
  fields: SchemaField[];
}

export interface SchemaError {
  file: string;
  message: string;
}

const UI_TYPE: Record<SchemaFieldType, FieldType> = {
  string: 'text',
  text: 'textarea',
  email: 'email',
  number: 'number',
  integer: 'integer',
  boolean: 'checkbox',
  date: 'date',
  enum: 'select',
  ref: 'ref',
};

export async function fetchSchemas(): Promise<{ schemas: Schema[]; errors: SchemaError[] }> {
  const res = await fetch('/api/schemas');
  if (!res.ok) throw new Error(`Could not load schemas (${res.status})`);
  return res.json();
}

/** Adapts a JSON schema (that has a controller) to the generic page config used by ResourcePage. */
export function schemaToResource(s: Schema & { endpoint: string }, all: Schema[]): ResourceConfig {
  const refs = s.fields.filter((f) => f.type === 'ref').map((f) => f.name);
  return {
    key: s.name,
    title: s.title,
    endpoint: s.endpoint,
    // Embed referenced records so tables can show their names instead of ids.
    listQuery: refs.length ? `?include=${refs.join(',')}` : '',
    fields: s.fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: UI_TYPE[f.type],
      required: f.required,
      showInTable: f.showInTable,
      options: f.values,
      default: f.default,
      min: f.min,
      max: f.max,
      minLength: f.minLength,
      maxLength: f.maxLength,
      ref: f.ref,
      refDisplay: all.find((o) => o.name === f.ref)?.display ?? 'id',
      refEndpoint: all.find((o) => o.name === f.ref)?.endpoint ?? null,
    })),
  };
}
