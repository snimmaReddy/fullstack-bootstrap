import { useState, type FormEvent } from 'react';
import type { FieldConfig } from '../types';

type Values = Record<string, string | boolean>;

interface Props<T> {
  fields: FieldConfig<T>[];
  initial?: Partial<T>;
  submitLabel?: string;
  onSubmit: (data: Partial<T>) => Promise<void>;
}

const emptyValues = <T,>(fields: FieldConfig<T>[], initial?: Partial<T>): Values =>
  Object.fromEntries(
    fields.map((f) => {
      const v = initial?.[f.name] as unknown;
      return [f.name, f.type === 'checkbox' ? Boolean(v) : v == null ? '' : String(v)];
    }),
  );

/** Renders a form from field config and converts values to the right JS types on submit. */
export function DynamicForm<T>({ fields, initial, submitLabel = 'Save', onSubmit }: Props<T>) {
  const [values, setValues] = useState<Values>(() => emptyValues(fields, initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.type === 'number') data[f.name] = v === '' ? null : Number(v);
      else if (f.type === 'checkbox') data[f.name] = v;
      else data[f.name] = v === '' ? null : v;
    }
    setBusy(true);
    try {
      await onSubmit(data as Partial<T>);
      setValues(emptyValues(fields, initial));
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
        if (f.type === 'checkbox')
          return (
            <label key={f.name} className="check">
              <input {...common} type="checkbox" checked={values[f.name] as boolean}
                onChange={(e) => set(f.name, e.target.checked)} />
              {f.label}
            </label>
          );
        return (
          <div key={f.name} className="field">
            <label htmlFor={id}>{f.label}{f.required && ' *'}</label>
            {f.type === 'textarea' ? (
              <textarea {...common} rows={3} value={values[f.name] as string}
                onChange={(e) => set(f.name, e.target.value)} />
            ) : (
              <input {...common} type={f.type ?? 'text'} value={values[f.name] as string}
                step={f.type === 'number' ? 'any' : undefined}
                onChange={(e) => set(f.name, e.target.value)} />
            )}
          </div>
        );
      })}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}
