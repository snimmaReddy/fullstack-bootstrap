import type { FieldType, ResourceConfig } from '../types';

/** Shapes returned by GET /api/schemas (see api/Schemas/SchemaDefinition.cs). */
export type SchemaFieldType =
  | 'string' | 'text' | 'email' | 'number' | 'integer' | 'boolean' | 'date' | 'enum';

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
}

export interface Schema {
  name: string;
  collection: string;
  title: string;
  file: string;
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
};

export async function fetchSchemas(): Promise<{ schemas: Schema[]; errors: SchemaError[] }> {
  const res = await fetch('/api/schemas');
  if (!res.ok) throw new Error(`Could not load schemas (${res.status})`);
  return res.json();
}

/** Adapts a JSON schema to the generic page config used by ResourcePage. */
export function schemaToResource(s: Schema): ResourceConfig {
  return {
    key: s.name,
    title: s.title,
    endpoint: `/api/data/${s.name}`,
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
    })),
  };
}
