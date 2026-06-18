# Catre Admin — Read Screens Bound Live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the Catre operator console's read surface — Dashboard, Health, Clients list/detail, Reports — to the live backend with TanStack Query, matching the `index.html` prototype.

**Architecture:** Add a thin typed data layer (`api/*.ts` request functions + `api/hooks/*` query hooks + `queryKeys.ts`) on top of the existing `client.ts`/`AuthContext` foundation. Each of the five screens consumes hooks and renders inside a shared `<QueryBoundary>` that standardizes loading/error/empty. `App.tsx`'s `renderScreen()` flips these five routes from placeholder to real; the other five stay placeholders for sub-project 3.

**Tech Stack:** Vite + React 18 + TypeScript, `@tanstack/react-query` v5, Vitest + Testing Library. Existing design system: `src/components/index.tsx` (Btn, StatusBadge, SkeletonRows, Empty, UsageBar, Segmented, fmt), `src/lib/charts.tsx` (Charts.Line/Bars/Donut/Spark), `src/lib/icons.tsx`, `src/styles.css`.

## Global Constraints

- **snake_case** JSON, request and response. All DTO interfaces use snake_case keys verbatim from `../sms-backend/docs/api/catreadmin-api.md`.
- Money is INR `decimal` — format with `fmt.money` / `fmt.k`. Dates are ISO-8601 UTC strings.
- Base URL `config.apiBaseUrl` already includes `/v1`. All paths passed to `request()` start with `/` and **omit** `/v1`.
- `Authorization: Bearer <access_token>` is attached by `client.ts` automatically for every path except `/auth/*` listed in `NO_AUTH`. The CSV blob download attaches it manually via `tokenStore.getAccess()`.
- Lists are cursor-paged: `?limit=50&cursor=<opaque>` → `next_cursor` (`null` = last page). **No numbered pagination** — Clients uses a "Load more" button.
- RBAC is UI-gating only; the existing route guard in `App.tsx` already blocks by permission. Screens must still degrade cleanly on a `403 forbidden` from the server.
- **Visual gate:** screens (Tasks 7–10) must be reconciled against the imported `index.html` (requires the user to run `/design-login` so the design connector can read project `634cc3d4-99d8-4f2b-84ff-4f505fbce65b`) and the images in `screenshots/`. The baseline JSX in each screen task is functionally complete and design-system-consistent; adjust markup/classes to match the prototype before checking the screen's final step.
- Test commands: a single test file runs with `npx vitest run <path>`; the suite with `npm run test`; types with `npm run typecheck`.

---

### Task 1: Read-screen DTOs + contract test

**Files:**
- Modify: `src/api/types.ts`
- Modify: `src/api/types.test.ts`

**Interfaces:**
- Consumes: existing `Tier`, `ClientStatus`, `Role`, `CONTRACT_KEYS` in `types.ts`.
- Produces:
  - `AuditLog { id; actor_id; actor_name; role; action; target; kind: AuditKind; time }`, `AuditKind = 'suspend'|'refund'|'trial'|'impersonate'|'plan'|'team'|'invoice'|'activate'`
  - `ChartPoint { label: string; value: number; color: string }`
  - `SystemHealthItem { name: string; status: 'operational'|'degraded'|'down'; latency: string; uptime: string }`
  - `UsageAlert { tenant_id: string; name: string; usage_pct: number; status: ClientStatus; csm: string }`
  - `DashboardOverview { counts: {total;active;trial;suspended;cancelled: number}; mrr: number; trials_ending: number; churn_pct: number; months: string[]; mrr_series: number[]; signup_series: number[]; plan_mix: ChartPoint[]; usage_alerts: UsageAlert[]; system_health: SystemHealthItem[]; recent_activity: AuditLog[] }`
  - `RevenueReport { arr: number; net_growth: number; gross_churn_pct: number; arpa: number; months: string[]; revenue_series: number[]; revenue_by_plan: ChartPoint[]; plan_performance: PlanPerformance[] }`, `PlanPerformance { plan_name: string; clients: number; mrr: number; share_pct: number }`
  - `ClientUsage { students_count: number; staff_count: number; storage_gb: number; limits: Record<string, number>; usage_series: number[]; usage_pct: number }`

- [ ] **Step 1: Add the failing contract-test expectations**

In `src/api/types.test.ts`, add three entries to the `EXPECTED` object (inside the existing object literal, after `PERMISSION_KEYS`):

```typescript
  DASHBOARD_OVERVIEW_KEYS: ['counts','mrr','trials_ending','churn_pct','months','mrr_series',
    'signup_series','plan_mix','usage_alerts','system_health','recent_activity'],
  REVENUE_REPORT_KEYS: ['arr','net_growth','gross_churn_pct','arpa','months','revenue_series',
    'revenue_by_plan','plan_performance'],
  AUDIT_LOG_KEYS: ['id','actor_id','actor_name','role','action','target','kind','time'],
  CLIENT_USAGE_KEYS: ['students_count','staff_count','storage_gb','limits','usage_series','usage_pct'],
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/types.test.ts`
Expected: FAIL — `CONTRACT_KEYS` does not contain the new keys (`toEqual` mismatch).

- [ ] **Step 3: Add the DTOs and CONTRACT_KEYS entries**

In `src/api/types.ts`, append the interfaces:

```typescript
export type AuditKind = 'suspend' | 'refund' | 'trial' | 'impersonate' | 'plan' | 'team' | 'invoice' | 'activate';

export interface AuditLog {
  id: string; actor_id: string; actor_name: string; role: string;
  action: string; target: string; kind: AuditKind; time: string;
}

export interface ChartPoint { label: string; value: number; color: string; }

export interface SystemHealthItem {
  name: string; status: 'operational' | 'degraded' | 'down'; latency: string; uptime: string;
}

export interface UsageAlert {
  tenant_id: string; name: string; usage_pct: number; status: ClientStatus; csm: string;
}

export interface DashboardOverview {
  counts: { total: number; active: number; trial: number; suspended: number; cancelled: number };
  mrr: number; trials_ending: number; churn_pct: number;
  months: string[]; mrr_series: number[]; signup_series: number[];
  plan_mix: ChartPoint[]; usage_alerts: UsageAlert[];
  system_health: SystemHealthItem[]; recent_activity: AuditLog[];
}

export interface PlanPerformance { plan_name: string; clients: number; mrr: number; share_pct: number; }

export interface RevenueReport {
  arr: number; net_growth: number; gross_churn_pct: number; arpa: number;
  months: string[]; revenue_series: number[];
  revenue_by_plan: ChartPoint[]; plan_performance: PlanPerformance[];
}

export interface ClientUsage {
  students_count: number; staff_count: number; storage_gb: number;
  limits: Record<string, number>; usage_series: number[]; usage_pct: number;
}
```

Then add the matching entries to the `CONTRACT_KEYS` object (after `PERMISSION_KEYS`), identical to the arrays added in Step 1:

```typescript
  DASHBOARD_OVERVIEW_KEYS: ['counts','mrr','trials_ending','churn_pct','months','mrr_series',
    'signup_series','plan_mix','usage_alerts','system_health','recent_activity'],
  REVENUE_REPORT_KEYS: ['arr','net_growth','gross_churn_pct','arpa','months','revenue_series',
    'revenue_by_plan','plan_performance'],
  AUDIT_LOG_KEYS: ['id','actor_id','actor_name','role','action','target','kind','time'],
  CLIENT_USAGE_KEYS: ['students_count','staff_count','storage_gb','limits','usage_series','usage_pct'],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/api/types.ts src/api/types.test.ts
git commit -m "feat(catreadmin): read-screen DTOs + contract coverage"
```

---

### Task 2: Query-key factory

**Files:**
- Create: `src/api/queryKeys.ts`
- Test: `src/api/queryKeys.test.ts`

**Interfaces:**
- Consumes: `ClientsListParams` (defined here), `RevenueParams` (defined here).
- Produces:
  - `ClientsListParams { status?: string; tier?: string; q?: string; sort?: string; limit?: number }`
  - `RevenueParams { months?: number }`
  - `qk` object: `qk.dashboard()`, `qk.clients.list(p)`, `qk.clients.detail(id)`, `qk.clients.usage(id)`, `qk.clients.activity(id)`, `qk.reports.revenue(p)`.

- [ ] **Step 1: Write the failing test**

Create `src/api/queryKeys.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { qk } from './queryKeys';

describe('qk', () => {
  it('builds stable keys', () => {
    expect(qk.dashboard()).toEqual(['dashboard', 'overview']);
    expect(qk.clients.detail('c1')).toEqual(['clients', 'detail', 'c1']);
    expect(qk.clients.usage('c1')).toEqual(['clients', 'usage', 'c1']);
    expect(qk.clients.activity('c1')).toEqual(['clients', 'activity', 'c1']);
  });

  it('includes list params so changing a filter is a distinct key', () => {
    expect(qk.clients.list({ status: 'active', sort: '-mrr' }))
      .toEqual(['clients', 'list', { status: 'active', sort: '-mrr' }]);
    expect(qk.reports.revenue({ months: 12 })).toEqual(['reports', 'revenue', { months: 12 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/queryKeys.test.ts`
Expected: FAIL — cannot find module `./queryKeys`.

- [ ] **Step 3: Implement the factory**

Create `src/api/queryKeys.ts`:

```typescript
export interface ClientsListParams {
  status?: string; tier?: string; q?: string; sort?: string; limit?: number;
}
export interface RevenueParams { months?: number; }

export const qk = {
  dashboard: () => ['dashboard', 'overview'] as const,
  clients: {
    list: (params: ClientsListParams) => ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
    usage: (id: string) => ['clients', 'usage', id] as const,
    activity: (id: string) => ['clients', 'activity', id] as const,
  },
  reports: {
    revenue: (params: RevenueParams) => ['reports', 'revenue', params] as const,
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/queryKeys.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/queryKeys.ts src/api/queryKeys.test.ts
git commit -m "feat(catreadmin): query-key factory"
```

---

### Task 3: Dashboard API + hook

**Files:**
- Create: `src/api/dashboard.ts`
- Create: `src/api/hooks/useDashboardOverview.ts`
- Test: `src/api/dashboard.test.ts`

**Interfaces:**
- Consumes: `request` from `./client`, `DashboardOverview` from `./types`, `qk` from `./queryKeys`.
- Produces: `getOverview(): Promise<DashboardOverview>`; `useDashboardOverview()` → `UseQueryResult<DashboardOverview>`.

- [ ] **Step 1: Write the failing test**

Create `src/api/dashboard.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOverview } from './dashboard';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => vi.restoreAllMocks());

describe('getOverview', () => {
  it('GETs /dashboard/overview and unwraps data', async () => {
    const overview = { counts: { total: 3, active: 2, trial: 1, suspended: 0, cancelled: 0 }, mrr: 100 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: overview }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getOverview();
    expect(out).toMatchObject({ mrr: 100 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/dashboard/overview');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/dashboard.test.ts`
Expected: FAIL — cannot find module `./dashboard`.

- [ ] **Step 3: Implement the API function and hook**

Create `src/api/dashboard.ts`:

```typescript
import { request } from './client';
import type { DashboardOverview } from './types';

export function getOverview(): Promise<DashboardOverview> {
  return request<DashboardOverview>('/dashboard/overview');
}
```

Create `src/api/hooks/useDashboardOverview.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getOverview } from '../dashboard';
import { qk } from '../queryKeys';

export function useDashboardOverview() {
  return useQuery({ queryKey: qk.dashboard(), queryFn: getOverview });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/dashboard.ts src/api/hooks/useDashboardOverview.ts src/api/dashboard.test.ts
git commit -m "feat(catreadmin): dashboard overview api + hook"
```

---

### Task 4: Clients API + hooks

**Files:**
- Create: `src/api/clients.ts`
- Create: `src/api/hooks/useClients.ts`
- Create: `src/api/hooks/useClient.ts`
- Test: `src/api/clients.test.ts`

**Interfaces:**
- Consumes: `request` from `./client`; `Client` (existing `TENANT_KEYS` shape — defined inline here), `ClientUsage`, `AuditLog`, `ListEnvelope` from `./types`; `ClientsListParams`, `qk` from `./queryKeys`.
- Produces:
  - `Client` interface (in `types.ts`, added this task — see Step 3).
  - `listClients(params, cursor?): Promise<ListEnvelope<Client>>`
  - `getClient(id): Promise<Client>`, `getClientUsage(id): Promise<ClientUsage>`, `getClientActivity(id, cursor?): Promise<ListEnvelope<AuditLog>>`
  - `useClients(params)` → `UseInfiniteQueryResult`; `useClient(id)`, `useClientUsage(id)`, `useClientActivity(id)` → `UseQueryResult`.

- [ ] **Step 1: Write the failing test**

Create `src/api/clients.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listClients, getClient } from './clients';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => vi.restoreAllMocks());

describe('listClients', () => {
  it('passes filter/sort/cursor as query params and returns the list envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'c1' }], next_cursor: 'n2' }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await listClients({ status: 'active', sort: '-mrr', limit: 50 }, 'cur1');
    expect(out).toEqual({ data: [{ id: 'c1' }], next_cursor: 'n2' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('status=active');
    expect(url).toContain('sort=-mrr');
    expect(url).toContain('cursor=cur1');
  });
});

describe('getClient', () => {
  it('GETs /clients/{id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getClient('c1');
    expect(out).toEqual({ id: 'c1' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/clients/c1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/clients.test.ts`
Expected: FAIL — cannot find module `./clients`.

- [ ] **Step 3: Add the `Client` DTO, then implement clients.ts**

In `src/api/types.ts`, add (the `TENANT_KEYS` fields, typed):

```typescript
export interface Client {
  id: string; name: string; slug: string; country: string; status: ClientStatus;
  plan_id: string; plan_name: string; tier: Tier; mrr: number;
  students_count: number; staff_count: number; storage_gb: number;
  limits: Record<string, number>; created: string; last_active_days: number;
  trial_ends_days: number | null; contact: string; csm: string;
  health_score: number; gateway: string; usage_series: number[];
}
```

Create `src/api/clients.ts`:

```typescript
import { request } from './client';
import type { Client, ClientUsage, AuditLog, ListEnvelope } from './types';
import type { ClientsListParams } from './queryKeys';

export function listClients(params: ClientsListParams, cursor?: string): Promise<ListEnvelope<Client>> {
  return request<ListEnvelope<Client>>('/clients', {
    query: { ...params, limit: params.limit ?? 50, cursor },
  });
}

export function getClient(id: string): Promise<Client> {
  return request<Client>(`/clients/${id}`);
}

export function getClientUsage(id: string): Promise<ClientUsage> {
  return request<ClientUsage>(`/clients/${id}/usage`);
}

export function getClientActivity(id: string, cursor?: string): Promise<ListEnvelope<AuditLog>> {
  return request<ListEnvelope<AuditLog>>(`/clients/${id}/activity`, { query: { cursor } });
}
```

> Note: `request`'s `query` builder skips `undefined` values, so an absent filter/cursor is omitted from the URL.

Create `src/api/hooks/useClients.ts`:

```typescript
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { listClients, getClientUsage, getClientActivity } from '../clients';
import { qk, type ClientsListParams } from '../queryKeys';

export function useClients(params: ClientsListParams) {
  return useInfiniteQuery({
    queryKey: qk.clients.list(params),
    queryFn: ({ pageParam }) => listClients(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useClientUsage(id: string) {
  return useQuery({ queryKey: qk.clients.usage(id), queryFn: () => getClientUsage(id), enabled: !!id });
}

export function useClientActivity(id: string) {
  return useQuery({ queryKey: qk.clients.activity(id), queryFn: () => getClientActivity(id), enabled: !!id });
}
```

Create `src/api/hooks/useClient.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getClient } from '../clients';
import { qk } from '../queryKeys';

export function useClient(id: string) {
  return useQuery({ queryKey: qk.clients.detail(id), queryFn: () => getClient(id), enabled: !!id });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/clients.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/api/clients.ts src/api/hooks/useClients.ts src/api/hooks/useClient.ts src/api/clients.test.ts src/api/types.ts
git commit -m "feat(catreadmin): clients api + infinite/detail hooks"
```

---

### Task 5: Reports API (revenue + authed CSV download) + hook

**Files:**
- Create: `src/api/reports.ts`
- Create: `src/api/hooks/useRevenueReport.ts`
- Test: `src/api/reports.test.ts`

**Interfaces:**
- Consumes: `request` from `./client`, `tokenStore` from `../auth/tokenStore`, `config` from `../config`, `RevenueReport` from `./types`, `RevenueParams`/`qk` from `./queryKeys`, `ApiError` from `./ApiError`.
- Produces: `getRevenue(params): Promise<RevenueReport>`; `downloadClientsCsv(): Promise<Blob>`; `useRevenueReport(params)` → `UseQueryResult<RevenueReport>`.

- [ ] **Step 1: Write the failing test**

Create `src/api/reports.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRevenue, downloadClientsCsv } from './reports';
import { tokenStore } from '../auth/tokenStore';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

describe('getRevenue', () => {
  it('GETs /reports/revenue and unwraps data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { arr: 5 } }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getRevenue({});
    expect(out).toMatchObject({ arr: 5 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/reports/revenue');
  });
});

describe('downloadClientsCsv', () => {
  it('requests the CSV blob with the bearer token attached', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('id,name\n1,x', { status: 200, headers: { 'Content-Type': 'text/csv' } }));
    vi.stubGlobal('fetch', fetchMock);
    const blob = await downloadClientsCsv();
    expect(blob).toBeInstanceOf(Blob);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/reports/clients.csv');
  });

  it('throws ApiError on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(downloadClientsCsv()).rejects.toMatchObject({ status: 403 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/reports.test.ts`
Expected: FAIL — cannot find module `./reports`.

- [ ] **Step 3: Implement reports.ts and the hook**

Create `src/api/reports.ts`. The CSV endpoint returns a binary/text blob, not the JSON envelope `request()` expects, so it uses its own fetch and attaches the bearer manually:

```typescript
import { request } from './client';
import { ApiError } from './ApiError';
import { config } from '../config';
import { tokenStore } from '../auth/tokenStore';
import type { RevenueReport } from './types';
import type { RevenueParams } from './queryKeys';

export function getRevenue(params: RevenueParams): Promise<RevenueReport> {
  return request<RevenueReport>('/reports/revenue', { query: { ...params } });
}

export async function downloadClientsCsv(): Promise<Blob> {
  const token = tokenStore.getAccess();
  const res = await fetch(config.apiBaseUrl + '/reports/clients.csv', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'internal_error', `CSV export failed (${res.status})`, null);
  }
  return res.blob();
}
```

Create `src/api/hooks/useRevenueReport.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getRevenue } from '../reports';
import { qk, type RevenueParams } from '../queryKeys';

export function useRevenueReport(params: RevenueParams = {}) {
  return useQuery({ queryKey: qk.reports.revenue(params), queryFn: () => getRevenue(params) });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/api/reports.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api/reports.ts src/api/hooks/useRevenueReport.ts src/api/reports.test.ts
git commit -m "feat(catreadmin): reports api (revenue + authed csv) + hook"
```

---

### Task 6: `<QueryBoundary>` — shared loading/error/empty

**Files:**
- Create: `src/components/QueryBoundary.tsx`
- Test: `src/components/QueryBoundary.test.tsx`

**Interfaces:**
- Consumes: `ApiError` from `../api/ApiError`, `Empty` from `./index`, `Icon` from `../lib/icons`.
- Produces:
  ```typescript
  interface QueryBoundaryProps {
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
    isEmpty?: boolean;
    skeleton?: React.ReactNode;     // shown while isLoading; defaults to a generic "Loading…"
    emptyTitle?: string;
    emptyMessage?: React.ReactNode;
    children: React.ReactNode;       // shown only when loaded, no error, not empty
  }
  function QueryBoundary(props: QueryBoundaryProps): React.ReactElement
  ```
  Error precedence: `isLoading` → skeleton; else `isError` → error card (uses `ApiError.message` when `error instanceof ApiError`, else "Something went wrong"); else `isEmpty` → `<Empty>`; else `children`.

- [ ] **Step 1: Write the failing test**

Create `src/components/QueryBoundary.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryBoundary } from './QueryBoundary';
import { ApiError } from '../api/ApiError';

describe('QueryBoundary', () => {
  it('shows the skeleton while loading', () => {
    render(<QueryBoundary isLoading isError={false} skeleton={<div>skel</div>}><div>body</div></QueryBoundary>);
    expect(screen.getByText('skel')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('shows the ApiError message on error', () => {
    const err = new ApiError(404, 'not_found', 'Not available yet', null);
    render(<QueryBoundary isLoading={false} isError error={err}><div>body</div></QueryBoundary>);
    expect(screen.getByText('Not available yet')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('shows the empty state when isEmpty', () => {
    render(<QueryBoundary isLoading={false} isError={false} isEmpty emptyTitle="No clients"><div>body</div></QueryBoundary>);
    expect(screen.getByText('No clients')).toBeInTheDocument();
  });

  it('renders children when loaded', () => {
    render(<QueryBoundary isLoading={false} isError={false}><div>body</div></QueryBoundary>);
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/QueryBoundary.test.tsx`
Expected: FAIL — cannot find module `./QueryBoundary`.

- [ ] **Step 3: Implement QueryBoundary**

Create `src/components/QueryBoundary.tsx`:

```typescript
import React from 'react';
import { ApiError } from '../api/ApiError';
import { Empty } from './index';
import { Icon } from '../lib/icons';

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: React.ReactNode;
  children: React.ReactNode;
}

export function QueryBoundary({
  isLoading, isError, error, isEmpty, skeleton, emptyTitle, emptyMessage, children,
}: QueryBoundaryProps): React.ReactElement {
  if (isLoading) return <>{skeleton ?? <div className="muted" style={{ padding: 24 }}>Loading…</div>}</>;
  if (isError) {
    const msg = error instanceof ApiError ? error.message : 'Something went wrong';
    return (
      <Empty icon={Icon.warn} title="Couldn’t load this">
        {msg}
      </Empty>
    );
  }
  if (isEmpty) return <Empty title={emptyTitle ?? 'Nothing here yet'}>{emptyMessage}</Empty>;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/QueryBoundary.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/QueryBoundary.tsx src/components/QueryBoundary.test.tsx
git commit -m "feat(catreadmin): QueryBoundary loading/error/empty"
```

---

### Task 7: Dashboard + Health screens, wired into the router

**Files:**
- Create: `src/screens/DashboardScreen.tsx`
- Create: `src/screens/HealthScreen.tsx`
- Test: `src/screens/DashboardScreen.test.tsx`
- Modify: `src/App.tsx` (`renderScreen`)

**Interfaces:**
- Consumes: `useDashboardOverview` from `../api/hooks/useDashboardOverview`; `QueryBoundary`; `Charts` from `../lib/charts`; `StatusBadge`, `fmt`, `Avatar` from `../components`; `Icon`.
- Produces: `DashboardScreen()`, `HealthScreen()` components.

> **Visual gate:** the JSX below is functionally complete and uses the project design system. Reconcile card layout, class names, and copy against the imported `index.html` and `screenshots/` before checking Step 6.

- [ ] **Step 1: Write the failing test**

Create `src/screens/DashboardScreen.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardScreen } from './DashboardScreen';

vi.mock('../api/hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => ({
    isLoading: false, isError: false,
    data: {
      counts: { total: 12, active: 9, trial: 2, suspended: 1, cancelled: 0 },
      mrr: 250000, trials_ending: 2, churn_pct: 1.8,
      months: ['Jan', 'Feb', 'Mar'], mrr_series: [0, 0, 250000], signup_series: [1, 2, 3],
      plan_mix: [{ label: 'Gold', value: 9, color: '#f0b429' }],
      usage_alerts: [], system_health: [], recent_activity: [],
    },
  }),
}));

describe('DashboardScreen', () => {
  it('renders the MRR KPI from live data', () => {
    render(<DashboardScreen />);
    expect(screen.getByText(/2,50,000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx`
Expected: FAIL — cannot find module `./DashboardScreen`.

- [ ] **Step 3: Implement the screens**

Create `src/screens/DashboardScreen.tsx`:

```typescript
import React from 'react';
import { useDashboardOverview } from '../api/hooks/useDashboardOverview';
import { QueryBoundary } from '../components/QueryBoundary';
import { Charts } from '../lib/charts';
import { StatusBadge, fmt } from '../components';
import { Icon } from '../lib/icons';

// True when every value in a numeric series is zero — "not enough history yet" (handoff §8.2).
const allZero = (s: number[]) => s.length === 0 || s.every(v => v === 0);

export function DashboardScreen(): React.ReactElement {
  const q = useDashboardOverview();
  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}
        skeleton={<div className="muted" style={{ padding: 24 }}>Loading dashboard…</div>}>
        {q.data && (
          <>
            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Kpi label="MRR" value={fmt.money(q.data.mrr)} />
              <Kpi label="Active clients" value={fmt.num(q.data.counts.active)} />
              <Kpi label="Trials" value={fmt.num(q.data.counts.trial)} />
              <Kpi label="Trials ending" value={fmt.num(q.data.trials_ending)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <div className="row jb"><b>Recurring revenue</b><span className="muted tiny">{fmt.pct(q.data.churn_pct)} churn</span></div>
              {allZero(q.data.mrr_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Line data={q.data.mrr_series} labels={q.data.months} format={fmt.k} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Plan mix</b>
              <Charts.Donut data={q.data.plan_mix} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Signups</b>
              {allZero(q.data.signup_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Bars data={q.data.signup_series} labels={q.data.months} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Usage alerts</b>
              {q.data.usage_alerts.length === 0
                ? <p className="muted tiny" style={{ marginTop: 8 }}>No tenants over 80% usage.</p>
                : q.data.usage_alerts.map(a => (
                    <div key={a.tenant_id} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{a.name}</span>
                      <span className="row gap8"><StatusBadge status={a.status} /><b className="mono">{a.usage_pct}%</b></span>
                    </div>
                  ))}
            </div>

            <HealthPanel items={q.data.system_health} />
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 24, fontWeight: 750, marginTop: 6 }}>{value}</div>
    </div>
  );
}

export function HealthPanel({ items }: { items: { name: string; status: string; latency: string; uptime: string }[] }) {
  return (
    <div className="card" style={{ marginTop: 16, padding: 16 }}>
      <div className="row gap8"><Icon.activity size={16} /><b>System health</b></div>
      {items.length === 0
        ? <p className="muted tiny" style={{ marginTop: 8 }}>No health data.</p>
        : items.map(h => (
            <div key={h.name} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{h.name}</span>
              <span className="row gap10"><span className="tiny muted mono">{h.latency} · {h.uptime}</span><StatusBadge status={h.status} /></span>
            </div>
          ))}
    </div>
  );
}
```

Create `src/screens/HealthScreen.tsx` (reuses the same data source and the `HealthPanel`):

```typescript
import React from 'react';
import { useDashboardOverview } from '../api/hooks/useDashboardOverview';
import { QueryBoundary } from '../components/QueryBoundary';
import { HealthPanel } from './DashboardScreen';

export function HealthScreen(): React.ReactElement {
  const q = useDashboardOverview();
  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>System health</h1>
      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}>
        {q.data && <HealthPanel items={q.data.system_health} />}
      </QueryBoundary>
    </div>
  );
}
```

> If `Icon.activity` does not exist in `src/lib/icons.tsx`, substitute an existing icon (e.g. `Icon.support`); check the export list first.

- [ ] **Step 4: Wire the routes in `App.tsx`**

In `src/App.tsx`, add imports near the top:

```typescript
import { DashboardScreen } from './screens/DashboardScreen';
import { HealthScreen } from './screens/HealthScreen';
```

Replace the body of `renderScreen()` (currently the placeholder `<div className="page">…</div>`) so it switches on `route.name`, keeping the placeholder as the default:

```typescript
  const renderScreen = () => {
    const perm = ROUTE_PERM[route.name];
    if (perm && !can(perm)) return <Forbidden action={perm} />;
    switch (route.name) {
      case 'dashboard': return <DashboardScreen />;
      case 'health':    return <HealthScreen />;
      default: {
        const title = (CRUMB[route.name] || [route.name]).join(' / ');
        return (
          <div className="page">
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h1>
            <p className="muted" style={{ marginTop: 8 }}>This screen is bound in a later sub-project.</p>
          </div>
        );
      }
    }
  };
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Reconcile visuals, then commit**

Compare against the imported `index.html` / `screenshots/`; adjust markup/classes to match. Then:

```bash
git add src/screens/DashboardScreen.tsx src/screens/HealthScreen.tsx src/screens/DashboardScreen.test.tsx src/App.tsx
git commit -m "feat(catreadmin): dashboard + health screens bound live"
```

---

### Task 8: Clients list screen ("Load more" pagination)

**Files:**
- Create: `src/screens/ClientsScreen.tsx`
- Test: `src/screens/ClientsScreen.test.tsx`
- Modify: `src/App.tsx` (`renderScreen` — add `clients` case)

**Interfaces:**
- Consumes: `useClients` from `../api/hooks/useClients`; `QueryBoundary`; `Btn`, `StatusBadge`, `Segmented`, `fmt`, `SkeletonRows` from `../components`; `useNav` from `../components`; `Icon`.
- Produces: `ClientsScreen()`.

> **Visual gate** applies (table layout, filter bar, classes) — reconcile against `index.html`/`screenshots/`.

- [ ] **Step 1: Write the failing test**

Create `src/screens/ClientsScreen.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientsScreen } from './ClientsScreen';

vi.mock('../api/hooks/useClients', () => ({
  useClients: () => ({
    isLoading: false, isError: false,
    data: { pages: [{ data: [{ id: 'c1', name: 'Greenwood High', status: 'active', tier: 'gold', plan_name: 'Gold', mrr: 50000, last_active_days: 1 }], next_cursor: null }] },
    hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false,
  }),
}));

describe('ClientsScreen', () => {
  it('renders a client row from the first page', () => {
    render(<ClientsScreen />);
    expect(screen.getByText('Greenwood High')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/ClientsScreen.test.tsx`
Expected: FAIL — cannot find module `./ClientsScreen`.

- [ ] **Step 3: Implement the screen**

Create `src/screens/ClientsScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { useClients } from '../api/hooks/useClients';
import { QueryBoundary } from '../components/QueryBoundary';
import { Btn, StatusBadge, Segmented, fmt, SkeletonRows, useNav } from '../components';
import { Icon } from '../lib/icons';

const STATUS_OPTS = [
  { value: '', label: 'All' }, { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' }, { value: 'past_due', label: 'Past due' },
  { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' },
];

export function ClientsScreen(): React.ReactElement {
  const { go } = useNav();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const query = useClients({ status: status || undefined, q: q || undefined, sort: '-mrr' });
  const rows = query.data?.pages.flatMap(p => p.data) ?? [];

  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Clients</h1>

      <div className="row jb" style={{ margin: '16px 0', gap: 12, flexWrap: 'wrap' }}>
        <Segmented options={STATUS_OPTS} value={status} onChange={setStatus} />
        <div className="search-box">
          <Icon.search size={15} />
          <input placeholder="Search clients…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Status</th><th>Plan</th><th>MRR</th><th>Last active</th></tr>
          </thead>
          {query.isLoading
            ? <SkeletonRows cols={5} rows={8} />
            : (
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => go('client', { id: c.id })}>
                    <td><b>{c.name}</b></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{c.plan_name}</td>
                    <td className="mono">{fmt.money(c.mrr)}</td>
                    <td className="muted tiny">{c.last_active_days}d ago</td>
                  </tr>
                ))}
              </tbody>
            )}
        </table>

        <QueryBoundary
          isLoading={false}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && rows.length === 0}
          emptyTitle="No clients found"
          emptyMessage="Try clearing filters, or this endpoint may not be live yet.">
          <div className="row jb" style={{ padding: '12px 16px' }}>
            <span className="muted tiny">{rows.length} loaded</span>
            {query.hasNextPage && (
              <Btn variant="default" size="sm" disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}>
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Btn>
            )}
          </div>
        </QueryBoundary>
      </div>
    </div>
  );
}
```

> The `<table className="table">` and column markup must match the prototype's clients table — reconcile per the visual gate. If `styles.css` has no `.table`/`.kpi-grid` class, check the prototype's actual class names and use those.

- [ ] **Step 4: Wire the route in `App.tsx`**

Add the import and a `case 'clients'` to the `renderScreen()` switch from Task 7:

```typescript
import { ClientsScreen } from './screens/ClientsScreen';
// …inside switch:
      case 'clients': return <ClientsScreen />;
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/screens/ClientsScreen.test.tsx && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Reconcile visuals, then commit**

```bash
git add src/screens/ClientsScreen.tsx src/screens/ClientsScreen.test.tsx src/App.tsx
git commit -m "feat(catreadmin): clients list screen (load-more pagination)"
```

---

### Task 9: Client detail screen

**Files:**
- Create: `src/screens/ClientDetailScreen.tsx`
- Test: `src/screens/ClientDetailScreen.test.tsx`
- Modify: `src/App.tsx` (`renderScreen` — add `client` case)

**Interfaces:**
- Consumes: `useClient` from `../api/hooks/useClient`; `useClientUsage`, `useClientActivity` from `../api/hooks/useClients`; `QueryBoundary`; `useNav`, `StatusBadge`, `UsageBar`, `fmt` from `../components`; `Icon`.
- Produces: `ClientDetailScreen()`. Reads the client id from `useNav().route.params.id`.

> **Roster sub-view stays hidden** (handoff §8.3). **Visual gate** applies.

- [ ] **Step 1: Write the failing test**

Create `src/screens/ClientDetailScreen.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientDetailScreen } from './ClientDetailScreen';
import { NavCtx } from '../components';

vi.mock('../api/hooks/useClient', () => ({
  useClient: () => ({ isLoading: false, isError: false,
    data: { id: 'c1', name: 'Greenwood High', status: 'active', plan_name: 'Gold', mrr: 50000,
      tier: 'gold', country: 'Mumbai, MH', contact: 'a@b.c', csm: 'Ravi', health_score: 88 } }),
}));
vi.mock('../api/hooks/useClients', () => ({
  useClientUsage: () => ({ isLoading: false, isError: false, data: { students_count: 400, staff_count: 30, storage_gb: 12, limits: { students: 1000 }, usage_series: [1,2], usage_pct: 40 } }),
  useClientActivity: () => ({ isLoading: false, isError: false, data: { data: [], next_cursor: null } }),
}));

describe('ClientDetailScreen', () => {
  it('renders the client name from detail data', () => {
    render(<NavCtx.Provider value={{ route: { name: 'client', params: { id: 'c1' } }, go: () => {} }}><ClientDetailScreen /></NavCtx.Provider>);
    expect(screen.getByText('Greenwood High')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/ClientDetailScreen.test.tsx`
Expected: FAIL — cannot find module `./ClientDetailScreen`.

- [ ] **Step 3: Implement the screen**

Create `src/screens/ClientDetailScreen.tsx`:

```typescript
import React from 'react';
import { useClient } from '../api/hooks/useClient';
import { useClientUsage, useClientActivity } from '../api/hooks/useClients';
import { QueryBoundary } from '../components/QueryBoundary';
import { useNav, StatusBadge, UsageBar, fmt } from '../components';
import { Icon } from '../lib/icons';

export function ClientDetailScreen(): React.ReactElement {
  const { route, go } = useNav();
  const id = String(route.params.id ?? '');
  const detail = useClient(id);
  const usage = useClientUsage(id);
  const activity = useClientActivity(id);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => go('clients')} style={{ marginBottom: 12 }}>
        <Icon.chevLeft size={14} /> Back to clients
      </button>

      <QueryBoundary isLoading={detail.isLoading} isError={detail.isError} error={detail.error}>
        {detail.data && (
          <>
            <div className="row jb">
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>{detail.data.name}</h1>
                <div className="muted tiny" style={{ marginTop: 4 }}>{detail.data.country} · CSM {detail.data.csm}</div>
              </div>
              <StatusBadge status={detail.data.status} />
            </div>

            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Stat label="Plan" value={detail.data.plan_name} />
              <Stat label="MRR" value={fmt.money(detail.data.mrr)} />
              <Stat label="Health" value={String(detail.data.health_score)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Usage</b>
              <QueryBoundary isLoading={usage.isLoading} isError={usage.isError} error={usage.error}>
                {usage.data && (
                  <div style={{ marginTop: 10 }}>
                    <UsageBar label="Students" value={usage.data.students_count} limit={usage.data.limits.students ?? usage.data.students_count} />
                    <div className="row gap16 muted tiny" style={{ marginTop: 8 }}>
                      <span>Staff {fmt.num(usage.data.staff_count)}</span>
                      <span>Storage {usage.data.storage_gb} GB</span>
                      <span>{usage.data.usage_pct}% of plan</span>
                    </div>
                  </div>
                )}
              </QueryBoundary>
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Activity</b>
              <QueryBoundary
                isLoading={activity.isLoading} isError={activity.isError} error={activity.error}
                isEmpty={!activity.isLoading && (activity.data?.data.length ?? 0) === 0}
                emptyTitle="No activity yet">
                {activity.data && activity.data.data.map(a => (
                  <div key={a.id} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{a.action}</span>
                    <span className="muted tiny">{a.actor_name}</span>
                  </div>
                ))}
              </QueryBoundary>
            </div>

            {/* Student/staff roster intentionally hidden — Phase-2 / impersonation (handoff §8.3). */}
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the route in `App.tsx`**

```typescript
import { ClientDetailScreen } from './screens/ClientDetailScreen';
// …inside switch:
      case 'client': return <ClientDetailScreen />;
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/screens/ClientDetailScreen.test.tsx && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Reconcile visuals, then commit**

```bash
git add src/screens/ClientDetailScreen.tsx src/screens/ClientDetailScreen.test.tsx src/App.tsx
git commit -m "feat(catreadmin): client detail screen (roster hidden)"
```

---

### Task 10: Reports screen (revenue + CSV export) + final verification

**Files:**
- Create: `src/screens/ReportsScreen.tsx`
- Test: `src/screens/ReportsScreen.test.tsx`
- Modify: `src/App.tsx` (`renderScreen` — add `reports` case)

**Interfaces:**
- Consumes: `useRevenueReport` from `../api/hooks/useRevenueReport`; `downloadClientsCsv` from `../api/reports`; `QueryBoundary`; `Btn`, `fmt`, `useToast` from `../components`; `Charts`; `Icon`.
- Produces: `ReportsScreen()`.

> **Visual gate** applies. The CSV button triggers `downloadClientsCsv()` and saves the blob via a temporary `<a download>`; on failure it shows an error toast.

- [ ] **Step 1: Write the failing test**

Create `src/screens/ReportsScreen.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsScreen } from './ReportsScreen';

vi.mock('../api/hooks/useRevenueReport', () => ({
  useRevenueReport: () => ({ isLoading: false, isError: false,
    data: { arr: 3000000, net_growth: 12, gross_churn_pct: 1.8, arpa: 25000,
      months: ['Jan','Feb'], revenue_series: [0, 3000000],
      revenue_by_plan: [{ label: 'Gold', value: 9, color: '#f0b429' }],
      plan_performance: [{ plan_name: 'Gold', clients: 9, mrr: 250000, share_pct: 80 }] } }),
}));

describe('ReportsScreen', () => {
  it('renders ARR from revenue data', () => {
    render(<ReportsScreen />);
    expect(screen.getByText(/30,00,000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/ReportsScreen.test.tsx`
Expected: FAIL — cannot find module `./ReportsScreen`.

- [ ] **Step 3: Implement the screen**

Create `src/screens/ReportsScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { useRevenueReport } from '../api/hooks/useRevenueReport';
import { downloadClientsCsv } from '../api/reports';
import { QueryBoundary } from '../components/QueryBoundary';
import { Btn, fmt, useToast } from '../components';
import { Charts } from '../lib/charts';
import { Icon } from '../lib/icons';

const allZero = (s: number[]) => s.length === 0 || s.every(v => v === 0);

export function ReportsScreen(): React.ReactElement {
  const q = useRevenueReport();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const blob = await downloadClientsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'clients.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', kind: 'success' });
    } catch {
      toast({ title: 'Export failed', msg: 'Could not download the CSV.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="row jb">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reports</h1>
        <Btn variant="default" icon={Icon.download} disabled={busy} onClick={exportCsv}>
          {busy ? 'Exporting…' : 'Export clients CSV'}
        </Btn>
      </div>

      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}>
        {q.data && (
          <>
            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Stat label="ARR" value={fmt.money(q.data.arr)} />
              <Stat label="ARPA" value={fmt.money(q.data.arpa)} />
              <Stat label="Net growth" value={fmt.pct(q.data.net_growth)} />
              <Stat label="Gross churn" value={fmt.pct(q.data.gross_churn_pct)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Revenue</b>
              {allZero(q.data.revenue_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Line data={q.data.revenue_series} labels={q.data.months} format={fmt.k} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Revenue by plan</b>
              <Charts.Donut data={q.data.revenue_by_plan} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Plan performance</b>
              <table className="table" style={{ marginTop: 8 }}>
                <thead><tr><th>Plan</th><th>Clients</th><th>MRR</th><th>Share</th></tr></thead>
                <tbody>
                  {q.data.plan_performance.map(p => (
                    <tr key={p.plan_name}>
                      <td><b>{p.plan_name}</b></td>
                      <td>{fmt.num(p.clients)}</td>
                      <td className="mono">{fmt.money(p.mrr)}</td>
                      <td>{fmt.pct(p.share_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 750, marginTop: 6 }}>{value}</div>
    </div>
  );
}
```

> If `Icon.download` is absent, pick an existing icon from `src/lib/icons.tsx`.

- [ ] **Step 4: Wire the route in `App.tsx`**

```typescript
import { ReportsScreen } from './screens/ReportsScreen';
// …inside switch:
      case 'reports': return <ReportsScreen />;
```

- [ ] **Step 5: Run the full suite + typecheck + build**

Run: `npm run test && npm run typecheck && npm run build`
Expected: all green; build succeeds.

- [ ] **Step 6: Local e2e smoke (manual)**

Start the backend (`cd ../sms-backend && dotnet run --project src/Sms.Api`), set `.env` `VITE_API_BASE_URL=http://localhost:5162/v1`, run `npm run dev`, log in via email-OTP, and confirm:
- **Dashboard** + **Reports** render real data from the live endpoints.
- **Clients** shows clean loading → empty/error (endpoints not yet live), not a crash.
- Switching roles still gates nav (unchanged shell).

- [ ] **Step 7: Reconcile visuals, then commit**

```bash
git add src/screens/ReportsScreen.tsx src/screens/ReportsScreen.test.tsx src/App.tsx
git commit -m "feat(catreadmin): reports screen (revenue + csv export)"
```

---

## Self-Review

**Spec coverage:**
- Dashboard ← `/dashboard/overview` → Task 3 (api/hook) + Task 7 (screen). ✓
- Health ← same payload → Task 7 (`HealthPanel`/`HealthScreen`). ✓
- Clients list ← `/clients` cursor + filter/sort → Task 4 + Task 8 (Load more). ✓
- Client detail ← `/clients/{id}` + `/usage` + `/activity`, roster hidden → Task 4 + Task 9. ✓
- Reports ← `/reports/revenue` + `/reports/clients.csv` → Task 5 + Task 10. ✓
- `<QueryBoundary>` (loading/error/empty) → Task 6, used by every screen. ✓
- Length-agnostic charts + "not enough history yet" → `allZero` helper in Tasks 7 & 10. ✓
- Contract test covers new DTO keys → Task 1. ✓
- Clean degradation for not-yet-live Clients → QueryBoundary error/empty in Tasks 8 & 9 + e2e smoke (Task 10 Step 6). ✓
- Routes flipped, other five stay placeholders → `renderScreen` switch (Tasks 7–10). ✓

**Placeholder scan:** No "TBD/TODO". The "visual gate" notes are deliberate reconciliation steps (the design file requires `/design-login`), not unfinished code — every screen has complete, working baseline JSX.

**Type consistency:** `getOverview/getRevenue/listClients/getClient/getClientUsage/getClientActivity/downloadClientsCsv` names match between api files, hooks, and screens. `qk` key methods match Task 2 ↔ hooks. DTO field names (`mrr_series`, `signup_series`, `usage_pct`, `plan_performance`, `revenue_by_plan`) match the contract verbatim. `Client` is defined once in `types.ts` (Task 4 Step 3) and consumed by `clients.ts` and the screens.

**Known follow-ups (out of scope, sub-project 3):** mutations, Onboarding/Billing/Support/Team/Settings/Identity, deleting mock adapters.
