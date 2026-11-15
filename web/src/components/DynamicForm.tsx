import { useEffect, useState, type FormEvent } from 'react';
import { crudApi } from '../api/client';
import type { Entity, FieldConfig } from '../types';

type Values = Record<string, string | boolean>;

interface Props<T> {
  fields: FieldConfig<T>[];
  initial?: Partial<T>;
  submitLabel?: string;
  onSubmit: (data: Partial<T>) => Promise<void>;
}

const startValues = <T,>(fields: FieldConfig<T>[], initial?: Partial<T>): Values =>
  Object.fromEntries(
    fields.map((f) => {
      const v = (initial?.[f.name] as unknown) ?? f.default;
      return [f.name, f.type === 'checkbox' ? Boolean(v) : v == null ? '' : String(v)];
    }),
  );

/** Renders a form from field config and converts values to the right JS types on submit. */
export function DynamicForm<T>({ fields, initial, submitLabel = 'Save', onSubmit }: Props<T>) {
  const [values, setValues] = useState<Values>(() => startValues(fields, initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === 'number' || f.type === 'integer') data[f.name] = v === '' ? null : Number(v);
      else if (f.type === 'checkbox') data[f.name] = v;
      else data[f.name] = v === '' ? null : v;
    }
    setBusy(true);
    try {
      await onSubmit(data as Partial<T>);
      setValues(startValues(fields, initial));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const common = { id, name: f.name, required: f.required };
        const value = values[f.name] as string;
        const onChange = (e: { target: { value: string } }) => set(f.name, e.target.value);

        if (f.type === 'checkbox')
          return (
            <label key={f.name} className="check">
              <input {...common} required={false} type="checkbox" checked={values[f.name] as boolean}
                onChange={(e) => set(f.name, e.target.checked)} />
              {f.label}
            </label>
          );

        let input;
        if (f.type === 'textarea')
          input = <textarea {...common} rows={3} value={value} maxLength={f.maxLength ?? undefined} onChange={onChange} />;
        else if (f.type === 'ref')
          input = <RefSelect {...common} value={value} onChange={onChange} schema={f.ref!} display={f.refDisplay ?? 'id'} />;
        else if (f.type === 'select')
          input = (
            <select {...common} value={value} onChange={onChange}>
              <option value="">Select…</option>
              {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        else
          input = (
            <input {...common} value={value} onChange={onChange}
              type={f.type === 'integer' ? 'number' : f.type ?? 'text'}
              step={f.type === 'integer' ? 1 : f.type === 'number' ? 'any' : undefined}
              min={f.min ?? undefined} max={f.max ?? undefined}
              minLength={f.minLength ?? undefined} maxLength={f.maxLength ?? undefined} />
          );

        return (
          <div key={f.name} className="field">
            <label htmlFor={id}>{f.label}{f.required && ' *'}</label>
            {input}
          </div>
        );
      })}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

interface RefSelectProps {
  id: string;
  name: string;
  required?: boolean;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  schema: string;
  display: string;
}

/** Dropdown of records from another schema, labelled by that schema's display field. */
function RefSelect({ schema, display, ...props }: RefSelectProps) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    crudApi<Entity & Record<string, unknown>>(`/api/data/${schema}`)
      .list(`?limit=500&sort=${encodeURIComponent(display)}`)
      .then((rows) => setOptions(rows.map((r) => ({ id: r.id!, label: String(r[display] ?? r.id) }))))
      .catch((e: Error) => setError(e.message));
  }, [schema, display]);

  return (
    <select {...props} onChange={props.onChange} title={error ?? undefined}>
      <option value="">{error ? `Couldn't load ${schema}s` : 'Select…'}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
