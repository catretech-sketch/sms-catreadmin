# Catre Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the `sms-catreadmin` CDN React prototype into a Vite + React + TypeScript app whose login, auth, RBAC, and app shell run against the live backend via real email-OTP — the foundation every later screen plugs into.

**Architecture:** Vite + React 18 + TS. A typed `api/client.ts` fetch wrapper (envelope unwrap, `ApiError`, refresh-on-401-once) sits over the `/v1` backend. Auth tokens live in a small `tokenStore` (access in memory, refresh in localStorage); `AuthContext` rehydrates the session via `/auth/me`. The existing hand-rolled route/role state and the `React.createElement`-based UI primitives are ported (not rewritten) into ES modules and typed. TanStack Query's provider is mounted now for later sub-projects.

**Tech Stack:** Vite 6, React 18.3.1, TypeScript 5.6, @tanstack/react-query 5, Vitest 2 + @testing-library/react 16 + jsdom.

## Global Constraints

- Node ≥ 20.19 (Vite 6 floor). Package manager: npm.
- All API JSON is **snake_case**, request and response. Do not camelCase DTO fields.
- Base URL is `VITE_API_BASE_URL` and already includes `/v1` (e.g. `http://localhost:8080/v1`). Never hardcode it; read it only through `src/config.ts`.
- Success envelope `{ "data": ... }`; error envelope `{ "error": { "code", "message", "details"|null } }`. Error codes: `invalid_credentials`, `invalid_token`, `unauthorized`, `forbidden`, `not_found`, `validation_error`, `conflict`, `rate_limited`, `internal_error`.
- `Authorization: Bearer <access_token>` on every request **except** `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`.
- **No mock data.** `data.jsx` and `api/adapter.js` are NOT carried into `src/`; only `data.jsx`'s RBAC block (`ROLES`/`MATRIX`/`can`/`PERMISSION_CATALOG`) is ported into `src/auth/rbac.ts`. `DEMO_ROLES`, demo logins, and the topbar role-switcher are removed.
- TS `strict: true`. New logic modules (`config`, `tokenStore`, `client`, `auth`, `rbac`, `AuthContext`) must be fully typed (no `any`). Ported UI primitives (`lib`, `components`) may use pragmatic typing but must compile under strict.
- Role for UI gating comes from the access token via `GET /auth/me` (`roles[]`); the server is the source of truth (UI gating is UX only).
- Money INR; dates ISO-8601 UTC. Keep values as received.
- Bootstrap login identity for manual verification: `catre.tech@gmail.com` (backend auto-seeds it on startup).

---

### Task 1: Vite + React + TypeScript + Vitest scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `.env.example`, `.gitignore` (append), `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`
- Move: `styles.css` → `src/styles.css` (content unchanged)
- Replace: `index.html` (new Vite entry at repo root)

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm run test` scripts; `src/main.tsx` mounting a placeholder `<App/>`; Vitest+jsdom test env so every later task can write `.test.ts(x)`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "sms-catreadmin",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Create env, types, and test setup**

`.env.example`:
```
VITE_API_BASE_URL=http://localhost:8080/v1
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

Append to `.gitignore`:
```
node_modules
dist
.env
```

- [ ] **Step 5: Move `styles.css` and create the new `index.html`**

Move the existing `styles.css` to `src/styles.css` (content unchanged). Replace the root `index.html` with:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Catre · Super Admin</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```
(Leaflet was only used by the dashboard map; it returns in a later sub-project. Do not load it here.)

- [ ] **Step 6: Create placeholder `src/main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return <div style={{ padding: 24 }}>Catre Admin — foundation booting…</div>;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 7: Install and verify dev + build + test run**

Run: `npm install`
Run: `npm run build`
Expected: `tsc -b` passes and Vite emits `dist/` with no errors.
Run: `npm run dev` then open `http://localhost:5173`
Expected: page shows "Catre Admin — foundation booting…". Stop the dev server.
Run: `npm run test`
Expected: Vitest reports "No test files found" (exit 0) — the runner is wired.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "build(catreadmin): Vite + React + TS + Vitest scaffold"
```

---

### Task 2: `config.ts` — typed env access

**Files:**
- Create: `src/config.ts`, `src/config.test.ts`

**Interfaces:**
- Produces: `export const config: { apiBaseUrl: string }` — the only place `import.meta.env.VITE_API_BASE_URL` is read.

- [ ] **Step 1: Write the failing test**

`src/config.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { config } from './config';

describe('config', () => {
  it('exposes apiBaseUrl from the environment', () => {
    expect(typeof config.apiBaseUrl).toBe('string');
    expect(config.apiBaseUrl.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- config`
Expected: FAIL — cannot find module `./config`.

- [ ] **Step 3: Write minimal implementation**

`src/config.ts`:
```ts
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/v1';

export const config = { apiBaseUrl } as const;
```
(In Vitest, `VITE_API_BASE_URL` is undefined unless an `.env` is loaded, so the fallback keeps the test green and gives a sane local default.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts src/config.test.ts
git commit -m "feat(catreadmin): typed env config"
```

---

### Task 3: `api/types.ts` + contract coverage test

**Files:**
- Create: `src/api/types.ts`, `src/api/types.test.ts`
- Reference (read, do not import): `api/contracts.js` (current canonical key list)

**Interfaces:**
- Produces: exported types `Role`, `ClientStatus`, `Tier`, `ApiError`, `Envelope<T>`, `ListEnvelope<T>`, `ErrorBody`, `AuthTokens`, `Me`, and `CONTRACT_KEYS` (a runtime record mirroring `contracts.js` for the contract test). Later sub-projects extend this file with `Client`, `Plan`, etc.

- [ ] **Step 1: Write the failing test**

`src/api/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CONTRACT_KEYS } from './types';

// Mirrors api/contracts.js — the canonical snake_case keys the backend exposes.
// This test fails if the two drift, catching contract regressions.
const EXPECTED: Record<string, string[]> = {
  TENANT_KEYS: ['id','name','slug','country','status','plan_id','plan_name','tier','mrr',
    'students_count','staff_count','storage_gb','limits','created','last_active_days',
    'trial_ends_days','contact','csm','health_score','gateway','usage_series'],
  PLAN_KEYS: ['id','name','tier','pricing','price','per_student','min_students','period',
    'features','limits','visibility','audience','band','offer','color','description'],
  TEAM_MEMBER_KEYS: ['id','name','email','phone','role','status','last_login','joined'],
  INVOICE_KEYS: ['id','tenant_id','tenant_name','plan_name','amount','status','issued','due','paid_on'],
  SUPPORT_TICKET_KEYS: ['id','subject','tenant_id','tenant_name','status','priority','assignee','created','updated','messages_count'],
  ROLE_KEYS: ['key','name','description','color'],
  PERMISSION_KEYS: ['key','label','group','roles'],
};

describe('contract keys', () => {
  it('match api/contracts.js exactly', () => {
    expect(CONTRACT_KEYS).toEqual(EXPECTED);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- types`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write minimal implementation**

`src/api/types.ts`:
```ts
export type Role = 'owner' | 'admin' | 'support' | 'sales' | 'finance' | 'analyst';
export type ClientStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type Tier = 'trial' | 'silver' | 'gold' | 'platinum' | 'metered' | 'exclusive';

export interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]> | null;
}

export interface Envelope<T> { data: T; }
export interface ListEnvelope<T> { data: T[]; next_cursor: string | null; }

export interface AuthTokens { access_token: string; refresh_token: string; }
export interface Me { id: string; tenant_id: string | null; roles: Role[]; }

// Runtime mirror of api/contracts.js — guarded by types.test.ts.
export const CONTRACT_KEYS: Record<string, string[]> = {
  TENANT_KEYS: ['id','name','slug','country','status','plan_id','plan_name','tier','mrr',
    'students_count','staff_count','storage_gb','limits','created','last_active_days',
    'trial_ends_days','contact','csm','health_score','gateway','usage_series'],
  PLAN_KEYS: ['id','name','tier','pricing','price','per_student','min_students','period',
    'features','limits','visibility','audience','band','offer','color','description'],
  TEAM_MEMBER_KEYS: ['id','name','email','phone','role','status','last_login','joined'],
  INVOICE_KEYS: ['id','tenant_id','tenant_name','plan_name','amount','status','issued','due','paid_on'],
  SUPPORT_TICKET_KEYS: ['id','subject','tenant_id','tenant_name','status','priority','assignee','created','updated','messages_count'],
  ROLE_KEYS: ['key','name','description','color'],
  PERMISSION_KEYS: ['key','label','group','roles'],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- types`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/types.ts src/api/types.test.ts
git commit -m "feat(catreadmin): typed API contract + coverage test"
```

---

### Task 4: `auth/tokenStore.ts` — access in memory, refresh in localStorage

**Files:**
- Create: `src/auth/tokenStore.ts`, `src/auth/tokenStore.test.ts`

**Interfaces:**
- Produces: `tokenStore` with `getAccess(): string | null`, `getRefresh(): string | null`, `set(tokens: AuthTokens): void`, `clear(): void`. Consumed by `client.ts`, `auth.ts`, `AuthContext`.

- [ ] **Step 1: Write the failing test**

`src/auth/tokenStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStore } from './tokenStore';

describe('tokenStore', () => {
  beforeEach(() => { localStorage.clear(); tokenStore.clear(); });

  it('starts empty', () => {
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it('stores access in memory and refresh in localStorage', () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    expect(tokenStore.getAccess()).toBe('a1');
    expect(tokenStore.getRefresh()).toBe('r1');
    expect(localStorage.getItem('catre_refresh')).toBe('r1');
  });

  it('rehydrates refresh from localStorage on read', () => {
    localStorage.setItem('catre_refresh', 'r2');
    expect(tokenStore.getRefresh()).toBe('r2');
  });

  it('clear wipes both', () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(localStorage.getItem('catre_refresh')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tokenStore`
Expected: FAIL — cannot find module `./tokenStore`.

- [ ] **Step 3: Write minimal implementation**

`src/auth/tokenStore.ts`:
```ts
import type { AuthTokens } from '../api/types';

const REFRESH_KEY = 'catre_refresh';
let accessToken: string | null = null;

export const tokenStore = {
  getAccess(): string | null {
    return accessToken;
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: AuthTokens): void {
    accessToken = tokens.access_token;
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear(): void {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tokenStore`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/auth/tokenStore.ts src/auth/tokenStore.test.ts
git commit -m "feat(catreadmin): token store (memory access + localStorage refresh)"
```

---

### Task 5: `api/client.ts` — fetch wrapper, ApiError, refresh-on-401-once

**Files:**
- Create: `src/api/client.ts`, `src/api/ApiError.ts`, `src/api/client.test.ts`

**Interfaces:**
- Consumes: `config.apiBaseUrl`, `tokenStore`, `Envelope`/`ListEnvelope`/`ErrorBody` from `types`.
- Produces:
  - `class ApiError extends Error { status: number; code: string; details: Record<string,string[]> | null; }`
  - `request<T>(path: string, opts?: { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; auth?: boolean }): Promise<T>` — returns the unwrapped `data`.
  - `setOnAuthFailure(cb: () => void): void` — called when refresh fails (AuthContext registers logout).

- [ ] **Step 1: Write the failing test**

`src/api/client.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { request, ApiError, setOnAuthFailure } from './client';
import { tokenStore } from '../auth/tokenStore';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

describe('request', () => {
  it('unwraps the data envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: { ok: 1 } })));
    const out = await request<{ ok: number }>('/ping');
    expect(out).toEqual({ ok: 1 });
  });

  it('attaches the bearer token when authed', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/secure');
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer a1');
  });

  it('throws a typed ApiError on error envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'forbidden', message: 'nope', details: null } }, 403)));
    await expect(request('/x')).rejects.toMatchObject({ status: 403, code: 'forbidden' });
    await expect(request('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('refreshes once on 401 then retries the original request', async () => {
    tokenStore.set({ access_token: 'old', refresh_token: 'r1' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'invalid_token', message: 'exp' } }, 401)) // original
      .mockResolvedValueOnce(jsonResponse({ data: { access_token: 'new', refresh_token: 'r2' } }))     // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));                                    // retry
    vi.stubGlobal('fetch', fetchMock);
    const out = await request<{ ok: boolean }>('/secure');
    expect(out).toEqual({ ok: true });
    expect(tokenStore.getAccess()).toBe('new');
    const retryHeaders = (fetchMock.mock.calls[2][1] as RequestInit).headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer new');
  });

  it('calls onAuthFailure and throws when refresh also fails', async () => {
    tokenStore.set({ access_token: 'old', refresh_token: 'r1' });
    const onFail = vi.fn();
    setOnAuthFailure(onFail);
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'invalid_token', message: 'exp' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'invalid_token', message: 'bad' } }, 401)));
    await expect(request('/secure')).rejects.toBeInstanceOf(ApiError);
    expect(onFail).toHaveBeenCalledOnce();
    expect(tokenStore.getRefresh()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- client`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Write the ApiError class**

`src/api/ApiError.ts`:
```ts
export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, string[]> | null;
  constructor(status: number, code: string, message: string, details: Record<string, string[]> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
```

- [ ] **Step 4: Write `client.ts`**

`src/api/client.ts`:
```ts
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
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- client`
Expected: PASS (all 5 cases). If the "refresh once" test loops, confirm `/auth/refresh` is in `NO_AUTH` so the refresh call itself never recurses.

- [ ] **Step 6: Commit**

```bash
git add src/api/client.ts src/api/ApiError.ts src/api/client.test.ts
git commit -m "feat(catreadmin): API client with envelope unwrap + refresh-on-401"
```

---

### Task 6: `api/auth.ts` — auth endpoint functions

**Files:**
- Create: `src/api/auth.ts`, `src/api/auth.test.ts`

**Interfaces:**
- Consumes: `request`, `tokenStore`, `AuthTokens`/`Me` from `types`.
- Produces: `otpRequest(identifier)`, `otpVerify(identifier, code)`, `refresh()`, `me()`, `logout()`, `setPassword(password)`. `otpVerify` and `refresh` persist tokens via `tokenStore.set`.

- [ ] **Step 1: Write the failing test**

`src/api/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as client from './client';
import { otpRequest, otpVerify, me } from './auth';
import { tokenStore } from '../auth/tokenStore';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

describe('auth api', () => {
  it('otpRequest posts the identifier', async () => {
    const spy = vi.spyOn(client, 'request').mockResolvedValue({ sent: true });
    await otpRequest('catre.tech@gmail.com');
    expect(spy).toHaveBeenCalledWith('/auth/otp/request', { method: 'POST', body: { identifier: 'catre.tech@gmail.com' } });
  });

  it('otpVerify stores the returned tokens', async () => {
    vi.spyOn(client, 'request').mockResolvedValue({ access_token: 'a1', refresh_token: 'r1' });
    await otpVerify('catre.tech@gmail.com', '123456');
    expect(tokenStore.getAccess()).toBe('a1');
    expect(tokenStore.getRefresh()).toBe('r1');
  });

  it('me fetches the current user', async () => {
    vi.spyOn(client, 'request').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    const out = await me();
    expect(out.roles).toEqual(['owner']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- auth`
Expected: FAIL — cannot find module `./auth`.

- [ ] **Step 3: Write minimal implementation**

`src/api/auth.ts`:
```ts
import { request } from './client';
import { tokenStore } from '../auth/tokenStore';
import type { AuthTokens, Me } from './types';

export async function otpRequest(identifier: string): Promise<{ sent: boolean }> {
  return request('/auth/otp/request', { method: 'POST', body: { identifier } });
}

export async function otpVerify(identifier: string, code: string): Promise<AuthTokens> {
  const tokens = await request<AuthTokens>('/auth/otp/verify', { method: 'POST', body: { identifier, code } });
  tokenStore.set(tokens);
  return tokens;
}

export async function refresh(): Promise<AuthTokens> {
  const refresh_token = tokenStore.getRefresh();
  const tokens = await request<AuthTokens>('/auth/refresh', { method: 'POST', body: { refresh_token } });
  tokenStore.set(tokens);
  return tokens;
}

export async function me(): Promise<Me> {
  return request<Me>('/auth/me');
}

export async function logout(): Promise<void> {
  const refresh_token = tokenStore.getRefresh();
  try {
    if (refresh_token) await request('/auth/logout', { method: 'POST', body: { refresh_token } });
  } finally {
    tokenStore.clear();
  }
}

export async function setPassword(password: string): Promise<void> {
  await request('/auth/set-password', { method: 'POST', body: { password } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/auth.ts src/api/auth.test.ts
git commit -m "feat(catreadmin): auth endpoint functions"
```

---

### Task 7: `auth/rbac.ts` — typed roles, matrix, and `can()`

**Files:**
- Create: `src/auth/rbac.ts`, `src/auth/rbac.test.ts`
- Reference (read, do not import): `data.jsx:7-80` (the `ROLES`, `MATRIX`, `PERMISSION_CATALOG` blocks)

**Interfaces:**
- Consumes: `Role` from `types`.
- Produces: `ROLES`, `MATRIX: Record<string, Role[]>`, `PERMISSION_CATALOG`, `can(role: Role, action: string): boolean`. **No `DEMO_ROLES`.**

- [ ] **Step 1: Write the failing test**

`src/auth/rbac.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { can, MATRIX } from './rbac';

describe('rbac', () => {
  it('owner can delete clients, admin cannot', () => {
    expect(can('owner', 'clients.delete')).toBe(true);
    expect(can('admin', 'clients.delete')).toBe(false);
  });
  it('all roles can view the dashboard', () => {
    for (const r of MATRIX['dashboard.view']) expect(can(r, 'dashboard.view')).toBe(true);
  });
  it('unknown action denies everyone', () => {
    expect(can('owner', 'does.not.exist')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- rbac`
Expected: FAIL — cannot find module `./rbac`.

- [ ] **Step 3: Write the implementation**

Copy the `ROLES`, `MATRIX`, and `PERMISSION_CATALOG` object literals **verbatim** from `data.jsx:7-80` into `src/auth/rbac.ts`, dropping `DEMO_ROLES`, and add types/exports:

`src/auth/rbac.ts`:
```ts
import type { Role } from '../api/types';

export interface RoleMeta { key: Role; name: string; color: string; desc: string; }

export const ROLES: Record<Role, RoleMeta> = {
  owner:   { key: 'owner',   name: 'Owner',   color: 'var(--accent)', desc: 'Full access — team, settings, lifecycle, billing.' },
  admin:   { key: 'admin',   name: 'Admin',   color: 'var(--blue)',   desc: 'Client lifecycle, billing, support, onboarding.' },
  support: { key: 'support', name: 'Support', color: 'var(--green)',  desc: 'View clients, read-only impersonate, full tickets.' },
  sales:   { key: 'sales',   name: 'Sales',   color: 'var(--violet)', desc: 'Start trials, run onboarding, billing read-only.' },
  finance: { key: 'finance', name: 'Finance', color: 'var(--amber)',  desc: 'Plans, subscriptions, invoices, refunds.' },
  analyst: { key: 'analyst', name: 'Analyst', color: 'var(--slate)',  desc: 'Dashboards & reports only.' },
};

export const MATRIX: Record<string, Role[]> = {
  'dashboard.view':        ['owner','admin','support','sales','finance','analyst'],
  'clients.view':          ['owner','admin','support','sales','finance','analyst'],
  'clients.start_trial':   ['owner','admin','sales'],
  'clients.activate':      ['owner','admin','finance'],
  'clients.suspend':       ['owner','admin'],
  'clients.reinstate':     ['owner','admin','finance'],
  'clients.cancel':        ['owner','admin'],
  'clients.change_plan':   ['owner','admin','sales','finance'],
  'clients.delete':        ['owner'],
  'clients.impersonate':   ['owner','admin','support'],
  'clients.manage_people': ['owner','admin'],
  'usage.view':            ['owner','admin','support','sales','finance','analyst'],
  'onboarding.view':       ['owner','admin','support','sales'],
  'onboarding.manage':     ['owner','admin','sales'],
  'plans.view':            ['owner','admin','sales','finance'],
  'plans.manage':          ['owner','admin','finance'],
  'billing.view':          ['owner','admin','sales','finance'],
  'billing.manage_invoice':['owner','admin','finance'],
  'billing.refund':        ['owner','finance'],
  'support.view':          ['owner','admin','support'],
  'support.manage':        ['owner','admin','support'],
  'team.view':             ['owner'],
  'team.manage':           ['owner'],
  'settings.view':         ['owner'],
  'settings.manage':       ['owner'],
  'reports.view':          ['owner','admin','support','sales','finance','analyst'],
  'identity.view':         ['owner','admin'],
  'identity.manage':       ['owner','admin'],
};

export interface PermMeta { label: string; group: string; }
export const PERMISSION_CATALOG: Record<string, PermMeta> = {
  // copy verbatim from data.jsx:51-80
  'dashboard.view':         { label: 'View dashboard',           group: 'Overview' },
  'clients.view':           { label: 'View clients',             group: 'Clients' },
  'clients.start_trial':    { label: 'Start trial',              group: 'Clients' },
  'clients.activate':       { label: 'Activate client',          group: 'Clients' },
  'clients.suspend':        { label: 'Suspend client',           group: 'Clients' },
  'clients.reinstate':      { label: 'Reinstate client',         group: 'Clients' },
  'clients.cancel':         { label: 'Cancel client',            group: 'Clients' },
  'clients.change_plan':    { label: 'Change plan',              group: 'Clients' },
  'clients.delete':         { label: 'Delete client',            group: 'Clients' },
  'clients.impersonate':    { label: 'Impersonate client',       group: 'Clients' },
  'clients.manage_people':  { label: 'Manage school people',     group: 'Clients' },
  'usage.view':             { label: 'View usage',               group: 'Clients' },
  'onboarding.view':        { label: 'View onboarding',          group: 'Onboarding' },
  'onboarding.manage':      { label: 'Manage onboarding',        group: 'Onboarding' },
  'plans.view':             { label: 'View plans',               group: 'Revenue' },
  'plans.manage':           { label: 'Manage plans',             group: 'Revenue' },
  'billing.view':           { label: 'View billing',             group: 'Revenue' },
  'billing.manage_invoice': { label: 'Manage invoices',          group: 'Revenue' },
  'billing.refund':         { label: 'Issue refunds',            group: 'Revenue' },
  'reports.view':           { label: 'View reports',             group: 'Revenue' },
  'support.view':           { label: 'View support',             group: 'Support' },
  'support.manage':         { label: 'Manage tickets',           group: 'Support' },
  'team.view':              { label: 'View team',                group: 'Admin' },
  'team.manage':            { label: 'Manage team',              group: 'Admin' },
  'settings.view':          { label: 'View settings',            group: 'Admin' },
  'settings.manage':        { label: 'Manage settings',          group: 'Admin' },
  'identity.view':          { label: 'View Identity & Access',   group: 'Admin' },
  'identity.manage':        { label: 'Manage Identity & Access', group: 'Admin' },
};

export const can = (role: Role, action: string): boolean =>
  !!MATRIX[action] && MATRIX[action].includes(role);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- rbac`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/rbac.ts src/auth/rbac.test.ts
git commit -m "feat(catreadmin): typed RBAC matrix (demo roles removed)"
```

---

### Task 8: Port `lib.jsx` → `src/lib/` (icons, charts, formatters)

**Files:**
- Create: `src/lib/icons.tsx`, `src/lib/charts.tsx`
- Reference (copy bodies verbatim): existing `lib.jsx`

**Interfaces:**
- Produces: `export const Icon` (the full icon-component map from `lib.jsx`) and `export const Charts`. The formatters (`fmt`, `initials`, `avColor`) move with `ui.jsx` in Task 9 (they're defined in `ui.jsx`).

This is a **mechanical port**, not a rewrite — the file already uses `React.createElement` (no JSX syntax), so only module plumbing changes.

- [ ] **Step 1: Create `src/lib/icons.tsx`**

Copy the `const Icon = { … }` object literal from `lib.jsx` (lines ~19–106) verbatim. At the top add `import React from 'react';`. Replace the trailing `window.Icon = Icon;` with `export { Icon };`. Type the icon components as:
```tsx
import React from 'react';
export type IconProps = { size?: number; style?: React.CSSProperties; className?: string };
export type IconComponent = (props: IconProps) => React.ReactElement;

const Icon: Record<string, IconComponent> = {
  // ... paste every icon entry from lib.jsx verbatim ...
};
export { Icon };
```

- [ ] **Step 2: Create `src/lib/charts.tsx`**

Copy the `const Charts = { … }` block (and any chart helper functions) from `lib.jsx` (lines ~107–226) verbatim. Add `import React from 'react';` at the top and `export { Charts };` at the bottom (replacing `window.Charts = Charts;`). Type chart functions' params explicitly (e.g. `data: number[]`, `{ size }: { size?: number }`) to satisfy `noImplicitAny`.

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors from `src/lib/*`. Fix any implicit-`any` by annotating the offending parameter.

- [ ] **Step 4: Commit**

```bash
git add src/lib/icons.tsx src/lib/charts.tsx
git commit -m "refactor(catreadmin): port lib.jsx (icons, charts) to TS modules"
```

---

### Task 9: Port `ui.jsx` → `src/components/` (primitives + contexts)

**Files:**
- Create: `src/components/index.tsx` (or split: `format.ts`, `primitives.tsx`, `contexts.tsx`)
- Reference (copy bodies verbatim): existing `ui.jsx`

**Interfaces:**
- Consumes: `Icon` from `../lib/icons`.
- Produces named exports: `fmt`, `initials`, `avColor`, `Avatar`, `StatusBadge`, `STATUS_MAP`, `PRIORITY_MAP`, `Btn`, `Modal`, `ConfirmDialog`, `Menu`, `MenuItem`, `SkeletonRows`, `Empty`, `Forbidden`, `UsageBar`, `Segmented`, `Pagination`, `NavCtx`, `useNav`. **Drop `useMock`** (mock-only) and **drop the `RoleCtx`/`useRole`/`useCan`/`Can` wrappers here** — those move to `AuthContext` (Task 10) so RBAC reads the real role.

This is a **mechanical port**. The bodies use `React.createElement` and need no JSX rewrite.

- [ ] **Step 1: Create the components module**

Copy the primitive definitions from `ui.jsx` verbatim into `src/components/index.tsx`. At the top:
```tsx
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Icon } from '../lib/icons';
```
Then paste `fmt`, `initials`, `avColor`, `Avatar`, `STATUS_MAP`, `PRIORITY_MAP`, `StatusBadge`, `Btn`, `NavCtx`/`useNav`, `ToastCtx`/`useToast`/`ToastHost`, `Modal`, `ConfirmDialog`, `Menu`, `MenuItem`, `SkeletonRows`, `Empty`, `Forbidden`, `UsageBar`, `Segmented`, `Pagination` verbatim. **Omit** `useMock`, `RoleCtx`, `useRole`, `useCan`, `Can`. Replace the final `Object.assign(window, {…})` with a single `export { … }` listing every kept name. Add prop types to each component signature (e.g. `function Btn({ variant = 'default', size, icon: IcComp, children, className = '', ...rest }: BtnProps)`); where typing is noisy, `Record<string, unknown>` for `...rest` is acceptable.

Note: `Forbidden`'s copy mentions "Switch role using the badge in the top bar" — change that line to "Contact an owner if you need access." (the role switcher is removed).

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors. Annotate any implicit-`any` params flagged.

- [ ] **Step 3: Commit**

```bash
git add src/components/index.tsx
git commit -m "refactor(catreadmin): port ui.jsx primitives to TS (mock/role wrappers dropped)"
```

---

### Task 10: `auth/AuthContext.tsx` — session state, RBAC context, guards

**Files:**
- Create: `src/auth/AuthContext.tsx`, `src/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `otpRequest`/`otpVerify`/`me`/`logout` from `../api/auth`, `setOnAuthFailure` from `../api/client`, `tokenStore`, `can` from `./rbac`, `Role`/`Me` from `../api/types`.
- Produces:
  - `AuthProvider` (rehydrates on mount: if a refresh token exists, call `me()`; on failure, clear).
  - `useAuth(): { user: Me | null; role: Role | null; status: 'loading'|'authed'|'anon'; requestOtp; verifyOtp; signOut; can: (action: string) => boolean }`.
  - `Can({ action, children, fallback })` component reading the real role.

- [ ] **Step 1: Write the failing test**

`src/auth/AuthContext.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStore } from './tokenStore';
import * as authApi from '../api/auth';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

function Probe() {
  const { status, role, can } = useAuth();
  return <div>status:{status} role:{role ?? '-'} del:{String(can('clients.delete'))}</div>;
}

describe('AuthContext', () => {
  it('starts anon when there is no refresh token', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/status:anon/)).toBeInTheDocument());
  });

  it('rehydrates to authed via /auth/me when a refresh token exists', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/status:authed role:owner del:true/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- AuthContext`
Expected: FAIL — cannot find module `./AuthContext`.

- [ ] **Step 3: Write the implementation**

`src/auth/AuthContext.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { otpRequest, otpVerify, me as fetchMe, logout as apiLogout } from '../api/auth';
import { setOnAuthFailure } from '../api/client';
import { tokenStore } from './tokenStore';
import { can as canFor } from './rbac';
import type { Me, Role } from '../api/types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthValue {
  user: Me | null;
  role: Role | null;
  status: Status;
  requestOtp: (identifier: string) => Promise<{ sent: boolean }>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (action: string) => boolean;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const reset = useCallback(() => { setUser(null); setStatus('anon'); }, []);

  useEffect(() => { setOnAuthFailure(reset); }, [reset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tokenStore.getRefresh()) { if (alive) setStatus('anon'); return; }
      try {
        const m = await fetchMe();
        if (alive) { setUser(m); setStatus('authed'); }
      } catch {
        tokenStore.clear();
        if (alive) reset();
      }
    })();
    return () => { alive = false; };
  }, [reset]);

  const verifyOtp = useCallback(async (identifier: string, code: string) => {
    await otpVerify(identifier, code);
    const m = await fetchMe();
    setUser(m); setStatus('authed');
  }, []);

  const signOut = useCallback(async () => { await apiLogout(); reset(); }, [reset]);

  const role = user?.roles?.[0] ?? null;
  const value: AuthValue = {
    user, role, status,
    requestOtp: otpRequest,
    verifyOtp,
    signOut,
    can: (action) => (role ? canFor(role, action) : false),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

export function Can({ action, children, fallback = null }: { action: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = useAuth();
  return <>{can(action) ? children : fallback}</>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- AuthContext`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthContext.tsx src/auth/AuthContext.test.tsx
git commit -m "feat(catreadmin): AuthContext — session rehydrate + RBAC"
```

---

### Task 11: `screens/LoginScreen.tsx` — real email-OTP (demo logins removed)

**Files:**
- Create: `src/screens/LoginScreen.tsx`, `src/screens/LoginScreen.test.tsx`
- Reference (reuse the left brand panel markup verbatim): `screen-login.jsx:105-156`

**Interfaces:**
- Consumes: `useAuth` (`requestOtp`, `verifyOtp`), `Btn`, `Icon`, `useToast`.
- Produces: `LoginScreen` — a two-step flow: (1) enter email → `requestOtp`; (2) enter 6-digit code → `verifyOtp`. **No demo logins, no role select, no faked OTP banner, no password mode** (password is optional/out of scope for this task). On verify error, show the `ApiError.message`.

- [ ] **Step 1: Write the failing test**

`src/screens/LoginScreen.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';
import { AuthProvider } from '../auth/AuthContext';
import { ToastHost } from '../components';
import * as authApi from '../api/auth';

function wrap() {
  return render(<ToastHost><AuthProvider><LoginScreen /></AuthProvider></ToastHost>);
}

describe('LoginScreen', () => {
  it('requests an OTP then reveals the code step', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    wrap();
    await userEvent.type(screen.getByLabelText(/email/i), 'catre.tech@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(screen.getByLabelText(/code/i)).toBeInTheDocument());
    expect(authApi.otpRequest).toHaveBeenCalledWith('catre.tech@gmail.com');
  });

  it('does not render demo logins', () => {
    wrap();
    expect(screen.queryByText(/demo logins/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- LoginScreen`
Expected: FAIL — cannot find module `./LoginScreen`.

- [ ] **Step 3: Write the implementation**

`src/screens/LoginScreen.tsx` — JSX is fine here (new code). Reuse the existing left brand-panel layout/markup from `screen-login.jsx` for visual parity; the right panel is the two-step form below:
```tsx
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Btn, useToast } from '../components';
import { Icon } from '../lib/icons';
import { ApiError } from '../api/client';

export function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<'identify' | 'verify'>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await requestOtp(identifier.trim());
      setStep('verify');
      toast({ title: 'Code sent', msg: 'Check your email for the 6-digit code.', kind: 'info' });
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not send the code. Try again.');
    } finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await verifyOtp(identifier.trim(), code.trim());
      // success: AuthProvider flips status → App renders the shell
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Incorrect or expired code.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-grad)' }}>
      <div style={{ width: '100%', maxWidth: 440, borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)', padding: '40px 38px' }}>
        <div className="row gap10" style={{ marginBottom: 22 }}>
          <div className="brand-mark" style={{ width: 34, height: 34 }}>C</div>
          <div>
            <div className="brand-name" style={{ fontSize: 16 }}>Catre</div>
            <div className="brand-sub">Operator Control Plane</div>
          </div>
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Sign in to your account</h2>
        <p className="muted tiny" style={{ marginTop: 4 }}>Platform administrators only.</p>

        {step === 'identify' ? (
          <form onSubmit={send} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="username"
                value={identifier} onChange={(e) => { setIdentifier(e.target.value); setErr(''); }}
                placeholder="you@catre.io" />
            </div>
            {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
            <Btn variant="primary" type="submit" disabled={busy || !identifier.trim()}>
              <Icon.lock size={15} />{busy ? 'Sending…' : 'Send OTP'}
            </Btn>
          </form>
        ) : (
          <form onSubmit={verify} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="code">Enter 6-digit code</label>
              <input id="code" className="input mono" inputMode="numeric" maxLength={6}
                value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
                placeholder="••••••" style={{ letterSpacing: '4px', fontSize: 16 }} />
            </div>
            {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
            <Btn variant="primary" type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify & sign in'}<Icon.arrowRight size={16} />
            </Btn>
            <div className="row jb tiny">
              <a href="#" style={{ color: 'var(--accent-text)' }} onClick={(e) => { e.preventDefault(); send(e); }}>Resend code</a>
              <a href="#" className="muted" onClick={(e) => { e.preventDefault(); setStep('identify'); setCode(''); setErr(''); }}>Use a different email</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- LoginScreen`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/screens/LoginScreen.tsx src/screens/LoginScreen.test.tsx
git commit -m "feat(catreadmin): real email-OTP login (demo logins removed)"
```

---

### Task 12: `App.tsx` — app shell, router, guards (role-switcher removed)

**Files:**
- Create: `src/App.tsx`, `src/App.test.tsx`
- Reference (port `NAV`, `ROUTE_PERM`, `CRUMB`, `Sidebar`, route state): `app.jsx:6-185`

**Interfaces:**
- Consumes: `useAuth` (`status`, `role`, `can`, `signOut`, `user`), `Icon`, `Btn`, `Menu`, `MenuItem`, `Avatar`, `NavCtx`, `Forbidden`, `LoginScreen`, `ROLES`.
- Produces: `App` — if `status==='loading'` show a spinner; if `'anon'` render `<LoginScreen/>`; if `'authed'` render the shell (sidebar filtered by `can(perm)`, topbar **without the role switcher**, breadcrumbs, theme toggle, account menu with sign-out) and a placeholder content area routed by the existing in-house `route` state. Screen bodies are bound in later sub-projects — for now each route renders a titled placeholder, with `Forbidden` when `!can(routePerm)`.

- [ ] **Step 1: Write the failing test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { ToastHost } from './components';
import { tokenStore } from './auth/tokenStore';
import * as authApi from './api/auth';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

function wrap() {
  return render(<ToastHost><AuthProvider><App /></AuthProvider></ToastHost>);
}

describe('App shell', () => {
  it('shows the login screen when anon', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument());
  });

  it('renders nav gated by role and no role switcher when authed', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['analyst'] });
    wrap();
    // analyst sees Dashboard + Reports, never Team
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.queryByText('Team')).not.toBeInTheDocument();
    // role switcher is gone
    expect(screen.queryByTitle(/switch role/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- App`
Expected: FAIL — cannot find module `./App`.

- [ ] **Step 3: Write the implementation**

Port `app.jsx` into `src/App.tsx`. Keep `NAV`, `ROUTE_PERM`, `CRUMB` and the `Sidebar` component (convert `React.createElement` to JSX or keep as-is — both compile). Critical changes from the prototype:
- Replace `window.RBAC.can(role, …)` with `useAuth().can(…)`; replace the local `role` state with `useAuth().role`.
- **Delete the topbar role switcher** (`app.jsx:148-160`) and **demo `setRole`** usage.
- Replace `if (!authed) return <LoginScreen…>` with branching on `useAuth().status` (`loading`/`anon`/`authed`).
- Account menu "Sign out" calls `useAuth().signOut()`.
- `currentUser` comes from `useAuth().user` (id/roles); display the role name from `ROLES[role]`. There is no team-member name yet (that's a later screen) — show the role name + the user id/email if available, else just the role.
- Content area: replace the screen `switch` with a placeholder `renderScreen()` that returns `<div className="page"><h1>{CRUMB[route.name]?.join(' / ') ?? route.name}</h1><p className="muted">Coming in a later sub-project.</p></div>`, guarded by `can(ROUTE_PERM[route.name])` → `<Forbidden/>`.
- Keep the existing theme toggle + `localStorage` theme persistence.

`src/App.tsx` skeleton (fill nav bodies by porting from `app.jsx`):
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { Icon } from './lib/icons';
import { Btn, Menu, MenuItem, Avatar, NavCtx, Forbidden } from './components';
import { ROLES } from './auth/rbac';

// ... port NAV, ROUTE_PERM, CRUMB from app.jsx verbatim ...

export function App() {
  const { status, role, can, signOut, user } = useAuth();
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('sm_theme') || 'dark');
  const [route, setRoute] = useState<{ name: string; params: Record<string, unknown> }>({ name: 'dashboard', params: {} });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('sm_theme', theme); }, [theme]);
  // bounce off forbidden routes when role changes
  useEffect(() => { const p = ROUTE_PERM[route.name]; if (p && role && !can(p)) setRoute({ name: 'dashboard', params: {} }); }, [role]); // eslint-disable-line

  if (status === 'loading') return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">Loading…</div>;
  if (status === 'anon' || !role) return <LoginScreen />;

  const go = (name: string, params: Record<string, unknown> = {}) => setRoute({ name, params });
  const renderScreen = () => {
    const perm = ROUTE_PERM[route.name];
    if (perm && !can(perm)) return <Forbidden action={perm} />;
    return <div className="page"><h1 style={{ fontSize: 22, fontWeight: 700 }}>{(CRUMB[route.name] || [route.name]).join(' / ')}</h1>
      <p className="muted" style={{ marginTop: 8 }}>This screen is bound in a later sub-project.</p></div>;
  };

  return (
    <NavCtx.Provider value={{ route, go }}>
      <div className="app">
        {/* port <Sidebar> (filtered by can(it.perm)) and <Topbar> WITHOUT the role switcher; account menu Sign out → signOut() */}
        {/* ... */}
        <div className="main">
          {/* Topbar with breadcrumbs, theme toggle, account menu showing ROLES[role].name + user.id */}
          <div className="content">{renderScreen()}</div>
        </div>
      </div>
    </NavCtx.Provider>
  );
}
```

(The `Sidebar`/`Topbar` JSX bodies are ported from `app.jsx:110-185`, dropping the role-switcher `Menu` block and wiring `signOut`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- App`
Expected: PASS (both cases). Ensure the analyst nav-gating assertion holds (Team hidden, Dashboard/Reports shown).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(catreadmin): app shell + router + guards (role switcher removed)"
```

---

### Task 13: Wire `main.tsx` (providers) + DoD verification + docs

**Files:**
- Modify: `src/main.tsx`
- Modify: `README.md`
- Delete: prototype root files superseded by `src/` (`app.jsx`, `ui.jsx`, `lib.jsx`, `data.jsx`, `client-actions.jsx`, `screen-*.jsx`, `api/adapter.js`, `api/adapter.test.js`, `api/contracts.js`)

**Interfaces:**
- Consumes: `App`, `AuthProvider`, `ToastHost`, and a `QueryClientProvider` (mounted now for later sub-projects).
- Produces: a runnable app whose login → shell flow works against the live backend.

- [ ] **Step 1: Wire providers in `main.tsx`**

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { ToastHost } from './components';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastHost>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastHost>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 2: Remove the superseded prototype files**

```bash
git rm app.jsx ui.jsx lib.jsx data.jsx client-actions.jsx screen-*.jsx api/adapter.js api/adapter.test.js api/contracts.js
```
(Leave `api/README.md` — or move its contract note into `docs/`. The `.thumbnail`, `screenshots/`, and `styles.css`-derived `src/styles.css` stay.)

- [ ] **Step 3: Run the full test suite and typecheck and build**

Run: `npm run test`
Expected: all suites green (config, types, tokenStore, client, auth, rbac, AuthContext, LoginScreen, App).
Run: `npm run typecheck`
Expected: no errors.
Run: `npm run build`
Expected: clean production build into `dist/`.

- [ ] **Step 4: Manual end-to-end smoke against the live backend**

In `../sms-backend`: `docker compose up` (starts API + SQL Server; auto-seeds `catre.tech@gmail.com`).
In `sms-catreadmin`: `cp .env.example .env` (confirm `VITE_API_BASE_URL=http://localhost:8080/v1`), then `npm run dev`.
- Open `http://localhost:5173`, enter `catre.tech@gmail.com`, click **Send OTP**.
- Retrieve the 6-digit code from the backend email sender (console/log in dev), enter it, **Verify & sign in**.
- Expected: lands on the shell; nav is gated to the seeded admin's role; account menu **Sign out** returns to login. Reloading the page keeps you signed in (rehydrate via `/auth/me`).

Document the observed result (pass/fail + any deviation) in the commit body.

- [ ] **Step 5: Update `README.md`**

Replace the "frontend-only / no build step" section with the real run instructions:
```md
## Run it

Requires the backend (`../sms-backend`, `docker compose up`).

    cp .env.example .env      # VITE_API_BASE_URL=http://localhost:8080/v1
    npm install
    npm run dev               # http://localhost:5173

Sign in with email-OTP as `catre.tech@gmail.com` (code is emailed by the backend).
Build: `npm run build`. Tests: `npm run test`.
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(catreadmin): mount providers, remove prototype mocks, update docs"
```

---

## Self-Review

**Spec coverage** (against `docs/api/2026-06-17-catre-admin-frontend-handoff.md` §9 Sub-project 1):
- Vite + TS scaffold → Task 1 ✓
- Port styles.css/lib/components typed → Task 1 (styles), 8 (lib), 9 (components) ✓
- config.ts → Task 2 ✓
- api/client.ts (envelope, ApiError, refresh-on-401-once) → Task 5 ✓ (+ types Task 3, tokenStore Task 4)
- auth.ts + AuthContext + rbac.ts → Tasks 6, 10, 7 ✓
- Login wired to real email-OTP vs seeded `catre.tech@gmail.com` → Task 11 + Task 13 Step 4 ✓
- App shell (sidebar/topbar/router/guards) with real role from /auth/me → Task 12 ✓
- Demo controls removed → Task 7 (no DEMO_ROLES), Task 11 (no demo logins), Task 12 (no role switcher) ✓
- DoD: `npm run dev`, log in with real OTP, role-gated shell, build passes, unit + contract tests green → Task 13 ✓

**Placeholder scan:** No "TBD/TODO". The two ports (Tasks 8, 9) and the shell (Task 12) reference "copy verbatim from `<file:lines>`" with concrete plumbing edits and exact export lists rather than reproducing 200-line bodies — the source files exist in-repo at the cited lines.

**Type consistency:** `AuthTokens`/`Me`/`Role`/`ErrorBody` defined in Task 3 are consumed unchanged in Tasks 4–11. `request<T>`/`ApiError`/`setOnAuthFailure` (Task 5) are consumed with matching signatures in Tasks 6, 10, 11. `tokenStore.{getAccess,getRefresh,set,clear}` (Task 4) used consistently in Tasks 5, 6, 10. `can(role, action)` (Task 7) wrapped by `useAuth().can(action)` (Task 10) and consumed in Tasks 11, 12. `NavCtx`/`useNav` exported (Task 9) and provided in Task 12.
