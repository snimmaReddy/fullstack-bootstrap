/** Mirrors Api.Models.BaseEntity (ASP.NET serializes as camelCase). */
export interface Entity {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'checkbox' | 'date';

export interface FieldConfig<T> {
  name: Extract<keyof T, string>;
  label: string;
  type?: FieldType; // default 'text'
  required?: boolean;
  showInTable?: boolean; // default true
}

/** Everything the UI needs to render a CRUD page for one entity. */
export interface ResourceConfig<T extends Entity = any> {
  key: string; // URL path, e.g. "contacts" -> /contacts
  title: string;
  endpoint: string; // e.g. "/api/contacts"
  fields: FieldConfig<T>[];
}
