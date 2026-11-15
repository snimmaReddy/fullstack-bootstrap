import { useCallback, useEffect, useState } from 'react';
import { fetchSchemas, schemaToResource, type SchemaError } from '../api/schemas';
import type { ResourceConfig } from '../types';

interface State {
  resources: ResourceConfig[];
  errors: SchemaError[];
  loading: boolean;
  failed: string | null;
}

/** Loads schema-driven resources; refetches when the tab regains focus so schema edits show up. */
export function useSchemas() {
  const [state, setState] = useState<State>({ resources: [], errors: [], loading: true, failed: null });

  const load = useCallback(async () => {
    try {
      const { schemas, errors } = await fetchSchemas();
      setState({ resources: schemas.map((s) => schemaToResource(s, schemas)), errors, loading: false, failed: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, failed: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  return state;
}
