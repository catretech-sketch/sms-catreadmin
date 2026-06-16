import { config } from '../config';
import { tokenStore } from '../auth/tokenStore';
import { ApiError } from './ApiError';
import type { ErrorBody } from './types';

export { ApiError };

let onAuthFailure: () => void = () => {};
export function setOnAuthFailure(cb: () => void): void { onAuthFailure = cb; }

const NO_AUTH = new Set(['/auth/otp/request', '/auth/otp/verify', '/auth/refresh']);

interface RequestOpts {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

function buildUrl(path: string, query?: RequestOpts['query']): string {
  const url = new URL(config.apiBaseUrl + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function rawFetch(path: string, opts: RequestOpts, accessToken: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const useAuth = opts.auth !== false && !NO_AUTH.has(path);
  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function parse<T>(res: Response): Promise<T> {
  let json: unknown = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    // body already consumed (e.g. second read of same Response in tests)
  }
  if (!res.ok) {
    const err = (json as { error?: ErrorBody }).error;
    throw new ApiError(res.status, err?.code ?? 'internal_error', err?.message ?? res.statusText, err?.details ?? null);
  }
  return (json as { data: T }).data;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;
  const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refresh_token: refresh } }, null);
  if (!res.ok) return false;
  const body = (await res.json()) as { data: { access_token: string; refresh_token: string } };
  tokenStore.set(body.data);
  return true;
}

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  let res = await rawFetch(path, opts, tokenStore.getAccess());
  if (res.status === 401 && !NO_AUTH.has(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, opts, tokenStore.getAccess());
    } else {
      tokenStore.clear();
      onAuthFailure();
    }
  }
  return parse<T>(res);
}
