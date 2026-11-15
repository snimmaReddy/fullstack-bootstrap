import type { Entity } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Flattens ASP.NET ValidationProblemDetails into a readable message.
async function errorMessage(res: Response): Promise<string> {
  if (res.status === 401) return 'Sign-in required (401).';
  if (res.status === 403) return 'You do not have access to this resource (403).';
  if (res.status === 429) return 'Too many requests, try again in a minute (429).';
  try {
    const body = await res.json();
    if (body.errors) return Object.values(body.errors).flat().join(' ');
    return body.detail ?? body.title ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Typed CRUD client for any endpoint backed by CrudController<T>. */
export function crudApi<T extends Entity>(endpoint: string) {
  return {
    list: (query = '') => request<T[]>(endpoint + query),
    get: (id: string) => request<T>(`${endpoint}/${id}`),
    create: (data: Partial<T>) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) =>
      request<T>(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`${endpoint}/${id}`, { method: 'DELETE' }),
  };
}
