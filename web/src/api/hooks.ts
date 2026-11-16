import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { entities as entityConfigs } from '../app/entities';
import { resolveEntity, type Entity } from '../entity/types';
import { request, requestList } from './client';
import type { DataRecord, Schema, SchemaError } from './schemas';

// ---------------------------------------------------------------- schemas + entities

export function useSchemas() {
  return useQuery({
    queryKey: ['schemas'],
    queryFn: () => request<{ schemas: Schema[]; errors: SchemaError[] }>('/api/schemas'),
    staleTime: 30_000,
  });
}

/** The entities registered in app/entities.ts, resolved against their schemas. */
export function useEntities() {
  const q = useSchemas();
  return useMemo(() => {
    const schemas = q.data?.schemas ?? [];
    const entities: Entity[] = [];
    const problems: string[] = [];
    for (const config of entityConfigs) {
      const schema = schemas.find((s) => s.name === config.schema);
      if (schema) entities.push(resolveEntity(config, schema));
      else if (q.data) problems.push(`app/entities.ts lists "${config.schema}", but schemas/${config.schema}.json isn't loaded.`);
    }
    return {
      entities,
      schemas,
      problems,
      schemaErrors: q.data?.errors ?? [],
      isLoading: q.isLoading,
      error: q.error,
      refetch: q.refetch,
    };
  }, [q.data, q.isLoading, q.error, q.refetch]);
}

export type EntitiesContext = ReturnType<typeof useEntities>;

/** Where records of any schema live: its registered entity, or /api/<collection> by convention. */
export interface Target {
  schema: Schema;
  endpoint: string;
  /** UI path, only when the schema is registered as a UI entity. */
  path?: string;
}

export function targetFor(schemaName: string | null, ctx: Pick<EntitiesContext, 'entities' | 'schemas'>): Target | null {
  const entity = ctx.entities.find((e) => e.schema.name === schemaName);
  if (entity) return { schema: entity.schema, endpoint: entity.endpoint, path: entity.path };
  const schema = ctx.schemas.find((s) => s.name === schemaName);
  return schema ? { schema, endpoint: `/api/${schema.collection}` } : null;
}

// ---------------------------------------------------------------- reads

export interface ListParams {
  search?: string;
  filters?: Record<string, string>;
  sort?: string;
  page?: number;
  pageSize?: number;
  include?: string[];
}

const SEARCHABLE = new Set(['string', 'text', 'email', 'enum']);

/** Whether a schema's display field supports text search. */
export function searchField(schema: Schema) {
  const f = schema.fields.find((x) => x.name === schema.display);
  return f && SEARCHABLE.has(f.type) ? f : null;
}

function listQuery(schema: Schema, p: ListParams) {
  const qs = new URLSearchParams();
  const search = searchField(schema);
  if (p.search && search) qs.set(`${search.name}.contains`, p.search);
  for (const [k, v] of Object.entries(p.filters ?? {})) if (v) qs.append(k, v);
  if (p.sort) qs.set('sort', p.sort);
  const size = p.pageSize ?? 20;
  qs.set('limit', String(size));
  if ((p.page ?? 1) > 1) qs.set('skip', String(((p.page ?? 1) - 1) * size));
  if (p.include?.length) qs.set('include', p.include.join(','));
  return `?${qs}`;
}

export function useList(target: Target | null, params: ListParams) {
  return useQuery({
    queryKey: ['list', target?.endpoint, params],
    queryFn: () => requestList<DataRecord>(target!.endpoint + listQuery(target!.schema, params)),
    enabled: !!target,
    placeholderData: keepPreviousData,
  });
}

export function useCount(endpoint: string) {
  return useQuery({
    queryKey: ['count', endpoint],
    queryFn: async () => (await requestList<DataRecord>(`${endpoint}?limit=1`)).total,
  });
}

export function useRecord(entity: Entity | undefined, id: string | undefined) {
  const include = entity?.refFields.map((f) => f.name).join(',');
  return useQuery({
    queryKey: ['record', entity?.endpoint, id],
    queryFn: () => request<DataRecord>(`${entity!.endpoint}/${id}${include ? `?include=${include}` : ''}`),
    enabled: !!entity && !!id,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => request<{ status: string; database: string }>('/api/health'),
    refetchInterval: 30_000,
    retry: false,
  });
}

// ---------------------------------------------------------------- writes

/** Create (no id) or PATCH (with id). Refreshes every cached list, count and record afterwards. */
export function useSaveRecord(entity: Entity | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Record<string, unknown> }) =>
      request<DataRecord>(id ? `${entity!.endpoint}/${id}` : entity!.endpoint, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'schemas' }),
  });
}

export function useDeleteRecord(entity: Entity | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request<void>(`${entity!.endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'schemas' }),
  });
}
