import { useCallback, useEffect, useMemo, useState } from 'react';
import { crudApi } from '../api/client';
import type { Entity } from '../types';

/** List + mutate state for one resource. Reloads the list after each change. */
export function useResource<T extends Entity>(endpoint: string) {
  const api = useMemo(() => crudApi<T>(endpoint), [endpoint]);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.list());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = async (data: Partial<T>) => {
    await api.create(data);
    await reload();
  };
  const update = async (id: string, data: Partial<T>) => {
    await api.update(id, data);
    await reload();
  };
  const remove = async (id: string) => {
    await api.remove(id);
    await reload();
  };

  return { items, loading, error, reload, create, update, remove };
}
