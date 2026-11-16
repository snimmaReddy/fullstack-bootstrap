/** Error from the API, with per-field validation messages when the API sent them. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const fieldErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries<string[]>(body.errors ?? {})) fieldErrors[key] = messages[0];
    const general = fieldErrors[''];
    delete fieldErrors[''];
    return new ApiError(res.status, general ?? body.detail ?? body.title ?? res.statusText, fieldErrors);
  } catch {
    return new ApiError(res.status, res.statusText || `Request failed (${res.status})`);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw await toError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** GET a list; the total (before paging) comes from the X-Total-Count header. */
export async function requestList<T>(path: string): Promise<{ items: T[]; total: number }> {
  const res = await fetch(path);
  if (!res.ok) throw await toError(res);
  const items = (await res.json()) as T[];
  return { items, total: Number(res.headers.get('X-Total-Count') ?? items.length) };
}
