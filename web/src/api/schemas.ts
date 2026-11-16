/** Shapes returned by GET /api/schemas (see api/Schemas/SchemaDefinition.cs). */

export type FieldType = 'string' | 'text' | 'email' | 'number' | 'integer' | 'boolean' | 'date' | 'enum' | 'ref';

export interface SchemaField {
  name: string;
  type: FieldType;
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
  fields: SchemaField[];
}

export interface SchemaError {
  file: string;
  message: string;
}

/** A record as the API returns it. */
export interface DataRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [field: string]: unknown;
}

/** The text that names a record (its schema's display field). */
export function recordTitle(schema: Schema, record: DataRecord | null | undefined): string {
  const value = record?.[schema.display];
  return value == null || value === '' ? (record?.id ?? '') : String(value);
}
