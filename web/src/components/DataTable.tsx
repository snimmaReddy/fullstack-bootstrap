import type { Entity, FieldConfig } from '../types';

interface Props<T extends Entity> {
  fields: FieldConfig<T>[];
  items: T[];
  onDelete?: (id: string) => void;
}

const format = (v: unknown) =>
  typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v == null || v === '' ? '—' : String(v);

export function DataTable<T extends Entity>({ fields, items, onDelete }: Props<T>) {
  const cols = fields.filter((f) => f.showInTable !== false);
  if (items.length === 0) return <p className="muted">No records yet.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => <th key={c.name}>{c.label}</th>)}
            <th>Created</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {cols.map((c) => <td key={c.name}>{format(item[c.name])}</td>)}
              <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
              {onDelete && (
                <td><button className="link" onClick={() => onDelete(item.id!)}>Delete</button></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
