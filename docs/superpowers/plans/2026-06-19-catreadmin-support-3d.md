# Support (Tickets) — Slice 3d Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Wire the Support surface (ticket list + ticket detail with thread/reply/status/assign) to the live backend, ported 1:1 from `screen-support.jsx`.

**Architecture:** typed DTOs → api (tickets + read-only team) → query/mutation hooks → ported `SupportScreen` (list + HealthPanel sidebar) and `TicketDetailScreen` (inline). Reuses the 3a–3c mutation→invalidation→toast pattern and the existing `HealthPanel` (DashboardScreen) + `useDashboardOverview`.

**Tech Stack:** React 18 + TS, Vite, TanStack Query v5, Vitest + @testing-library/react.

## Global Constraints

- snake_case; base URL includes `/v1` (paths like `/tickets`, no `/v1` prefix).
- Reads via `listRequest` (raw envelope) / `request` (unwrap); writes via `request` (ApiError, refresh-on-401).
- Mutations: `useMutation` + `invalidateQueries`; toast at call site. Hooks invalidation-only.
- RBAC UI-gating via `useAuth().can`: `support.view` (route), `support.manage` (reply / status / assign). Exist in `src/auth/rbac.ts`.
- Keep design unchanged: port markup/classes/copy verbatim. Recover with `git show '5660fb0^:screen-support.jsx'`. `React.createElement`→JSX, `window.*`→imports. REUSE existing `HealthPanel` (from `../screens/DashboardScreen`) — do NOT re-port it; the prototype's `HealthPanel`/`HealthScreen` copies are redundant (HealthScreen already exists).
- DTO field mapping: prototype `t.client`→`t.tenant_name`, `t.clientId`→`t.tenant_id`, `t.messages` (count)→`t.messages_count`.
- **Hide Impersonate** on the ticket-detail header (no live endpoint, deferred since 3a).
- No new deps. End each task green: `npm test`, `npm run typecheck`.
- Do NOT touch pre-existing uncommitted changes (App.test.tsx, LoginScreen.tsx, styles.css).

---

### Task 1: DTOs & contract

**Files:** Modify `src/api/types.ts`; Test `src/api/types.test.ts`.

**Produces:** `TicketStatus='open'|'pending'|'resolved'|'closed'`; `TicketPriority='low'|'normal'|'high'|'urgent'`; `Ticket` (=SUPPORT_TICKET_KEYS); `TicketMessage` (=TICKET_MESSAGE_KEYS); `TicketDetail = Ticket & { messages: TicketMessage[] }`; `TeamMember` (=TEAM_MEMBER_KEYS); `PatchTicketBody`; `TICKET_MESSAGE_KEYS` in CONTRACT_KEYS.

- [ ] **Step 1: Failing test** — add to `EXPECTED` in types.test.ts:
```ts
  TICKET_MESSAGE_KEYS: ['id','author','role','body','created'],
```
and append:
```ts
import { CONTRACT_KEYS, type TicketMessage } from './types';
describe('TicketMessage', () => {
  it('covers TICKET_MESSAGE_KEYS', () => {
    const k: Record<keyof TicketMessage, true> = { id:true, author:true, role:true, body:true, created:true };
    expect(Object.keys(k).sort()).toEqual([...CONTRACT_KEYS.TICKET_MESSAGE_KEYS].sort());
  });
});
```
- [ ] **Step 2: Run → fail** (`npm test -- src/api/types.test.ts`).
- [ ] **Step 3: Implement** — append to types.ts:
```ts
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface Ticket {
  id: string; subject: string; tenant_id: string; tenant_name: string;
  status: TicketStatus; priority: TicketPriority; assignee: string | null;
  created: string; updated: string; messages_count: number;
}
export interface TicketMessage {
  id: string; author: string; role: 'agent' | 'client'; body: string; created: string;
}
export type TicketDetail = Ticket & { messages: TicketMessage[] };
export interface TeamMember {
  id: string; name: string; email: string; phone: string;
  role: Role; status: string; last_login: string; joined: string;
}
export interface PatchTicketBody { status?: TicketStatus; assignee?: string | null; }
```
and add `TICKET_MESSAGE_KEYS: ['id','author','role','body','created'],` to `CONTRACT_KEYS`.
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/types.ts src/api/types.test.ts && git commit -m "feat(catreadmin): Ticket/TicketMessage/TeamMember DTOs (3d)"`

---

### Task 2: Tickets + Team API + keys

**Files:** Create `src/api/tickets.ts`, `src/api/team.ts`; Modify `src/api/queryKeys.ts`; Test `src/api/tickets.test.ts`, `src/api/team.test.ts`.

**Produces:**
- `listTickets(params, cursor?): Promise<ListEnvelope<Ticket>>` → `GET /tickets`
- `getTicket(id): Promise<TicketDetail>` → `GET /tickets/{id}`
- `patchTicket(id, body: PatchTicketBody): Promise<Ticket>` → `PATCH /tickets/{id}`
- `postMessage(id, body: string): Promise<TicketMessage>` → `POST /tickets/{id}/messages`, body `{ body }`
- `listTeam(): Promise<ListEnvelope<TeamMember>>` → `GET /team`
- `qk.tickets.list(params)`, `qk.tickets.detail(id)`, `qk.team.list()`; `TicketsListParams` in queryKeys.

- [ ] **Step 1: Failing tests**

`src/api/tickets.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTickets, getTicket, patchTicket, postMessage } from './tickets';
function jr(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('tickets api', () => {
  it('listTickets GETs /tickets with cursor', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: [{ id: 't1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    await listTickets({}, 'c1'); const u = String(f.mock.calls[0][0]); expect(u).toContain('/tickets'); expect(u).toContain('cursor=c1');
  });
  it('getTicket GETs /tickets/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 't1', messages: [] } })); vi.stubGlobal('fetch', f);
    await getTicket('t1'); expect(String(f.mock.calls[0][0])).toContain('/tickets/t1');
  });
  it('patchTicket PATCHes /tickets/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 't1' } })); vi.stubGlobal('fetch', f);
    await patchTicket('t1', { status: 'resolved' }); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/tickets/t1'); expect(i.method).toBe('PATCH'); expect(JSON.parse(i.body)).toEqual({ status: 'resolved' });
  });
  it('postMessage POSTs /tickets/{id}/messages with { body }', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 'm1' } })); vi.stubGlobal('fetch', f);
    await postMessage('t1', 'hello'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/tickets/t1/messages'); expect(i.method).toBe('POST'); expect(JSON.parse(i.body)).toEqual({ body: 'hello' });
  });
});
```

`src/api/team.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTeam } from './team';
function jr(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('listTeam', () => {
  it('GETs /team', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: [{ id: 'u1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await listTeam(); expect(out).toEqual({ data: [{ id: 'u1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/team');
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

`src/api/tickets.ts`:
```ts
import { request, listRequest } from './client';
import type { Ticket, TicketDetail, TicketMessage, PatchTicketBody, ListEnvelope } from './types';
import type { TicketsListParams } from './queryKeys';

export function listTickets(params: TicketsListParams, cursor?: string): Promise<ListEnvelope<Ticket>> {
  return listRequest<ListEnvelope<Ticket>>('/tickets', { query: { ...params, cursor } });
}
export function getTicket(id: string): Promise<TicketDetail> {
  return request<TicketDetail>(`/tickets/${id}`);
}
export function patchTicket(id: string, body: PatchTicketBody): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`, { method: 'PATCH', body });
}
export function postMessage(id: string, body: string): Promise<TicketMessage> {
  return request<TicketMessage>(`/tickets/${id}/messages`, { method: 'POST', body: { body } });
}
```

`src/api/team.ts`:
```ts
import { listRequest } from './client';
import type { TeamMember, ListEnvelope } from './types';

export function listTeam(): Promise<ListEnvelope<TeamMember>> {
  return listRequest<ListEnvelope<TeamMember>>('/team');
}
```

Add to `queryKeys.ts`: an `export interface TicketsListParams { status?: string; q?: string; limit?: number; }` and inside `qk`:
```ts
  tickets: {
    list: (params: TicketsListParams) => ['tickets', 'list', params] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
  },
  team: {
    list: () => ['team', 'list'] as const,
  },
```

- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/tickets.ts src/api/team.ts src/api/queryKeys.ts src/api/tickets.test.ts src/api/team.test.ts && git commit -m "feat(catreadmin): tickets + team(read) api + keys (3d)"`

---

### Task 3: Hooks

**Files:** Create `src/api/hooks/useTickets.ts`, `useTicket.ts`, `useTicketMutations.ts`, `useTeam.ts`; Test `useTicketMutations.test.tsx`.

**Produces:**
- `useTickets(params)` → `useInfiniteQuery(qk.tickets.list(params))`
- `useTicket(id)` → `useQuery(qk.tickets.detail(id), enabled:!!id)`
- `usePatchTicket(id)` → `mutate(body: PatchTicketBody)`; invalidates `qk.tickets.detail(id)` + `['tickets','list']`
- `usePostMessage(id)` → `mutate(body: string)`; invalidates `qk.tickets.detail(id)` + `['tickets','list']`
- `useTeam()` → `useQuery(qk.team.list)`

- [ ] **Step 1: Failing test** (`useTicketMutations.test.tsx`, mirror useInvoiceMutations):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('../tickets', () => ({
  patchTicket: vi.fn().mockResolvedValue({ id: 't1' }),
  postMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
}));
import { usePatchTicket } from './useTicketMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
describe('usePatchTicket', () => {
  it('invalidates ticket detail + list on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => usePatchTicket('t1'), { wrapper: wrapper(qc) });
    result.current.mutate({ status: 'resolved' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tickets', 'detail', 't1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tickets', 'list'] });
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

`useTickets.ts`:
```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { listTickets } from '../tickets';
import { qk, type TicketsListParams } from '../queryKeys';
export function useTickets(params: TicketsListParams) {
  return useInfiniteQuery({
    queryKey: qk.tickets.list(params),
    queryFn: ({ pageParam }) => listTickets(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
```
`useTicket.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { getTicket } from '../tickets';
import { qk } from '../queryKeys';
export function useTicket(id: string) {
  return useQuery({ queryKey: qk.tickets.detail(id), queryFn: () => getTicket(id), enabled: !!id });
}
```
`useTeam.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { listTeam } from '../team';
import { qk } from '../queryKeys';
export function useTeam() {
  return useQuery({ queryKey: qk.team.list(), queryFn: listTeam });
}
```
`useTicketMutations.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchTicket, postMessage } from '../tickets';
import { qk } from '../queryKeys';
import type { PatchTicketBody } from '../types';
const LIST = ['tickets', 'list'] as const;
export function usePatchTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: PatchTicketBody) => patchTicket(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.tickets.detail(id) }); qc.invalidateQueries({ queryKey: LIST }); } });
}
export function usePostMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: string) => postMessage(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.tickets.detail(id) }); qc.invalidateQueries({ queryKey: LIST }); } });
}
```
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/hooks/useTickets.ts src/api/hooks/useTicket.ts src/api/hooks/useTicketMutations.ts src/api/hooks/useTeam.ts src/api/hooks/useTicketMutations.test.tsx && git commit -m "feat(catreadmin): ticket + team hooks (3d)"`

---

### Task 4: `TicketDetailScreen` (port)

**Files:** Create `src/screens/TicketDetailScreen.tsx`; Test `src/screens/TicketDetailScreen.test.tsx`. Recover: `git show '5660fb0^:screen-support.jsx'` → `TicketDetail`.

**Interfaces:** `export function TicketDetailScreen({ id, onBack }: { id: string; onBack: () => void }): React.ReactElement`

**Port spec:** Convert the prototype `TicketDetail` to JSX. Data: `const detail = useTicket(id)` → `detail.data` is `TicketDetail` (with `messages`). Wrap body in `<QueryBoundary>`. Replace the prototype's faked `thread` state with `detail.data.messages` (`{id,author,role,body,created}` — render author/role badge/when=created/body). Header: priority badge + id + subject; "Open client" → `nav.go('client',{id:detail.data.tenant_id})`; **omit Impersonate** (no endpoint). Reply box (gated `support.manage`): `usePostMessage(id)`; on send → `mutate(reply, { onSuccess: () => { setReply(''); toast({title:'Reply sent'}) }, onError: e => toast({kind:'error',msg:(e as ApiError).message}) })`. Meta panel: status chips + assign-to select (gated `support.manage`) → `usePatchTicket(id)`; status chip → `mutate({status:s},{onSuccess: toast})`; assign select options from `useTeam().data?.data` filtered to active support/admin/owner → `mutate({assignee: val||null},{onSuccess: toast})`. Read-only role: show the "can view but not reply" forbidden note. Imports: `useNav,useToast,Btn,Avatar,StatusBadge,PRIORITY_MAP` from `../components`; `Icon` from `../lib/icons`; `useAuth`; `QueryBoundary`; the hooks; `ApiError`. Call `usePostMessage(id)`/`usePatchTicket(id)` at top level. Local `useState(reply)`.

- [ ] **Step 1: Failing test**
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketDetailScreen } from './TicketDetailScreen';
import { NavCtx, ToastCtx } from '../components';
vi.mock('../api/hooks/useTicket', () => ({ useTicket: () => ({ isLoading: false, isError: false, data: {
  id: 'TKT-1', subject: 'Login broken', tenant_id: 'c1', tenant_name: 'Greenwood', status: 'open', priority: 'high',
  assignee: 'Priya', created: '2026-06-01', updated: '2026-06-02', messages_count: 2,
  messages: [{ id: 'm1', author: 'Admin', role: 'client', body: 'It is down', created: '2d ago' }] } }) }));
vi.mock('../api/hooks/useTicketMutations', () => ({ usePatchTicket: () => ({ mutate: vi.fn() }), usePostMessage: () => ({ mutate: vi.fn() }) }));
vi.mock('../api/hooks/useTeam', () => ({ useTeam: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
describe('TicketDetailScreen', () => {
  it('renders the subject and a thread message', () => {
    render(<NavCtx.Provider value={{ route: { name: 'support', params: {} }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><TicketDetailScreen id="TKT-1" onBack={() => {}} /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Login broken')).toBeInTheDocument();
    expect(screen.getByText('It is down')).toBeInTheDocument();
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** per Port spec.
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/screens/TicketDetailScreen.tsx src/screens/TicketDetailScreen.test.tsx && git commit -m "feat(catreadmin): TicketDetailScreen wired (3d)"`

---

### Task 5: `SupportScreen` (list + sidebar)

**Files:** Create `src/screens/SupportScreen.tsx`; Test `src/screens/SupportScreen.test.tsx`. Recover: `git show '5660fb0^:screen-support.jsx'` → `SupportScreen`.

**Interfaces:** `export function SupportScreen(): React.ReactElement`

**Port spec:** Convert `SupportScreen` to JSX. Data: `const tickets = useTickets({})` → `rows = tickets.data?.pages.flatMap(p => p.data) ?? []`. Filter chips (open/all/resolved/closed; open = status open|pending) + search filter **client-side** over `rows` (subject/tenant_name). Counts from `rows`. List rows: priority badge (`PRIORITY_MAP`), subject, id, `tenant_name`, `messages_count`, `StatusBadge`, assignee/Unassigned, updated. Row click → set local `selectedId`. When `selectedId` set, render `<TicketDetailScreen id={selectedId} onBack={() => setSelectedId(null)} />` (early return, like the prototype's `if (sel)`). Sidebar: reuse the existing `HealthPanel` from `../screens/DashboardScreen`, fed by `useDashboardOverview().data?.system_health ?? []`: `<HealthPanel items={dash.data?.system_health ?? []} />`. Page-head "System health" button → `nav.go('health')`. Wrap the list in `<QueryBoundary>`/`Empty`. Imports: hooks (`useTickets`, `useDashboardOverview`), `HealthPanel`, `TicketDetailScreen`, `useNav,Btn,Avatar,StatusBadge,PRIORITY_MAP,Empty` from components, `Icon`.

- [ ] **Step 1: Failing test**
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupportScreen } from './SupportScreen';
import { NavCtx } from '../components';
vi.mock('../api/hooks/useTickets', () => ({ useTickets: () => ({ isLoading: false, isError: false, data: { pages: [{ data: [
  { id: 'TKT-1', subject: 'Login broken', tenant_id: 'c1', tenant_name: 'Greenwood', status: 'open', priority: 'high', assignee: 'Priya', created: '2026-06-01', updated: '2d', messages_count: 2 },
], next_cursor: null }] } }) }));
vi.mock('../api/hooks/useDashboardOverview', () => ({ useDashboardOverview: () => ({ data: { system_health: [] } }) }));
describe('SupportScreen', () => {
  it('renders ticket rows', () => {
    render(<NavCtx.Provider value={{ route: { name: 'support', params: {} }, go: () => {} }}><SupportScreen /></NavCtx.Provider>);
    expect(screen.getByText('Login broken')).toBeInTheDocument();
  });
});
```
> If `useDashboardOverview` lives at a different path, confirm via `src/api/hooks/` and adjust the mock path.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** per Port spec.
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/screens/SupportScreen.tsx src/screens/SupportScreen.test.tsx && git commit -m "feat(catreadmin): SupportScreen list + health sidebar (3d)"`

---

### Task 6: Routing + gate

**Files:** Modify `src/App.tsx`.

- [ ] **Step 1:** Add `import { SupportScreen } from './screens/SupportScreen';` and in `renderScreen()`'s switch add (preserving Forbidden guard + default): `case 'support': return <SupportScreen />;` (`support` route/ROUTE_PERM/CRUMB already exist).
- [ ] **Step 2: Full gate** — `npm test` (all pass), `npm run typecheck` (clean), `npm run build` (succeeds).
- [ ] **Step 3: Commit** `git add src/App.tsx && git commit -m "feat(catreadmin): wire support route (3d)"`

---

## Self-review (done)

- **Spec coverage:** DTOs+contract (T1) · tickets+team api (T2) · hooks (T3) · TicketDetail (T4) · SupportScreen+sidebar (T5) · routing (T6). All mapped.
- **Type consistency:** Ticket/TicketDetail/TicketMessage/TeamMember/PatchTicketBody defined T1, used T2–T5; qk.tickets/team defined T2, used T3.

## Flagged (verify during implementation)

- `GET /tickets/{id}` payload (ticket + `messages[]`), `TicketMessage` fields, `PATCH` partial body, `POST /messages` `{body}` vs `{text}` — assumed; confirm vs swagger.
- `useDashboardOverview` import path (used for the health sidebar) — confirm under `src/api/hooks/`.
