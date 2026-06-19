# Billing — Plans · Subscriptions · Invoices (Slice 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the Billing surface (Plans full CRUD, Subscriptions read, Invoices mark-paid/refund) to the live backend, ported 1:1 from `screen-billing.jsx`, design unchanged.

**Architecture:** Static feature catalog (ported from `data.jsx`) + typed DTOs → api functions → TanStack query/mutation hooks → ported billing components behind a `BillingScreen` shell wired to the `plans` and `billing` routes. Reuses the slice-3a mutation→invalidation→toast + `ConfirmDialog` pattern.

**Tech Stack:** React 18 + TypeScript, Vite, `@tanstack/react-query` v5, Vitest + `@testing-library/react`.

## Global Constraints

- **JSON snake_case**, request and response. Money INR via `fmt.money`.
- **Base URL already includes `/v1`** — paths like `/plans`, `/invoices`; never prefix `/v1`.
- Single responses via `request<T>` (unwraps `.data`, throws `ApiError`, refresh-on-401). Lists via `listRequest<ListEnvelope<T>>` (raw envelope).
- **Mutations:** `useMutation` + `useQueryClient().invalidateQueries`; **toast at the call site** via `mutate(vars, { onSuccess, onError })`. Hooks stay invalidation-only.
- **RBAC UI-gating only** via `useAuth().can(perm)`. Keys used: `plans.view`, `plans.manage`, `billing.view`, `billing.manage_invoice`, `billing.refund` (all already in `src/auth/rbac.ts`).
- **Keep design unchanged.** Port prototype markup/classes verbatim. Recover source with `git show '5660fb0^:<file>'` (`screen-billing.jsx`, `data.jsx`). Convert `React.createElement(...)` → JSX; convert `window.X` globals → real imports.
- **Prototype→DTO field mapping** (the live `Plan` DTO follows `PLAN_KEYS`): `p.desc`→`p.description`; `p.perStudent`→`p.per_student`; `p.minStudents`→`p.min_students`. Prototype-only fields **absent from the contract** — `popular`, `active`, `featureTiers` on the read DTO — are **dropped** from card rendering (no Popular badge; no active-dimming). The editor still collects `feature_tiers` and sends it in the write body as a flagged assumption.
- **No new dependencies.**
- Every task ends green: `npm test`, `npm run typecheck` (`tsc -b`).
- Do NOT touch the pre-existing uncommitted changes (`App.test.tsx`, `LoginScreen.tsx`, `styles.css`).

---

### Task 1: Static feature catalog (`src/lib/featureCatalog.ts`)

**Files:**
- Create: `src/lib/featureCatalog.ts`
- Test: `src/lib/featureCatalog.test.ts`

**Interfaces — Produces:**
- `TIER_META: Record<'silver'|'gold'|'platinum', { label: string; rank: number; color: string }>`
- `FEATURE_CATALOG: Record<string, { label: string; section: string; tier: FeatureTier; note: string }>`
- `FEATURE_LABELS / FEATURE_TIER / FEATURE_NOTE: Record<string,string>` (derived)
- `FEATURE_GROUPS: { title: string; codes: string[] }[]`
- `featuresForTier(tier: FeatureTier): string[]`
- `type FeatureTier = 'silver'|'gold'|'platinum'`

**Recovery:** the exact catalog content is in `git show '5660fb0^:data.jsx'` lines 135–195 (`TIER_META`, `FEATURE_CATALOG`, the four `Object.fromEntries` derived maps, `SECTIONS`, `FEATURE_GROUPS`, `featuresForTier`). Port verbatim — same codes, labels, sections, tiers, notes.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { FEATURE_CATALOG, FEATURE_LABELS, FEATURE_GROUPS, featuresForTier, TIER_META } from './featureCatalog';

describe('featureCatalog', () => {
  it('derives labels and groups from the catalog', () => {
    expect(FEATURE_LABELS['sis.students']).toBe('Students (SIS)');
    expect(TIER_META.gold.rank).toBe(2);
    const academic = FEATURE_GROUPS.find(g => g.title === 'Academic');
    expect(academic?.codes).toContain('attendance');
  });
  it('featuresForTier is cumulative by rank', () => {
    const silver = featuresForTier('silver');
    const platinum = featuresForTier('platinum');
    expect(silver).toContain('sis.students');           // silver module
    expect(silver).not.toContain('hr.payroll');         // platinum module excluded at silver
    expect(platinum).toContain('hr.payroll');            // included at platinum
    expect(platinum.length).toBeGreaterThan(silver.length);
    expect(Object.keys(FEATURE_CATALOG).length).toBe(platinum.length); // platinum unlocks all
  });
});
```

- [ ] **Step 2: Run test → fail** (`npm test -- src/lib/featureCatalog.test.ts`) — module missing.
- [ ] **Step 3: Implement** — port the catalog from `data.jsx` (recovery above) to typed TS. Type `FeatureTier`, type the derived maps, export all symbols listed under Produces. No `window.*`.
- [ ] **Step 4: Run test → pass.** Also `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/lib/featureCatalog.ts src/lib/featureCatalog.test.ts
git commit -m "feat(catreadmin): port static feature catalog + tier meta (3b)"
```

---

### Task 2: Billing DTOs & contract

**Files:**
- Modify: `src/api/types.ts`
- Test: `src/api/types.test.ts`

**Interfaces — Produces:**
- `Invoice` (aligned to existing `INVOICE_KEYS`): `{ id, tenant_id, tenant_name, plan_name, amount, status, issued, due, paid_on }`, `status: InvoiceStatus`
- `type InvoiceStatus = 'paid' | 'open' | 'past_due'`
- `Subscription`: `{ id, tenant_id, tenant_name, plan_id, plan_name, tier, status, current_period_start, current_period_end, next_charge }`
- `type FeatureTier` is in `featureCatalog.ts` — do not redefine here
- `CreatePlanBody` / `UpdatePlanBody` (snake_case write shape)
- new `CONTRACT_KEYS.SUBSCRIPTION_KEYS`

- [ ] **Step 1: Write the failing test** — append to `src/api/types.test.ts` (extend the `EXPECTED` map with `SUBSCRIPTION_KEYS` and add interface-coverage asserts):

```ts
// add to EXPECTED:
  SUBSCRIPTION_KEYS: ['id','tenant_id','tenant_name','plan_id','plan_name','tier','status',
    'current_period_start','current_period_end','next_charge'],
```

```ts
import { CONTRACT_KEYS, type Invoice, type Subscription } from './types';

describe('billing DTOs', () => {
  it('Invoice covers INVOICE_KEYS', () => {
    const k: Record<keyof Invoice, true> = {
      id:true, tenant_id:true, tenant_name:true, plan_name:true, amount:true,
      status:true, issued:true, due:true, paid_on:true };
    expect(Object.keys(k).sort()).toEqual([...CONTRACT_KEYS.INVOICE_KEYS].sort());
  });
  it('Subscription covers SUBSCRIPTION_KEYS', () => {
    const k: Record<keyof Subscription, true> = {
      id:true, tenant_id:true, tenant_name:true, plan_id:true, plan_name:true, tier:true,
      status:true, current_period_start:true, current_period_end:true, next_charge:true };
    expect(Object.keys(k).sort()).toEqual([...CONTRACT_KEYS.SUBSCRIPTION_KEYS].sort());
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** — append to `src/api/types.ts`:

```ts
export type InvoiceStatus = 'paid' | 'open' | 'past_due';

export interface Invoice {
  id: string; tenant_id: string; tenant_name: string; plan_name: string;
  amount: number; status: InvoiceStatus; issued: string; due: string; paid_on: string | null;
}

export interface Subscription {
  id: string; tenant_id: string; tenant_name: string; plan_id: string; plan_name: string;
  tier: Tier; status: ClientStatus;
  current_period_start: string; current_period_end: string; next_charge: number | null;
}

export interface CreatePlanBody {
  name: string; band: string; pricing: 'flat' | 'per_student';
  price: number; per_student: number; min_students: number; period: string;
  limits: { students: number; staff: number; storage_gb: number };
  features: string[]; feature_tiers: Record<string, string>;
  visibility: 'published' | 'draft'; audience: 'all' | 'new' | 'exclusive';
  offer: { label: string; pct: number } | null;
}
export type UpdatePlanBody = CreatePlanBody;
```

Add `SUBSCRIPTION_KEYS` to the `CONTRACT_KEYS` object literal (same array as in the test).

- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/api/types.ts src/api/types.test.ts
git commit -m "feat(catreadmin): Invoice/Subscription DTOs + plan write bodies (3b)"
```

> **⚠️ Flagged:** `Subscription` shape and `feature_tiers` in the plan body are assumed — verify against the live swagger; adjust here if the backend differs.

---

### Task 3: Plans write API (`createPlan`/`getPlan`/`updatePlan`/`publishPlan`)

**Files:**
- Modify: `src/api/plans.ts`
- Test: `src/api/plans.test.ts`

**Interfaces — Produces:**
- `createPlan(body: CreatePlanBody): Promise<Plan>` → `POST /plans`
- `getPlan(id: string): Promise<Plan>` → `GET /plans/{id}`
- `updatePlan(id: string, body: UpdatePlanBody): Promise<Plan>` → `PATCH /plans/{id}`
- `publishPlan(id: string, publish: boolean): Promise<Plan>` → `POST /plans/{id}/publish`, body `{ publish }`

- [ ] **Step 1: Write the failing test** — append to `src/api/plans.test.ts`:

```ts
import { createPlan, getPlan, updatePlan, publishPlan } from './plans';

const body = { name: 'X', band: '', pricing: 'flat' as const, price: 1000, per_student: 0,
  min_students: 0, period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 },
  features: [], feature_tiers: {}, visibility: 'draft' as const, audience: 'all' as const, offer: null };

describe('plan writes', () => {
  it('createPlan POSTs /plans', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await createPlan(body);
    const [u, i] = f.mock.calls[0]; expect(String(u)).toContain('/plans'); expect(i.method).toBe('POST');
    expect(JSON.parse(i.body)).toEqual(body);
  });
  it('getPlan GETs /plans/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await getPlan('pl_1'); expect(String(f.mock.calls[0][0])).toContain('/plans/pl_1');
  });
  it('updatePlan PATCHes /plans/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await updatePlan('pl_1', body); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/plans/pl_1'); expect(i.method).toBe('PATCH');
  });
  it('publishPlan POSTs /plans/{id}/publish with { publish }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await publishPlan('pl_1', true); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/plans/pl_1/publish'); expect(JSON.parse(i.body)).toEqual({ publish: true });
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** — extend imports in `src/api/plans.ts` to include `request` and the new types, append:

```ts
import { request, listRequest } from './client';
import type { Plan, ListEnvelope, CreatePlanBody, UpdatePlanBody } from './types';

export function createPlan(body: CreatePlanBody): Promise<Plan> {
  return request<Plan>('/plans', { method: 'POST', body });
}
export function getPlan(id: string): Promise<Plan> {
  return request<Plan>(`/plans/${id}`);
}
export function updatePlan(id: string, body: UpdatePlanBody): Promise<Plan> {
  return request<Plan>(`/plans/${id}`, { method: 'PATCH', body });
}
export function publishPlan(id: string, publish: boolean): Promise<Plan> {
  return request<Plan>(`/plans/${id}/publish`, { method: 'POST', body: { publish } });
}
```

(Keep the existing `listPlans`.)

- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/api/plans.ts src/api/plans.test.ts
git commit -m "feat(catreadmin): plan write api (create/get/update/publish) (3b)"
```

---

### Task 4: Subscriptions + Invoices API

**Files:**
- Create: `src/api/subscriptions.ts`, `src/api/invoices.ts`
- Modify: `src/api/queryKeys.ts`
- Test: `src/api/subscriptions.test.ts`, `src/api/invoices.test.ts`

**Interfaces — Produces:**
- `listSubscriptions(cursor?): Promise<ListEnvelope<Subscription>>` → `GET /subscriptions`
- `listInvoices(params, cursor?): Promise<ListEnvelope<Invoice>>` → `GET /invoices` (param `status?`)
- `getInvoice(id): Promise<Invoice>` → `GET /invoices/{id}`
- `markInvoicePaid(id): Promise<Invoice>` → `POST /invoices/{id}/mark-paid`
- `refundInvoice(id): Promise<Invoice>` → `POST /invoices/{id}/refund`
- query keys: `qk.plans.detail(id)`, `qk.subscriptions.list()`, `qk.invoices.list(params)`, `qk.invoices.detail(id)`

- [ ] **Step 1: Write the failing tests**

`src/api/subscriptions.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listSubscriptions } from './subscriptions';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('listSubscriptions', () => {
  it('GETs /subscriptions returning the envelope', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 's1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await listSubscriptions(); expect(out).toEqual({ data: [{ id: 's1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/subscriptions');
  });
});
```

`src/api/invoices.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listInvoices, getInvoice, markInvoicePaid, refundInvoice } from './invoices';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('invoices api', () => {
  it('listInvoices passes status + cursor', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'in1' }], next_cursor: 'n' })); vi.stubGlobal('fetch', f);
    await listInvoices({ status: 'past_due' }, 'c1'); const u = String(f.mock.calls[0][0]);
    expect(u).toContain('/invoices'); expect(u).toContain('status=past_due'); expect(u).toContain('cursor=c1');
  });
  it('getInvoice GETs /invoices/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1' } })); vi.stubGlobal('fetch', f);
    await getInvoice('in1'); expect(String(f.mock.calls[0][0])).toContain('/invoices/in1');
  });
  it('markInvoicePaid POSTs /invoices/{id}/mark-paid', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1', status: 'paid' } })); vi.stubGlobal('fetch', f);
    await markInvoicePaid('in1'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/invoices/in1/mark-paid'); expect(i.method).toBe('POST');
  });
  it('refundInvoice POSTs /invoices/{id}/refund', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1', status: 'open' } })); vi.stubGlobal('fetch', f);
    await refundInvoice('in1'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/invoices/in1/refund'); expect(i.method).toBe('POST');
  });
});
```

- [ ] **Step 2: Run tests → fail.**
- [ ] **Step 3: Implement**

`src/api/subscriptions.ts`:
```ts
import { listRequest } from './client';
import type { Subscription, ListEnvelope } from './types';

export function listSubscriptions(cursor?: string): Promise<ListEnvelope<Subscription>> {
  return listRequest<ListEnvelope<Subscription>>('/subscriptions', { query: { cursor } });
}
```

`src/api/invoices.ts`:
```ts
import { request, listRequest } from './client';
import type { Invoice, ListEnvelope } from './types';

export interface InvoicesListParams { status?: string; limit?: number; }

export function listInvoices(params: InvoicesListParams, cursor?: string): Promise<ListEnvelope<Invoice>> {
  return listRequest<ListEnvelope<Invoice>>('/invoices', { query: { ...params, limit: params.limit ?? 50, cursor } });
}
export function getInvoice(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}`);
}
export function markInvoicePaid(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}/mark-paid`, { method: 'POST' });
}
export function refundInvoice(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}/refund`, { method: 'POST' });
}
```

Add to `qk` in `src/api/queryKeys.ts` (and an `InvoicesListParams` re-use is fine):
```ts
  plans: {
    list: () => ['plans', 'list'] as const,
    detail: (id: string) => ['plans', 'detail', id] as const,
  },
  subscriptions: {
    list: () => ['subscriptions', 'list'] as const,
  },
  invoices: {
    list: (params: { status?: string }) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
```
(Merge `detail` into the existing `plans` block — keep `list`.)

- [ ] **Step 4: Run tests → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/api/subscriptions.ts src/api/invoices.ts src/api/queryKeys.ts src/api/subscriptions.test.ts src/api/invoices.test.ts
git commit -m "feat(catreadmin): subscriptions + invoices api + query keys (3b)"
```

---

### Task 5: Plan mutation hooks

**Files:**
- Create: `src/api/hooks/usePlanMutations.ts`
- Test: `src/api/hooks/usePlanMutations.test.tsx`

**Interfaces — Produces:**
- `useCreatePlan()` → `mutate(body: CreatePlanBody)`; invalidates `['plans','list']`.
- `useUpdatePlan(id)` → `mutate(body: UpdatePlanBody)`; invalidates `['plans','list']` + `qk.plans.detail(id)`.
- `usePublishPlan(id)` → `mutate(publish: boolean)`; invalidates `['plans','list']` + `qk.plans.detail(id)`.

- [ ] **Step 1: Write the failing test** (mirror slice-3a `useClientMutations.test.tsx`):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../plans', () => ({
  createPlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
  updatePlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
  publishPlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
}));
import { usePublishPlan } from './usePlanMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe('usePublishPlan', () => {
  it('invalidates plans list + detail on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => usePublishPlan('pl_1'), { wrapper: wrapper(qc) });
    result.current.mutate(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['plans', 'list'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['plans', 'detail', 'pl_1'] });
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan, updatePlan, publishPlan } from '../plans';
import { qk } from '../queryKeys';
import type { CreatePlanBody, UpdatePlanBody } from '../types';

const LIST = ['plans', 'list'] as const;

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: CreatePlanBody) => createPlan(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
export function useUpdatePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: UpdatePlanBody) => updatePlan(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); qc.invalidateQueries({ queryKey: qk.plans.detail(id) }); } });
}
export function usePublishPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (publish: boolean) => publishPlan(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); qc.invalidateQueries({ queryKey: qk.plans.detail(id) }); } });
}
```

- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/api/hooks/usePlanMutations.ts src/api/hooks/usePlanMutations.test.tsx
git commit -m "feat(catreadmin): plan mutation hooks (3b)"
```

---

### Task 6: Subscriptions/Invoices query hooks + invoice mutation hooks

**Files:**
- Create: `src/api/hooks/useSubscriptions.ts`, `src/api/hooks/useInvoices.ts`, `src/api/hooks/useInvoiceMutations.ts`
- Test: `src/api/hooks/useInvoiceMutations.test.tsx`

**Interfaces — Produces:**
- `useSubscriptions()` → `useInfiniteQuery` on `qk.subscriptions.list()`, `queryFn` `({pageParam}) => listSubscriptions(pageParam)`.
- `useInvoices(params)` → `useInfiniteQuery` on `qk.invoices.list(params)`.
- `useMarkInvoicePaid()` → `mutate(id: string)`; invalidates `['invoices','list']`.
- `useRefundInvoice()` → `mutate(id: string)`; invalidates `['invoices','list']`.

- [ ] **Step 1: Write the failing test** (`useInvoiceMutations.test.tsx`, mirror Task 5 shape):

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('../invoices', () => ({
  markInvoicePaid: vi.fn().mockResolvedValue({ id: 'in1', status: 'paid' }),
  refundInvoice: vi.fn().mockResolvedValue({ id: 'in1', status: 'open' }),
}));
import { useMarkInvoicePaid } from './useInvoiceMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
describe('useMarkInvoicePaid', () => {
  it('invalidates invoices list on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper: wrapper(qc) });
    result.current.mutate('in1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['invoices', 'list'] });
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement**

`useSubscriptions.ts`:
```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { listSubscriptions } from '../subscriptions';
import { qk } from '../queryKeys';
export function useSubscriptions() {
  return useInfiniteQuery({
    queryKey: qk.subscriptions.list(),
    queryFn: ({ pageParam }) => listSubscriptions(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
```

`useInvoices.ts`:
```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { listInvoices, type InvoicesListParams } from '../invoices';
import { qk } from '../queryKeys';
export function useInvoices(params: InvoicesListParams) {
  return useInfiniteQuery({
    queryKey: qk.invoices.list(params),
    queryFn: ({ pageParam }) => listInvoices(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
```

`useInvoiceMutations.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markInvoicePaid, refundInvoice } from '../invoices';
const LIST = ['invoices', 'list'] as const;
export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => markInvoicePaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
export function useRefundInvoice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => refundInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
```

- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/api/hooks/useSubscriptions.ts src/api/hooks/useInvoices.ts src/api/hooks/useInvoiceMutations.ts src/api/hooks/useInvoiceMutations.test.tsx
git commit -m "feat(catreadmin): subscriptions/invoices query + invoice mutation hooks (3b)"
```

---

### Task 7: `PlanEditModal` component (port)

**Files:**
- Create: `src/components/billing/PlanEditModal.tsx`
- Test: `src/components/billing/PlanEditModal.test.tsx`
- Recover: `git show '5660fb0^:screen-billing.jsx'` → `PlanEditModal` function.

**Interfaces:**
- Consumes: `featureCatalog` exports (Task 1); `Modal`, `Btn`, `fmt` (`components`); `Icon` (`lib/icons`); `Plan`, `CreatePlanBody` (types).
- Produces: `export function PlanEditModal({ plan, onClose, onSave }: { plan: PlanDraft; onClose: () => void; onSave: (body: CreatePlanBody) => void }): React.ReactElement`
  where `PlanDraft` is `Plan | (partial new-plan seed)`. Define a local `PlanDraft` type covering the editable fields (name, band, pricing, price, per_student, min_students, period, limits, features, feature_tiers, visibility, audience, offer).

**Port spec:** Convert the prototype `PlanEditModal` `React.createElement` tree to JSX verbatim (same classes/markup: `modal-head`, `field`, `chip`, `switch`, the feature-group grid, the silver/gold/platinum tier pills). Replace `window.{FEATURE_LABELS,FEATURE_GROUPS,FEATURE_NOTE,TIER_META,fmt,Icon,Modal}` with imports from Task 1 / `components` / `lib/icons`. Replace `window.DB.PLANS`/`window.DB.FEATURE_TIER`/`window.DB.FEATURE_GROUPS` with: tier-copy shortcuts use `featuresForTier(tier)` (instead of `t.features`); the per-code fallback tier uses `FEATURE_TIER[code]`. State field names map to snake_case (`per_student`, `min_students`, `feature_tiers`). `onSave` is called with the assembled `CreatePlanBody` (the parent owns persistence). Drop the `featureTiers` legacy fallbacks; use `feature_tiers` consistently.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanEditModal } from './PlanEditModal';

const seed = { name: '', band: '', pricing: 'flat' as const, price: 0, per_student: 10, min_students: 100,
  period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 }, features: [], feature_tiers: {},
  visibility: 'draft' as const, audience: 'all' as const, offer: null };

describe('PlanEditModal', () => {
  it('disables Save until a name is entered, then calls onSave with the body', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={seed} onClose={() => {}} onSave={onSave} />);
    const save = screen.getByText('Save plan');
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/plan name|e\.g\./i) ?? screen.getAllByRole('textbox')[0], { target: { value: 'Diamond' } });
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].name).toBe('Diamond');
  });
});
```
> If the name input has no placeholder in the prototype, target the first textbox. Adjust the selector to match the port.

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** the port per the Port spec above.
- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/components/billing/PlanEditModal.tsx src/components/billing/PlanEditModal.test.tsx
git commit -m "feat(catreadmin): port PlanEditModal to TSX (3b)"
```

---

### Task 8: `PlansTab` component (port + wire create/edit/publish)

**Files:**
- Create: `src/components/billing/PlansTab.tsx`
- Test: `src/components/billing/PlansTab.test.tsx`
- Recover: `git show '5660fb0^:screen-billing.jsx'` → `PlansTab`.

**Interfaces:**
- Consumes: `usePlans` (existing), `useCreatePlan`/`useUpdatePlan`/`usePublishPlan` (Task 5), `useAuth`, `useToast`, `Btn`, `fmt`, `Icon`, `FEATURE_LABELS`, `PlanEditModal` (Task 7), `ApiError`, `Plan`.
- Produces: `export function PlansTab(): React.ReactElement`

**Port spec:** Convert `PlansTab` to JSX. Source the list from `usePlans().data?.data ?? []` (not local `DB.PLANS` state — the server is the source of truth; refetch via invalidation). Filter tabs/counts compute over the fetched list (visibility/audience). Card rendering uses the DTO mapping (`description`, `per_student`/`min_students`, `limits`, `features` via `FEATURE_LABELS`, `offer`, `color`, `band`); **drop the Popular badge and active-dimming** (not in DTO). Gate `New plan`/`Edit`/`Publish` on `can('plans.manage')`. Wire:
- New plan → open `PlanEditModal` with a seed; on save → `useCreatePlan().mutate(body, { onSuccess: toast+close, onError: toast(ApiError.message) })`.
- Edit → open `PlanEditModal` with the plan (mapped to the draft shape); on save → `useUpdatePlan(plan.id).mutate(body, …)`.
- Publish/Unpublish button → `usePublishPlan(plan.id).mutate(plan.visibility !== 'published', { onSuccess: toast, onError: toast })`.
Use `<QueryBoundary>` around the grid for loading/error/empty.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlansTab } from './PlansTab';
import { ToastCtx } from '../index';

vi.mock('../../api/hooks/usePlans', () => ({ usePlans: () => ({ isLoading: false, isError: false, data: { data: [
  { id: 'pl_g', name: 'Gold', description: 'Best', price: 50000, per_student: 0, min_students: 0,
    pricing: 'flat', period: 'month', color: '#caa', band: 'Mid', visibility: 'published', audience: 'all',
    features: ['sis.students'], limits: { students: 1000, staff: 80, storage_gb: 50 }, offer: null, tier: 'gold' },
] } }) }));
vi.mock('../../api/hooks/usePlanMutations', () => ({
  useCreatePlan: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePlan: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('PlansTab', () => {
  it('renders plan cards and the New plan action for managers', () => {
    render(<ToastCtx.Provider value={() => {}}><PlansTab /></ToastCtx.Provider>);
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('New plan')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** per Port spec.
- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/components/billing/PlansTab.tsx src/components/billing/PlansTab.test.tsx
git commit -m "feat(catreadmin): PlansTab wired to plan CRUD (3b)"
```

---

### Task 9: `SubscriptionsTab` + `InvoicesTab` (port + wire)

**Files:**
- Create: `src/components/billing/SubscriptionsTab.tsx`, `src/components/billing/InvoicesTab.tsx`
- Test: `src/components/billing/InvoicesTab.test.tsx`
- Recover: `git show '5660fb0^:screen-billing.jsx'` → `SubscriptionsTab`, `InvoicesTab`.

**Interfaces:**
- `SubscriptionsTab` consumes `useSubscriptions` (Task 6), `useNav`, `Avatar`, `StatusBadge`, `Icon`, `fmt`; rows → `nav.go('client', { id: sub.tenant_id })`. Produces `export function SubscriptionsTab(): React.ReactElement`.
- `InvoicesTab` consumes `useInvoices` (Task 6), `useMarkInvoicePaid`/`useRefundInvoice` (Task 6), `useAuth`, `useToast`, `Menu`, `MenuItem`, `Btn`, `ConfirmDialog`, `StatusBadge`, `Icon`, `fmt`, `ApiError`. Produces `export function InvoicesTab(): React.ReactElement`.

**Port spec:**
- `SubscriptionsTab`: table from `useSubscriptions().data?.pages.flatMap(p => p.data) ?? []`. Columns: Client (Avatar+name), Plan (badge `plan_name`), Status (`StatusBadge`), Current period (`current_period_start`–`current_period_end`), Next charge (`next_charge != null ? fmt.money : '—'`), chevron. `<QueryBoundary>` for states. Row → client detail by `tenant_id`.
- `InvoicesTab`: status chips (all/paid/open/past_due) drive `useInvoices({ status })` (server-side filter — pass the chip to the hook param; `all` → no status). Rows from `pages.flatMap`. Row menu: **View invoice** (no-op/placeholder, no detail screen this slice), **Mark as paid** (gate `billing.manage_invoice`, status≠paid → `useMarkInvoicePaid().mutate(id, {onSuccess: toast, onError})`), **Refund** (gate `billing.refund`, status=paid → opens `ConfirmDialog`; confirm → `useRefundInvoice().mutate(id, …)`). **Omit Download PDF.** `<QueryBoundary>` for states.

- [ ] **Step 1: Write the failing test** (`InvoicesTab.test.tsx`):

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoicesTab } from './InvoicesTab';
import { ToastCtx } from '../index';

vi.mock('../../api/hooks/useInvoices', () => ({ useInvoices: () => ({ isLoading: false, isError: false,
  hasNextPage: false, data: { pages: [{ data: [
    { id: 'INV-1', tenant_name: 'Greenwood', plan_name: 'Gold', amount: 50000, status: 'paid',
      issued: '2026-06-01', due: '2026-06-10', paid_on: '2026-06-05' },
  ], next_cursor: null }] } }) }));
vi.mock('../../api/hooks/useInvoiceMutations', () => ({
  useMarkInvoicePaid: () => ({ mutate: vi.fn(), isPending: false }),
  useRefundInvoice: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('InvoicesTab', () => {
  it('renders invoice rows and omits Download PDF', () => {
    render(<ToastCtx.Provider value={() => {}}><InvoicesTab /></ToastCtx.Provider>);
    expect(screen.getByText('INV-1')).toBeInTheDocument();
    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** both tabs per Port spec.
- [ ] **Step 4: Run test → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit**

```bash
git add src/components/billing/SubscriptionsTab.tsx src/components/billing/InvoicesTab.tsx src/components/billing/InvoicesTab.test.tsx
git commit -m "feat(catreadmin): SubscriptionsTab + InvoicesTab wired (3b)"
```

---

### Task 10: `BillingScreen` shell + routing (final gate)

**Files:**
- Create: `src/screens/BillingScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/screens/BillingScreen.test.tsx`
- Recover: `git show '5660fb0^:screen-billing.jsx'` → `BillingScreen`.

**Interfaces:**
- Consumes: `PlansTab`/`SubscriptionsTab`/`InvoicesTab` (Tasks 8–9), `useAuth`, `Btn`, `Icon`, `useInvoices` (for the past-due banner count, or compute lazily).
- Produces: `export function BillingScreen({ plansOnly }: { plansOnly?: boolean }): React.ReactElement`

**Port spec:** Convert `BillingScreen` to JSX. Tabs gated by `can(perm)`: `plansOnly` → just `[plans]`; full → `[plans, subscriptions, invoices]`. Title/desc per `plansOnly`. The past-due banner (full mode, tab≠plans) shows when there are past-due invoices — for this slice, render the banner from a lightweight `useInvoices({ status: 'past_due' })` count (or omit the banner if that adds a second list fetch you'd rather defer — keep it, it's cheap). Tab state via `useState`. Replace `window.useCan`→`useAuth().can`, `window.useNav`→`useNav`.

`src/App.tsx`: add `import { BillingScreen } from './screens/BillingScreen';` and cases:
```tsx
      case 'plans':   return <BillingScreen plansOnly />;
      case 'billing': return <BillingScreen />;
```
(Preserve the Forbidden guard + default.)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingScreen } from './BillingScreen';

vi.mock('../components/billing/PlansTab', () => ({ PlansTab: () => <div>PLANS_TAB</div> }));
vi.mock('../components/billing/SubscriptionsTab', () => ({ SubscriptionsTab: () => <div>SUBS_TAB</div> }));
vi.mock('../components/billing/InvoicesTab', () => ({ InvoicesTab: () => <div>INV_TAB</div> }));
vi.mock('../api/hooks/useInvoices', () => ({ useInvoices: () => ({ data: { pages: [{ data: [], next_cursor: null }] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('BillingScreen', () => {
  it('plansOnly mode shows only the Plans tab content', () => {
    render(<BillingScreen plansOnly />);
    expect(screen.getByText('PLANS_TAB')).toBeInTheDocument();
    expect(screen.queryByText('SUBS_TAB')).not.toBeInTheDocument();
  });
  it('full mode renders the tab bar with Subscriptions + Invoices', () => {
    render(<BillingScreen />);
    expect(screen.getByText('Subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });
});
```
> `useNav` is needed by the sub-tabs but they're mocked here; if `BillingScreen` itself calls `useNav`, wrap the render in `NavCtx.Provider` like the other screen tests.

- [ ] **Step 2: Run test → fail.**
- [ ] **Step 3: Implement** the shell + the two `App.tsx` cases.
- [ ] **Step 4: Run test → pass.**
- [ ] **Step 5: Full gate**

Run: `npm test` → all green. `npm run typecheck` → clean. `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/screens/BillingScreen.tsx src/App.tsx src/screens/BillingScreen.test.tsx
git commit -m "feat(catreadmin): BillingScreen shell + plans/billing routes (3b)"
```

---

## Manual verification (local e2e)

Backend up + `npm run dev`, logged in as `catre.tech@gmail.com`:
1. **Plans** nav → catalog renders from `GET /plans`; filter tabs work; **New plan** opens the editor, Save creates (appears after invalidation). **Edit**/**Publish** show a clean error toast where the endpoint isn't live yet.
2. **Billing** nav → Plans/Subscriptions/Invoices tabs; past-due banner if any.
3. **Subscriptions** → table from `GET /subscriptions`; row → client detail.
4. **Invoices** → list; **Mark as paid** flips status after invalidation; **Refund** (after confirm) issues; no Download-PDF item; 403 (wrong role) → error toast, no crash.

## Self-review checklist (done)

- **Spec coverage:** feature catalog (T1) · DTOs+contract (T2) · plan writes (T3) · subs/invoices api (T4) · plan mutation hooks (T5) · subs/invoice hooks (T6) · PlanEditModal (T7) · PlansTab CRUD (T8) · Subscriptions+Invoices tabs (T9) · BillingScreen shell + routes (T10). All spec sections mapped.
- **Placeholder scan:** data-layer tasks carry full code; UI tasks carry git-recovery + explicit port/wire/gating specs and tests (large 1:1 ports — verbatim transcription into the plan would be less faithful than recovering from git).
- **Type consistency:** `CreatePlanBody`/`UpdatePlanBody`/`Invoice`/`Subscription` defined in T2 and consumed unchanged in T3–T9; query keys defined in T4 and used by hooks; `feature_tiers`/`per_student`/`min_students` snake_case throughout.

## Flagged (verify during implementation)

- Plan write bodies, `publishPlan` `{ publish }` shape, `Subscription` shape, and invoice mark-paid/refund response shapes are assumed snake_case — confirm against the live swagger; adjust T2/T3/T4 if the backend differs.
- `feature_tiers` may not round-trip until the backend Plan schema supports it (PLAN_KEYS has `features` but not `feature_tiers`) — flagged; the editor still collects it.
- Prototype-only `Plan` fields (`popular`, `active`) are intentionally dropped from card rendering (absent from `PLAN_KEYS`).
