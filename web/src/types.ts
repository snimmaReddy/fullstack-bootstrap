/** Mirrors Api.Models.BaseEntity (ASP.NET serializes as camelCase). */
export interface Entity {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FieldType =
  | 'text' | 'email' | 'number' | 'integer' | 'textarea' | 'checkbox' | 'date' | 'select';

export interface FieldConfig<T> {
  name: Extract<keyof T, string>;
  label: string;
  type?: FieldType; // default 'text'
  required?: boolean;
  showInTable?: boolean; // default true
  options?: string[] | null; // for 'select'
  default?: unknown;
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
}

/** Everything the UI needs to render a CRUD page for one entity. */
export interface ResourceConfig<T extends Entity = any> {
  key: string; // URL path, e.g. "contact" -> /contact
  title: string;
  endpoint: string; // e.g. "/api/data/contact"
  fields: FieldConfig<T>[];
}
