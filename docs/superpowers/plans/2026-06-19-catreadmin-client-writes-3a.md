# Client Lifecycle Writes + Onboard Wizard (Slice 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the client lifecycle mutations (`POST /clients/{id}/status`, `/change-plan`) and the Onboard wizard (`POST /clients`) to the live backend, keeping the existing prototype UI unchanged.

**Architecture:** Add a thin mutation data layer (typed `api/` functions → TanStack `useMutation` hooks that invalidate the relevant query keys) and two UI pieces ported 1:1 from the recovered prototype (`<ClientActions>` + `<ChangePlanModal>`, the `OnboardWizard` screen). Toasts are raised at the call site via `mutate(vars, { onSuccess, onError })`; `ConfirmDialog` gates irreversible actions. This slice establishes the write pattern reused by slices 3b–3e.

**Tech Stack:** React 18 + TypeScript, Vite, `@tanstack/react-query` v5, Vitest + `@testing-library/react`.

## Global Constraints

- **JSON is snake_case**, request and response. Money is INR; format with `fmt.money`.
- **Base URL** (`config.apiBaseUrl`) already includes `/v1`; pass `request`/`listRequest` paths like `/clients` — never prefix `/v1`.
- **Data fetching is TanStack Query only.** Mutations use `useMutation` + `useQueryClient().invalidateQueries`.
- **Errors:** the API client throws `ApiError { status, code, message, details }`. Surface `e.message` in an error toast; never crash.
- **RBAC is UI-gating only.** Gate actions with `useAuth().can(permission)`; the server still enforces (403 → error toast).
- **Keep the design unchanged.** Port prototype markup/classes verbatim; do not restyle. Recover prototype source with `git show '5660fb0^:<file>'`.
- **No new dependencies.**
- **The `Plan` DTO follows `CONTRACT_KEYS.PLAN_KEYS`** (`visibility`/`description`, no `active`/`popular`/`desc`).
- **No Delete, no Impersonate** (no live endpoint) — omit those prototype actions.
- Every task ends green: `npm test` (Vitest), `npm run typecheck` (`tsc -b`).

---

### Task 1: DTOs & contract — `Plan`, `CreateClientBody`, `ClientStatusAction`

**Files:**
- Modify: `src/api/types.ts` (append interfaces; `CONTRACT_KEYS.PLAN_KEYS` already present)
- Test: `src/api/types.test.ts` (add a `Plan`-keys assertion)

**Interfaces:**
- Produces:
  - `Plan { id, name, tier, pricing, price, per_student, min_students, period, features, limits, visibility, audience, band, offer, color, description }`
  - `CreateClientBody { name, slug, country, size, admin_name, admin_email, admin_phone, plan_id, trial_days }`
  - `ClientStatusAction = 'start_trial' | 'activate' | 'suspend' | 'reinstate' | 'cancel'`

- [ ] **Step 1: Write the failing test**

Add to `src/api/types.test.ts` (inside the existing file, after the imports add `Plan` to the import and append a new `describe`):

```ts
import { CONTRACT_KEYS, type Plan } from './types';

describe('Plan interface', () => {
  it('covers exactly the PLAN_KEYS contract', () => {
    // A missing/extra key here fails to compile; the runtime check guards against PLAN_KEYS drift.
    const planKeys: Record<keyof Plan, true> = {
      id: true, name: true, tier: true, pricing: true, price: true, per_student: true,
      min_students: true, period: true, features: true, limits: true, visibility: true,
      audience: true, band: true, offer: true, color: true, description: true,
    };
    expect(Object.keys(planKeys).sort()).toEqual([...CONTRACT_KEYS.PLAN_KEYS].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/types.test.ts`
Expected: FAIL — `Plan` is not exported from `./types` (TS/import error).

- [ ] **Step 3: Write minimal implementation**

Append to `src/api/types.ts`:

```ts
export type ClientStatusAction = 'start_trial' | 'activate' | 'suspend' | 'reinstate' | 'cancel';

export interface Plan {
  id: string; name: string; tier: Tier; pricing: string; price: number;
  per_student: number; min_students: number; period: string;
  features: string[]; limits: Record<string, number>;
  visibility: string; audience: string; band: string; offer: string;
  color: string; description: string;
}

export interface CreateClientBody {
  name: string; slug: string; country: string; size: string;
  admin_name: string; admin_email: string; admin_phone: string;
  plan_id: string; trial_days: number;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/api/types.test.ts`
Expected: PASS (both the existing contract test and the new `Plan` test).

- [ ] **Step 5: Commit**

```bash
git add src/api/types.ts src/api/types.test.ts
git commit -m "feat(catreadmin): Plan/CreateClientBody/ClientStatusAction DTOs (3a)"
```

---

### Task 2: Plans read layer — query key, `listPlans`, `usePlans`

**Files:**
- Modify: `src/api/queryKeys.ts` (add `qk.plans`)
- Create: `src/api/plans.ts`
- Create: `src/api/hooks/usePlans.ts`
- Test: `src/api/plans.test.ts`

**Interfaces:**
- Consumes: `Plan`, `ListEnvelope<T>` (Task 1 / existing); `listRequest` (existing `./client`).
- Produces:
  - `qk.plans.list(): readonly ['plans','list']`
  - `listPlans(): Promise<ListEnvelope<Plan>>`
  - `usePlans()` → TanStack query whose `data` is `ListEnvelope<Plan>` (consumers read `data?.data ?? []`).

- [ ] **Step 1: Write the failing test**

Create `src/api/plans.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listPlans } from './plans';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => vi.restoreAllMocks());

describe('listPlans', () => {
  it('GETs /plans and returns the list envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'pl_gold' }], next_cursor: null }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await listPlans();
    expect(out).toEqual({ data: [{ id: 'pl_gold' }], next_cursor: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/plans');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/plans.test.ts`
Expected: FAIL — cannot resolve `./plans`.

- [ ] **Step 3: Write minimal implementation**

Add to `src/api/queryKeys.ts` (inside the `qk` object, after the `reports` block):

```ts
  plans: {
    list: () => ['plans', 'list'] as const,
  },
```

Create `src/api/plans.ts`:

```ts
import { listRequest } from './client';
import type { Plan, ListEnvelope } from './types';

export function listPlans(): Promise<ListEnvelope<Plan>> {
  return listRequest<ListEnvelope<Plan>>('/plans');
}
```

Create `src/api/hooks/usePlans.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { listPlans } from '../plans';
import { qk } from '../queryKeys';

export function usePlans() {
  return useQuery({ queryKey: qk.plans.list(), queryFn: listPlans });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/api/plans.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/queryKeys.ts src/api/plans.ts src/api/hooks/usePlans.ts src/api/plans.test.ts
git commit -m "feat(catreadmin): plans read layer (listPlans + usePlans + key) (3a)"
```

---

### Task 3: Client write API functions

**Files:**
- Modify: `src/api/clients.ts` (append three functions; extend imports)
- Test: `src/api/clients.test.ts` (append three `describe` blocks)

**Interfaces:**
- Consumes: `request` (existing `./client`); `Client`, `CreateClientBody`, `ClientStatusAction` (Task 1).
- Produces:
  - `createClient(body: CreateClientBody): Promise<Client>` → `POST /clients`
  - `setClientStatus(id: string, action: ClientStatusAction): Promise<Client>` → `POST /clients/{id}/status`, body `{ action }`
  - `changeClientPlan(id: string, plan_id: string): Promise<Client>` → `POST /clients/{id}/change-plan`, body `{ plan_id }`

> **⚠️ Contract note:** request bodies (`{ action }` for status, `{ plan_id }` for change-plan, the `CreateClientBody` field names) are the spec's assumed snake_case shapes. Verify against `sms-backend/.../swagger.json`; if the backend differs (e.g. `{ status }` not `{ action }`), adjust the body here and `ClientStatusAction`/`CreateClientBody` in Task 1, then re-run tests.

- [ ] **Step 1: Write the failing test**

Append to `src/api/clients.test.ts`:

```ts
import { createClient, setClientStatus, changeClientPlan } from './clients';

describe('createClient', () => {
  it('POSTs /clients with the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c9' } }));
    vi.stubGlobal('fetch', fetchMock);
    const body = { name: 'New', slug: 'new', country: 'Mumbai, MH', size: '',
      admin_name: 'A', admin_email: 'a@b.c', admin_phone: '', plan_id: 'pl_gold', trial_days: 14 };
    const out = await createClient(body);
    expect(out).toEqual({ id: 'c9' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(body);
  });
});

describe('setClientStatus', () => {
  it('POSTs /clients/{id}/status with { action }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1', status: 'suspended' } }));
    vi.stubGlobal('fetch', fetchMock);
    await setClientStatus('c1', 'suspend');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients/c1/status');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ action: 'suspend' });
  });
});

describe('changeClientPlan', () => {
  it('POSTs /clients/{id}/change-plan with { plan_id }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1', plan_id: 'pl_platinum' } }));
    vi.stubGlobal('fetch', fetchMock);
    await changeClientPlan('c1', 'pl_platinum');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients/c1/change-plan');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ plan_id: 'pl_platinum' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/clients.test.ts`
Expected: FAIL — `createClient`/`setClientStatus`/`changeClientPlan` not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/api/clients.ts`, extend the type import and append the functions:

```ts
import type { Client, ClientUsage, AuditLog, ListEnvelope, CreateClientBody, ClientStatusAction } from './types';
```

```ts
export function createClient(body: CreateClientBody): Promise<Client> {
  return request<Client>('/clients', { method: 'POST', body });
}

export function setClientStatus(id: string, action: ClientStatusAction): Promise<Client> {
  return request<Client>(`/clients/${id}/status`, { method: 'POST', body: { action } });
}

export function changeClientPlan(id: string, plan_id: string): Promise<Client> {
  return request<Client>(`/clients/${id}/change-plan`, { method: 'POST', body: { plan_id } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/api/clients.test.ts`
Expected: PASS (all five describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/api/clients.ts src/api/clients.test.ts
git commit -m "feat(catreadmin): client write api (create/status/change-plan) (3a)"
```

---

### Task 4: Client mutation hooks (invalidation)

**Files:**
- Create: `src/api/hooks/useClientMutations.ts`
- Test: `src/api/hooks/useClientMutations.test.tsx`

**Interfaces:**
- Consumes: `createClient`, `setClientStatus`, `changeClientPlan` (Task 3); `qk` (existing); `useMutation`, `useQueryClient`.
- Produces:
  - `useCreateClient()` → mutation; `mutate(body: CreateClientBody)`; on success invalidates `['clients','list']`.
  - `useSetClientStatus(id: string)` → mutation; `mutate(action: ClientStatusAction)`; on success invalidates `qk.clients.detail(id)` + `['clients','list']`.
  - `useChangeClientPlan(id: string)` → mutation; `mutate(plan_id: string)`; on success invalidates `qk.clients.detail(id)` + `['clients','list']`.

> **Why prefix `['clients','list']`:** the list key is `['clients','list', params]`; invalidating the prefix matches every filter/sort variant.

> **Toasts live at the call site**, not in these hooks (the hooks stay pure/invalidation-only so they're trivially testable). Components pass `{ onSuccess, onError }` to `mutate`.

- [ ] **Step 1: Write the failing test**

Create `src/api/hooks/useClientMutations.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../clients', () => ({
  createClient: vi.fn().mockResolvedValue({ id: 'c9' }),
  setClientStatus: vi.fn().mockResolvedValue({ id: 'c1', status: 'suspended' }),
  changeClientPlan: vi.fn().mockResolvedValue({ id: 'c1', plan_id: 'pl_platinum' }),
}));

import { useSetClientStatus } from './useClientMutations';

beforeEach(() => vi.clearAllMocks());

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useSetClientStatus', () => {
  it('invalidates the client detail and list keys on success', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSetClientStatus('c1'), { wrapper: wrapper(qc) });
    result.current.mutate('suspend');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['clients', 'detail', 'c1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['clients', 'list'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/api/hooks/useClientMutations.test.tsx`
Expected: FAIL — cannot resolve `./useClientMutations`.

- [ ] **Step 3: Write minimal implementation**

Create `src/api/hooks/useClientMutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, setClientStatus, changeClientPlan } from '../clients';
import { qk } from '../queryKeys';
import type { CreateClientBody, ClientStatusAction } from '../types';

const LIST_KEY = ['clients', 'list'] as const;

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClientBody) => createClient(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST_KEY }); },
  });
}

export function useSetClientStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: ClientStatusAction) => setClientStatus(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.detail(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useChangeClientPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan_id: string) => changeClientPlan(id, plan_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.detail(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/api/hooks/useClientMutations.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/hooks/useClientMutations.ts src/api/hooks/useClientMutations.test.tsx
git commit -m "feat(catreadmin): client mutation hooks with invalidation (3a)"
```

---

### Task 5: `<ClientActions>` component (+ ChangePlanModal)

**Files:**
- Create: `src/components/ClientActions.tsx`
- Test: `src/components/ClientActions.test.tsx`
- Reference (read, do not import): `git show '5660fb0^:client-actions.jsx'`

**Interfaces:**
- Consumes: `Client`, `Plan` (types); `useSetClientStatus`, `useChangeClientPlan` (Task 4); `usePlans` (Task 2); `useAuth` (`auth/AuthContext`); `Btn`, `Menu`, `MenuItem`, `ConfirmDialog`, `Modal`, `useToast`, `fmt` (`components`); `Icon` (`lib/icons`).
- Produces: `export function ClientActions({ client }: { client: Client }): React.ReactElement`

**Behavior:**
- Action set by `client.status` (delete/impersonate omitted — no endpoint):
  - `trial` → activate · change_plan · cancel
  - `active` → change_plan · suspend · cancel
  - `suspended` → reinstate · cancel
  - `cancelled` → start_trial
- Each action gated with `can('clients.<key>')`; hidden when not permitted.
- every lifecycle action opens `ConfirmDialog` (prototype copy) before firing — matching the prototype, where only `change_plan` skips confirmation (modal instead); `suspend` / `cancel` additionally use `danger`.
- `change_plan` opens `ChangePlanModal` (active plans from `usePlans`); "Update plan" disabled while selection equals `client.plan_id`.
- Success → success toast; error → `toast({ kind:'error', msg: (e as ApiError).message })`. Buttons disable while `isPending`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ClientActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClientActions } from './ClientActions';
import { ToastCtx } from './index';
import type { Client } from '../api/types';

vi.mock('../api/hooks/useClientMutations', () => ({
  useSetClientStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeClientPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../api/hooks/usePlans', () => ({ usePlans: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

const client = { id: 'c1', status: 'active', plan_id: 'pl_gold', name: 'Greenwood' } as Client;

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastCtx.Provider value={() => {}}>{ui}</ToastCtx.Provider>);
}

describe('ClientActions', () => {
  it('shows the active-status action set (change plan, suspend, cancel) and hides delete', () => {
    renderWithToast(<ClientActions client={client} />);
    expect(screen.getByText('Change plan')).toBeInTheDocument();
    expect(screen.getByText('Suspend')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument();
  });

  it('hides actions the role cannot perform', async () => {
    vi.resetModules();
    vi.doMock('../auth/AuthContext', () => ({ useAuth: () => ({ can: (p: string) => p !== 'clients.suspend' }) }));
    const { ClientActions: Gated } = await import('./ClientActions');
    renderWithToast(<Gated client={client} />);
    expect(screen.queryByText('Suspend')).not.toBeInTheDocument();
    expect(screen.getByText('Change plan')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ClientActions.test.tsx`
Expected: FAIL — cannot resolve `./ClientActions`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ClientActions.tsx`:

```tsx
import React, { useState } from 'react';
import { Btn, ConfirmDialog, Modal, useToast, fmt } from './index';
import { Icon } from '../lib/icons';
import { useAuth } from '../auth/AuthContext';
import { useSetClientStatus, useChangeClientPlan } from '../api/hooks/useClientMutations';
import { usePlans } from '../api/hooks/usePlans';
import type { ApiError } from '../api/ApiError';
import type { Client, Plan, ClientStatusAction } from '../api/types';

type ActionDef = {
  key: ClientStatusAction; label: string; icon: typeof Icon.zap; perm: string;
  variant?: 'primary' | 'default' | 'danger'; danger?: boolean;
  confirm?: { title: string; message: string; confirmLabel: string };
  toast: { title: string; msg: string; kind?: 'success' | 'info' };
};

const ACTIONS: Record<ClientStatusAction, ActionDef> = {
  start_trial: { key: 'start_trial', label: 'Start trial', icon: Icon.zap, perm: 'clients.start_trial', variant: 'primary',
    confirm: { title: 'Start a new trial?', message: 'A 14-day trial will begin and the client becomes active in onboarding.', confirmLabel: 'Start trial' },
    toast: { title: 'Trial started', msg: '14-day trial is now active.' } },
  activate: { key: 'activate', label: 'Activate', icon: Icon.checkCircle, perm: 'clients.activate', variant: 'primary',
    confirm: { title: 'Activate this client?', message: 'The subscription becomes active and billing begins on the current plan.', confirmLabel: 'Activate' },
    toast: { title: 'Client activated', msg: 'Subscription is now active.' } },
  suspend: { key: 'suspend', label: 'Suspend', icon: Icon.pause, perm: 'clients.suspend', variant: 'default', danger: true,
    confirm: { title: 'Suspend this client?', message: 'Users will lose access until reinstated. This is reversible. The action is logged.', confirmLabel: 'Suspend client' },
    toast: { title: 'Client suspended', msg: 'Access has been revoked.', kind: 'info' } },
  reinstate: { key: 'reinstate', label: 'Reinstate', icon: Icon.play, perm: 'clients.reinstate', variant: 'primary',
    confirm: { title: 'Reinstate this client?', message: 'Access will be restored immediately on the existing plan.', confirmLabel: 'Reinstate' },
    toast: { title: 'Client reinstated', msg: 'Access restored.' } },
  cancel: { key: 'cancel', label: 'Cancel', icon: Icon.ban, perm: 'clients.cancel', variant: 'default', danger: true,
    confirm: { title: 'Cancel this subscription?', message: 'The subscription will be cancelled at period end. Data is retained for 90 days.', confirmLabel: 'Cancel subscription' },
    toast: { title: 'Subscription cancelled', msg: 'Cancels at period end.', kind: 'info' } },
};

const BY_STATUS: Record<string, ClientStatusAction[]> = {
  trial: ['activate', 'cancel'],
  active: ['suspend', 'cancel'],
  suspended: ['reinstate', 'cancel'],
  cancelled: ['start_trial'],
};

export function ClientActions({ client }: { client: Client }): React.ReactElement {
  const { can } = useAuth();
  const toast = useToast();
  const statusMut = useSetClientStatus(client.id);
  const planMut = useChangeClientPlan(client.id);
  const [confirm, setConfirm] = useState<ActionDef | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const fire = (a: ActionDef) =>
    statusMut.mutate(a.key, {
      onSuccess: () => toast({ kind: a.toast.kind ?? 'success', title: a.toast.title, msg: a.toast.msg }),
      onError: (e) => toast({ kind: 'error', title: 'Action failed', msg: (e as ApiError).message }),
    });

  const onClick = (a: ActionDef) => { if (a.confirm) setConfirm(a); else fire(a); };

  const keys = BY_STATUS[client.status] ?? [];
  const showChangePlan = (client.status === 'trial' || client.status === 'active') && can('clients.change_plan');

  return (
    <div className="row gap8">
      {showChangePlan && (
        <Btn variant="default" icon={Icon.plans} disabled={planMut.isPending} onClick={() => setPlanOpen(true)}>Change plan</Btn>
      )}
      {keys.filter(k => can(ACTIONS[k].perm)).map(k => {
        const a = ACTIONS[k];
        return (
          <Btn key={k} variant={a.variant} icon={a.icon} disabled={statusMut.isPending} onClick={() => onClick(a)}>
            {a.label}
          </Btn>
        );
      })}

      {confirm && (
        <ConfirmDialog open onClose={() => setConfirm(null)} onConfirm={() => fire(confirm)}
          title={confirm.confirm!.title} message={confirm.confirm!.message}
          confirmLabel={confirm.confirm!.confirmLabel} danger={confirm.danger} />
      )}

      <ChangePlanModal open={planOpen} onClose={() => setPlanOpen(false)} client={client}
        onPick={(planId) => planMut.mutate(planId, {
          onSuccess: () => toast({ kind: 'success', title: 'Plan updated', msg: 'The subscription plan was changed.' }),
          onError: (e) => toast({ kind: 'error', title: 'Plan change failed', msg: (e as ApiError).message }),
        })} />
    </div>
  );
}

function ChangePlanModal({ open, onClose, client, onPick }:
  { open: boolean; onClose: () => void; client: Client; onPick: (planId: string) => void }) {
  const { data } = usePlans();
  const plans: Plan[] = data?.data ?? [];
  const [sel, setSel] = useState(client.plan_id);
  React.useEffect(() => { setSel(client.plan_id); }, [client.plan_id, open]);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-head">
        <div className="mh-ic" style={{ background: 'var(--accent-ghost)', color: 'var(--accent)' }}><Icon.plans size={19} /></div>
        <div className="mh-text"><h3>Change plan</h3><p>{client.name}</p></div>
      </div>
      <div className="modal-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '8px 0' }}>
          {plans.map(p => (
            <button key={p.id} onClick={() => setSel(p.id)} style={{ textAlign: 'left', padding: '13px 15px', borderRadius: 11,
              border: '1.5px solid ' + (sel === p.id ? 'var(--accent)' : 'var(--border)'),
              background: sel === p.id ? 'var(--accent-ghost)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
              <div className="f1">
                <div style={{ fontWeight: 650, fontSize: 14 }}>{p.name}{client.plan_id === p.id && <span className="tiny muted" style={{ fontWeight: 500 }}>  · current</span>}</div>
                <div className="tiny muted">{fmt.num(p.limits.students)} students · {fmt.num(p.limits.staff)} staff</div>
              </div>
              <div className="mono" style={{ fontWeight: 700 }}>{fmt.money(p.price)}<span className="tiny muted">/mo</span></div>
            </button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={sel === client.plan_id} onClick={() => { onPick(sel); onClose(); }}>Update plan</Btn>
      </div>
    </Modal>
  );
}
```

> If `fmt.num` is absent, use `String(...)`. Confirm `fmt.num` exists in `src/components/index.tsx` (the prototype used it); the read screens use `fmt.money`/`fmt.num`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ClientActions.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/ClientActions.tsx src/components/ClientActions.test.tsx
git commit -m "feat(catreadmin): ClientActions + ChangePlanModal wired to mutations (3a)"
```

---

### Task 6: `OnboardWizard` screen

**Files:**
- Create: `src/screens/OnboardWizard.tsx`
- Test: `src/screens/OnboardWizard.test.tsx`
- Reference (read, do not import): `git show '5660fb0^:screen-onboard.jsx'`

**Interfaces:**
- Consumes: `useCreateClient` (Task 4); `usePlans` (Task 2); `useNav`, `useToast`, `Btn`, `Avatar`, `fmt` (`components`); `Icon` (`lib/icons`); `ApiError`, `Plan`, `CreateClientBody` (types).
- Produces: `export function OnboardWizard(): React.ReactElement`

**Behavior:** 5-step stepper (School details → Admin contact → Plan & tier → Trial length → Review), ported markup/classes from the prototype. Step-3 plan list comes from `usePlans` (replaces `DB.PLANS`). On the Review step, "Create client" calls `useCreateClient().mutate(body)` (mapping wizard state → `CreateClientBody` snake_case); on success → success toast + `nav.go('clients')`; on error → error toast, stay on Review. Client-side validation: step 0 requires `name` + `slug`; step 1 requires `admin_name` + a valid email.

- [ ] **Step 1: Write the failing test**

Create `src/screens/OnboardWizard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardWizard } from './OnboardWizard';
import { NavCtx, ToastCtx } from '../components';

const mutate = vi.fn();
vi.mock('../api/hooks/useClientMutations', () => ({ useCreateClient: () => ({ mutate, isPending: false }) }));
vi.mock('../api/hooks/usePlans', () => ({
  usePlans: () => ({ data: { data: [
    { id: 'pl_gold', name: 'Gold', price: 50000, color: '#caa', description: 'Best value', limits: { students: 1000, staff: 80, storage_gb: 50 } },
  ] } }),
}));

function renderWizard(go = vi.fn()) {
  return render(
    <NavCtx.Provider value={{ route: { name: 'onboard', params: {} }, go }}>
      <ToastCtx.Provider value={() => {}}><OnboardWizard /></ToastCtx.Provider>
    </NavCtx.Provider>,
  );
}

describe('OnboardWizard', () => {
  it('blocks Continue on step 0 until a school name is entered', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('School name is required')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/OnboardWizard.test.tsx`
Expected: FAIL — cannot resolve `./OnboardWizard`.

- [ ] **Step 3: Write minimal implementation**

Create `src/screens/OnboardWizard.tsx` (port of `screen-onboard.jsx` to TSX; plan list and submit wired live):

```tsx
import React, { useState } from 'react';
import { useNav, useToast, Btn, Avatar, fmt } from '../components';
import { Icon } from '../lib/icons';
import { usePlans } from '../api/hooks/usePlans';
import { useCreateClient } from '../api/hooks/useClientMutations';
import type { ApiError } from '../api/ApiError';
import type { Plan, CreateClientBody } from '../api/types';

type Form = {
  name: string; slug: string; country: string; size: string;
  adminName: string; adminEmail: string; adminPhone: string;
  plan_id: string; trial: number;
};

const COUNTRIES = ['Mumbai, MH', 'New Delhi, DL', 'Bengaluru, KA', 'Hyderabad, TS', 'Chennai, TN', 'Pune, MH', 'Kolkata, WB', 'Ahmedabad, GJ'];
const SIZES = ['Under 200', '200–500', '500–1,200', '1,200–5,000', '5,000+'];

export function OnboardWizard(): React.ReactElement {
  const nav = useNav();
  const toast = useToast();
  const { data } = usePlans();
  const plans: Plan[] = data?.data ?? [];
  const create = useCreateClient();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Form>({
    name: '', slug: '', country: 'Mumbai, MH', size: '',
    adminName: '', adminEmail: '', adminPhone: '', plan_id: plans[0]?.id ?? '', trial: 14,
  });
  const set = (k: keyof Form, v: string | number) =>
    setForm(d => ({ ...d, [k]: v, ...(k === 'name' ? { slug: String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}) }));

  const steps = [
    { title: 'School details', desc: 'Tell us about the school' },
    { title: 'Admin contact', desc: 'Who will administer the account' },
    { title: 'Plan & tier', desc: 'Choose a subscription plan' },
    { title: 'Trial length', desc: 'Set the evaluation period' },
    { title: 'Review', desc: 'Confirm and create' },
  ];

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) { if (!form.name.trim()) e.name = 'School name is required'; if (!form.slug.trim()) e.slug = 'Slug is required'; }
    if (step === 1) {
      if (!form.adminName.trim()) e.adminName = 'Admin name is required';
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.adminEmail)) e.adminEmail = 'Valid email required';
    }
    setErrors(e); return Object.keys(e).length === 0;
  };
  const next = () => { if (validate()) setStep(s => Math.min(s + 1, steps.length - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const submit = () => {
    const body: CreateClientBody = {
      name: form.name, slug: form.slug, country: form.country, size: form.size,
      admin_name: form.adminName, admin_email: form.adminEmail, admin_phone: form.adminPhone,
      plan_id: form.plan_id || plans[0]?.id || '', trial_days: form.trial,
    };
    create.mutate(body, {
      onSuccess: () => { toast({ kind: 'success', title: 'Client created', msg: `${form.name} is now in trial.` }); nav.go('clients'); },
      onError: (err) => toast({ kind: 'error', title: 'Could not create client', msg: (err as ApiError).message }),
    });
  };

  const plan = plans.find(p => p.id === form.plan_id) ?? plans[0];

  const Field = ({ label, k, placeholder, type = 'text', prefix, hint }:
    { label: string; k: keyof Form; placeholder?: string; type?: string; prefix?: string; hint?: string }) => (
    <div className="field">
      <label>{label}</label>
      {prefix
        ? <div className="input-group" style={{ height: 38 }}><span className="tiny muted">{prefix}</span>
            <input value={String(form[k])} onChange={e => set(k, e.target.value)} placeholder={placeholder} /></div>
        : <input className="input" type={type} value={String(form[k])} onChange={e => set(k, e.target.value)} placeholder={placeholder} />}
      {hint && !errors[k] && <span className="hint">{hint}</span>}
      {errors[k] && <span className="err">{errors[k]}</span>}
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <button className="row gap6 muted tiny" style={{ marginBottom: 14, fontWeight: 600 }} onClick={() => nav.go('clients')}>
        <Icon.chevLeft size={14} /> Cancel
      </button>
      <h1 className="page-title" style={{ marginBottom: 22 }}>Onboard a new client</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 28, alignItems: 'start' }}>
        <div className="fc gap2">
          {steps.map((s, i) => (
            <button key={i} onClick={() => i < step && setStep(i)} className="row gap10"
              style={{ padding: '9px 10px', borderRadius: 9, textAlign: 'left', cursor: i < step ? 'pointer' : 'default', background: i === step ? 'var(--surface-2)' : 'transparent' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
                background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface-3)', color: i <= step ? '#fff' : 'var(--text-3)' }}>
                {i < step ? <Icon.check size={13} /> : i + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: i === step ? 'var(--text)' : 'var(--text-3)' }}>{s.title}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><div><h3>{steps[step].title}</h3><div className="sub">{steps[step].desc}</div></div></div>
          <div className="card-pad" style={{ minHeight: 260 }}>
            {step === 0 && (
              <div className="fc gap16">
                <Field label="School name" k="name" placeholder="e.g. Greenwood High" />
                <Field label="Workspace slug" k="slug" prefix="catre.app/" hint="Auto-generated from the name; editable." />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field"><label>Country</label>
                    <select className="select" value={form.country} onChange={e => set('country', e.target.value)}>
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select></div>
                  <div className="field"><label>Approx. size</label>
                    <select className="select" value={form.size} onChange={e => set('size', e.target.value)}>
                      <option value="">Select…</option>{SIZES.map(c => <option key={c}>{c}</option>)}
                    </select></div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="fc gap16">
                <Field label="Admin full name" k="adminName" placeholder="e.g. Priya Sharma" />
                <Field label="Admin email" k="adminEmail" type="email" placeholder="admin@school.edu" hint="They’ll receive an invite to set up the account." />
                <Field label="Phone (optional)" k="adminPhone" placeholder="+91 90000 00000" />
              </div>
            )}

            {step === 2 && (
              <div className="fc gap10">
                {plans.map(p => (
                  <button key={p.id} onClick={() => set('plan_id', p.id)}
                    style={{ textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: '1.5px solid ' + (form.plan_id === p.id ? 'var(--accent)' : 'var(--border)'),
                      background: form.plan_id === p.id ? 'var(--accent-ghost)' : 'var(--surface-2)' }}>
                    <div className="row jb">
                      <div className="row gap10"><span style={{ width: 11, height: 11, borderRadius: 3, background: p.color }} />
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span></div>
                      <span className="mono" style={{ fontWeight: 700 }}>{fmt.money(p.price)}<span className="tiny muted">/mo</span></span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 6 }}>{p.description}</div>
                    <div className="tiny muted mono" style={{ marginTop: 8 }}>{fmt.num(p.limits.students)} students · {fmt.num(p.limits.staff)} staff · {p.limits.storage_gb} GB</div>
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>Trial length</label>
                <div className="row gap8 fw" style={{ marginTop: 12 }}>
                  {[7, 14, 30, 60].map(d => (
                    <button key={d} onClick={() => set('trial', d)} className={'chip' + (form.trial === d ? ' active' : '')}
                      style={{ height: 'auto', padding: '14px 20px', flexDirection: 'column' }}>
                      <span className="mono" style={{ fontSize: 22, fontWeight: 750, color: form.trial === d ? 'var(--accent-text)' : 'var(--text)' }}>{d}</span>
                      <span className="tiny">days</span>
                    </button>
                  ))}
                </div>
                <p className="tiny muted" style={{ marginTop: 16 }}>The trial begins immediately. The client can be activated any time before it ends.</p>
              </div>
            )}

            {step === 4 && (
              <div className="fc gap16">
                <div className="row gap12" style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border-soft)' }}>
                  <Avatar name={form.name || 'New School'} size={44} square />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{form.name || 'Untitled School'}</div>
                    <div className="tiny muted mono">catre.app/{form.slug || 'slug'}</div>
                  </div>
                </div>
                <dl className="dl">
                  <dt>Country</dt><dd>{form.country}</dd>
                  <dt>Admin</dt><dd>{form.adminName || '—'} · {form.adminEmail || '—'}</dd>
                  <dt>Plan</dt><dd>{plan ? `${plan.name} · ${fmt.money(plan.price)}/mo` : '—'}</dd>
                  <dt>Trial</dt><dd>{form.trial} days</dd>
                  <dt>First charge</dt><dd>After trial ends</dd>
                </dl>
                <div className="row gap10" style={{ padding: '11px 14px', background: 'var(--accent-ghost)', borderRadius: 10, color: 'var(--accent-text)', fontSize: 12.5 }}>
                  <Icon.info size={15} /> An invite email will be sent to the admin to complete setup.
                </div>
              </div>
            )}
          </div>

          <div className="modal-foot between" style={{ borderTop: '1px solid var(--border-soft)' }}>
            <div>{step > 0 && <Btn variant="ghost" icon={Icon.chevLeft} onClick={back}>Back</Btn>}</div>
            {step < steps.length - 1
              ? <Btn variant="primary" onClick={next}>Continue <Icon.arrowRight size={16} /></Btn>
              : <Btn variant="primary" icon={Icon.rocket} disabled={create.isPending} onClick={submit}>{create.isPending ? 'Creating…' : 'Create client'}</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/OnboardWizard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/OnboardWizard.tsx src/screens/OnboardWizard.test.tsx
git commit -m "feat(catreadmin): Onboard wizard wired to POST /clients (3a)"
```

---

### Task 7: Wire into shell — route, Clients button, Client-detail actions

**Files:**
- Modify: `src/App.tsx` (import + `case 'onboard'`)
- Modify: `src/screens/ClientsScreen.tsx` (Onboard button)
- Modify: `src/screens/ClientDetailScreen.tsx` (render `<ClientActions>`)
- Test: `src/screens/ClientDetailScreen.test.tsx` (extend existing — mock the new hooks so the screen renders)

**Interfaces:**
- Consumes: `OnboardWizard` (Task 6), `ClientActions` (Task 5), `useAuth` (existing).

- [ ] **Step 1: Write the failing test**

Extend `src/screens/ClientDetailScreen.test.tsx` — add mocks so `<ClientActions>` renders inside the detail screen, and assert an action button appears. Add these mocks alongside the existing ones, and a new assertion:

```tsx
vi.mock('../api/hooks/useClientMutations', () => ({
  useSetClientStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeClientPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../api/hooks/usePlans', () => ({ usePlans: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
```

Add a second test in the existing `describe`:

```tsx
it('renders client lifecycle actions for an active client', () => {
  render(<NavCtx.Provider value={{ route: { name: 'client', params: { id: 'c1' } }, go: () => {} }}>
    <ToastCtx.Provider value={() => {}}><ClientDetailScreen /></ToastCtx.Provider></NavCtx.Provider>);
  expect(screen.getByText('Suspend')).toBeInTheDocument();
});
```

Update the import line to include `ToastCtx`:

```tsx
import { NavCtx, ToastCtx } from '../components';
```

> The existing mock `useClient` returns a client with `status: 'active'` and `plan_id` is absent — add `plan_id: 'pl_gold'` to that mock's `data` so `ClientActions` has it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/screens/ClientDetailScreen.test.tsx`
Expected: FAIL — `ClientDetailScreen` does not yet render `<ClientActions>` (no "Suspend" button).

- [ ] **Step 3: Write minimal implementation**

**`src/App.tsx`** — add the import near the other screen imports:

```tsx
import { OnboardWizard } from './screens/OnboardWizard';
```

In `renderScreen()`'s `switch`, add the case (alongside `case 'reports'`):

```tsx
      case 'onboard':   return <OnboardWizard />;
```

**`src/screens/ClientsScreen.tsx`** — gate an Onboard button with `can('clients.start_trial')`. Update imports and the header:

```tsx
import { useAuth } from '../auth/AuthContext';
```

Replace the `<h1>` line with a header row that keeps the title and adds the button:

```tsx
      <div className="row jb">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Clients</h1>
        {useAuth().can('clients.start_trial') && (
          <Btn variant="primary" icon={Icon.plus} onClick={() => go('onboard')}>Onboard client</Btn>
        )}
      </div>
```

**`src/screens/ClientDetailScreen.tsx`** — render actions in the header. Add the import:

```tsx
import { ClientActions } from '../components/ClientActions';
```

Replace the header `<div className="row jb">…</div>` block so the status badge sits with the actions:

```tsx
            <div className="row jb">
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>{detail.data.name}</h1>
                <div className="muted tiny" style={{ marginTop: 4 }}>{detail.data.country} · CSM {detail.data.csm}</div>
              </div>
              <div className="row gap12">
                <StatusBadge status={detail.data.status} />
                <ClientActions client={detail.data} />
              </div>
            </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/screens/ClientDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full suite + typecheck + build**

Run: `npm test` → all green.
Run: `npm run typecheck` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/screens/ClientsScreen.tsx src/screens/ClientDetailScreen.tsx src/screens/ClientDetailScreen.test.tsx
git commit -m "feat(catreadmin): wire onboard route + client actions into shell (3a)"
```

---

## Manual verification (local e2e)

With the backend running (`http://localhost:5162/v1` local .NET, or `5080` Docker) and `npm run dev`:

1. Log in via email-OTP as `catre.tech@gmail.com`.
2. **Clients → Onboard client** → complete the wizard → success toast, land on Clients, new client appears.
3. Open a client → **Suspend** (confirm dialog) → toast; status badge flips to Suspended after invalidation.
4. **Reinstate**, then **Change plan** → pick a different plan → toast; MRR/plan reflect the change.
5. Confirm **Delete** and **Impersonate** are absent; trigger a 403 (e.g. as an `analyst` role) → error toast, no crash.

## Self-review checklist (done)

- **Spec coverage:** create (`POST /clients`, Task 3/6) · status transitions (Task 3/5) · change-plan (Task 3/5) · read `GET /plans` (Task 2) · mutation/invalidation pattern (Task 4) · confirm gating (Task 5) · delete/impersonate hidden (Task 5) · contract types (Task 1) — all mapped.
- **Placeholder scan:** every code step contains full code; no TBD/TODO.
- **Type consistency:** `ClientStatusAction`, `CreateClientBody`, `Plan` defined in Task 1 and used unchanged in Tasks 3–6; `client.plan_id` (not prototype `client.plan`) used throughout; query keys match `qk` shapes.

## Flagged (verify during implementation)

- Request bodies for `/clients`, `/status`, `/change-plan` and the `GET /plans` envelope shape are assumed snake_case — confirm against the live swagger and adjust Task 1/3 if the backend differs.
- `fmt.num` is assumed present in `src/components/index.tsx` (prototype used it); if missing, fall back to `String()`.
