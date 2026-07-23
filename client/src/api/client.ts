export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, status: number, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const BASE = '/api';

export async function apiGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, v);
    }
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, credentials: 'include' });
  } catch {
    throw new ApiError('Network error — is the API server running?', 0, 'NETWORK');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed (${res.status})`, res.status, data?.code ?? 'ERROR');
  }
  return data as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data?.error ?? 'Request failed', res.status, data?.code);
  return data as T;
}
