import { DataTable } from '../components/DataTable';
import { DynamicForm } from '../components/DynamicForm';
import { useResource } from '../hooks/useResource';
import type { Entity, ResourceConfig } from '../types';

/** Generic page: create form + list, driven entirely by a ResourceConfig. */
export function ResourcePage<T extends Entity>({ config }: { config: ResourceConfig<T> }) {
  const { items, loading, error, create, remove } = useResource<T>(config.endpoint);

  return (
    <section>
      <h1>{config.title}</h1>
      <div className="card">
        <h2>Add new</h2>
        <DynamicForm fields={config.fields} onSubmit={create} submitLabel="Submit" />
      </div>
      <div className="card">
        <h2>Records</h2>
        {error && <p className="error">{error}</p>}
        {loading ? <p className="muted">Loading…</p> : (
          <DataTable fields={config.fields} items={items}
            onDelete={(id) => confirm('Delete this record?') && remove(id)} />
        )}
      </div>
    </section>
  );
}
