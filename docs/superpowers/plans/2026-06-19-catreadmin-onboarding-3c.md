# Onboarding Kanban (Slice 3c) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Wire the Onboarding Kanban (4 stages, drag-to-advance, per-card checklist) to the live backend, ported 1:1 from `screen-onboarding.jsx`.

**Architecture:** typed DTO → api (`getOnboarding`/`advanceOnboarding`/`patchChecklist`) → TanStack query + mutation hooks → ported `OnboardingScreen` Kanban wired to the `onboarding` route. Reuses the 3a/3b mutation→invalidation→toast pattern.

**Tech Stack:** React 18 + TS, Vite, @tanstack/react-query v5, Vitest + @testing-library/react.

## Global Constraints

- JSON snake_case; base URL includes `/v1` (paths like `/onboarding`, no `/v1` prefix).
- Reads via `listRequest` (raw envelope); single/writes via `request` (unwrap, ApiError, refresh-on-401).
- Mutations: `useMutation` + `invalidateQueries`; toast at the call site via `mutate(vars, {onSuccess,onError})`. Hooks invalidation-only.
- RBAC UI-gating via `useAuth().can` — `onboarding.view` (route), `onboarding.manage` (drag/toggle), `clients.start_trial` (New client button). All exist in `src/auth/rbac.ts`.
- Keep design unchanged: port markup/classes verbatim. Recover with `git show '5660fb0^:screen-onboarding.jsx'`. Convert `React.createElement`→JSX, `window.*`→imports.
- No new deps. End each task green: `npm test`, `npm run typecheck`.
- Do NOT touch pre-existing uncommitted changes (App.test.tsx, LoginScreen.tsx, styles.css).

---

### Task 1: DTO & contract

**Files:** Modify `src/api/types.ts`; Test `src/api/types.test.ts`.

**Produces:** `OnboardingStage = 'lead'|'trial'|'onboarding'|'active'`; `ChecklistItem = { label: string; done: boolean }`; `OnboardingCard = { id, name, value, owner, age, stage, checklist }`; `ONBOARDING_KEYS` in CONTRACT_KEYS.

- [ ] **Step 1: Failing test** — add to `EXPECTED` in `types.test.ts`:
```ts
  ONBOARDING_KEYS: ['id','name','value','owner','age','stage','checklist'],
```
and append:
```ts
import { CONTRACT_KEYS, type OnboardingCard } from './types';
describe('OnboardingCard', () => {
  it('covers ONBOARDING_KEYS', () => {
    const k: Record<keyof OnboardingCard, true> = { id:true, name:true, value:true, owner:true, age:true, stage:true, checklist:true };
    expect(Object.keys(k).sort()).toEqual([...CONTRACT_KEYS.ONBOARDING_KEYS].sort());
  });
});
```
- [ ] **Step 2: Run → fail** (`npm test -- src/api/types.test.ts`).
- [ ] **Step 3: Implement** — append to `types.ts`:
```ts
export type OnboardingStage = 'lead' | 'trial' | 'onboarding' | 'active';
export interface ChecklistItem { label: string; done: boolean; }
export interface OnboardingCard {
  id: string; name: string; value: number; owner: string; age: number;
  stage: OnboardingStage; checklist: ChecklistItem[];
}
```
and add `ONBOARDING_KEYS: ['id','name','value','owner','age','stage','checklist'],` to `CONTRACT_KEYS`.
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/types.ts src/api/types.test.ts && git commit -m "feat(catreadmin): OnboardingCard DTO + contract (3c)"`

---

### Task 2: Onboarding API + query key

**Files:** Create `src/api/onboarding.ts`; Modify `src/api/queryKeys.ts`; Test `src/api/onboarding.test.ts`.

**Produces:**
- `getOnboarding(): Promise<ListEnvelope<OnboardingCard>>` → `GET /onboarding`
- `advanceOnboarding(id, stage: OnboardingStage): Promise<OnboardingCard>` → `POST /onboarding/{id}/advance`, body `{ stage }`
- `patchChecklist(id, index: number, done: boolean): Promise<OnboardingCard>` → `PATCH /onboarding/{id}/checklist`, body `{ index, done }`
- `qk.onboarding.list()`

- [ ] **Step 1: Failing test** `src/api/onboarding.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOnboarding, advanceOnboarding, patchChecklist } from './onboarding';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('onboarding api', () => {
  it('getOnboarding GETs /onboarding', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'o1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await getOnboarding(); expect(out).toEqual({ data: [{ id: 'o1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/onboarding');
  });
  it('advanceOnboarding POSTs /onboarding/{id}/advance with { stage }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'o1', stage: 'trial' } })); vi.stubGlobal('fetch', f);
    await advanceOnboarding('o1', 'trial'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/onboarding/o1/advance'); expect(i.method).toBe('POST'); expect(JSON.parse(i.body)).toEqual({ stage: 'trial' });
  });
  it('patchChecklist PATCHes /onboarding/{id}/checklist with { index, done }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'o1' } })); vi.stubGlobal('fetch', f);
    await patchChecklist('o1', 2, true); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/onboarding/o1/checklist'); expect(i.method).toBe('PATCH'); expect(JSON.parse(i.body)).toEqual({ index: 2, done: true });
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `src/api/onboarding.ts`:
```ts
import { request, listRequest } from './client';
import type { OnboardingCard, OnboardingStage, ListEnvelope } from './types';

export function getOnboarding(): Promise<ListEnvelope<OnboardingCard>> {
  return listRequest<ListEnvelope<OnboardingCard>>('/onboarding');
}
export function advanceOnboarding(id: string, stage: OnboardingStage): Promise<OnboardingCard> {
  return request<OnboardingCard>(`/onboarding/${id}/advance`, { method: 'POST', body: { stage } });
}
export function patchChecklist(id: string, index: number, done: boolean): Promise<OnboardingCard> {
  return request<OnboardingCard>(`/onboarding/${id}/checklist`, { method: 'PATCH', body: { index, done } });
}
```
Add to `qk` in `queryKeys.ts`: `onboarding: { list: () => ['onboarding', 'list'] as const },`
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/onboarding.ts src/api/queryKeys.ts src/api/onboarding.test.ts && git commit -m "feat(catreadmin): onboarding api + key (3c)"`

---

### Task 3: Onboarding hooks

**Files:** Create `src/api/hooks/useOnboarding.ts`, `src/api/hooks/useOnboardingMutations.ts`; Test `src/api/hooks/useOnboardingMutations.test.tsx`.

**Produces:**
- `useOnboarding()` → `useQuery(qk.onboarding.list(), getOnboarding)`
- `useAdvanceOnboarding()` → `mutate({ id, stage })`; invalidates `['onboarding','list']`
- `usePatchChecklist()` → `mutate({ id, index, done })`; invalidates `['onboarding','list']`

- [ ] **Step 1: Failing test** (mirror `useInvoiceMutations.test.tsx`):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('../onboarding', () => ({
  advanceOnboarding: vi.fn().mockResolvedValue({ id: 'o1', stage: 'trial' }),
  patchChecklist: vi.fn().mockResolvedValue({ id: 'o1' }),
}));
import { useAdvanceOnboarding } from './useOnboardingMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
describe('useAdvanceOnboarding', () => {
  it('invalidates the onboarding list on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAdvanceOnboarding(), { wrapper: wrapper(qc) });
    result.current.mutate({ id: 'o1', stage: 'trial' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['onboarding', 'list'] });
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

`useOnboarding.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { getOnboarding } from '../onboarding';
import { qk } from '../queryKeys';
export function useOnboarding() {
  return useQuery({ queryKey: qk.onboarding.list(), queryFn: getOnboarding });
}
```
`useOnboardingMutations.ts`:
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceOnboarding, patchChecklist } from '../onboarding';
import type { OnboardingStage } from '../types';
const LIST = ['onboarding', 'list'] as const;
export function useAdvanceOnboarding() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, stage }: { id: string; stage: OnboardingStage }) => advanceOnboarding(id, stage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
export function usePatchChecklist() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, index, done }: { id: string; index: number; done: boolean }) => patchChecklist(id, index, done),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
```
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/api/hooks/useOnboarding.ts src/api/hooks/useOnboardingMutations.ts src/api/hooks/useOnboardingMutations.test.tsx && git commit -m "feat(catreadmin): onboarding hooks (3c)"`

---

### Task 4: `OnboardingScreen` (Kanban port)

**Files:** Create `src/screens/OnboardingScreen.tsx`; Test `src/screens/OnboardingScreen.test.tsx`. Recover: `git show '5660fb0^:screen-onboarding.jsx'`.

**Port spec:** Convert the prototype `OnboardingScreen` to JSX verbatim (4-column grid, draggable cards, progress bar, expandable checklist, owner/age footer, drop zones, page-head with "New client" button). Replace globals:
- `window.{fmt,Avatar,Btn,useNav,useToast}` → `import { fmt, Avatar, Btn, useNav, useToast } from '../components';`
- `window.useCan` → `useAuth().can` (`import { useAuth } from '../auth/AuthContext';`); `window.Can(...)` → inline `{can('clients.start_trial') && <Btn ...>}`
- `window.Icon` → `import { Icon } from '../lib/icons';`
- `<QueryBoundary>` from `../components/QueryBoundary` wrapping the board.

Data: `const board = useOnboarding();` → group `board.data?.data ?? []` by `card.stage` into the 4 `COLS`. Each card's `checklist` is `ChecklistItem[]` (already `{label,done}` — no need to derive from a `done` count as the prototype did with `DB.ONBOARDING`).

Wiring (replace the prototype's local `setBoard` state mutations with server calls — the board is server-owned, refetched via invalidation):
- **Drag drop** on a column → `useAdvanceOnboarding().mutate({ id: drag.id, stage: col.key }, { onSuccess: () => toast({title:'Moved to '+col.title, msg:'Pipeline updated.'}), onError: e => toast({kind:'error', title:'Move failed', msg:(e as ApiError).message}) })`. Gate drag on `can('onboarding.manage')`.
- **Checklist item toggle** → `usePatchChecklist().mutate({ id: card.id, index: i, done: !item.done }, { onError: e => toast(...) })`. Gate on `can('onboarding.manage')`.
- **New client** → `nav.go('onboard')`, gated `can('clients.start_trial')`.
- Local-only UI state (`drag`, `dragOver`, per-card `expand`) stays in `useState`.

Call the two mutation hooks ONCE at the top of `OnboardingScreen` (they take vars at `.mutate()` time), pass handlers down to the nested `Card`/columns — do NOT call hooks inside `.map()`.

`ApiError` type from `../api/ApiError`.

- [ ] **Step 1: Failing test** `src/screens/OnboardingScreen.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingScreen } from './OnboardingScreen';
import { NavCtx, ToastCtx } from '../components';

vi.mock('../api/hooks/useOnboarding', () => ({ useOnboarding: () => ({ isLoading: false, isError: false, data: { data: [
  { id: 'o1', name: 'Greenwood', value: 50000, owner: 'Ravi K', age: 3, stage: 'trial', checklist: [{ label: 'Kickoff', done: true }, { label: 'Import', done: false }] },
] } }) }));
vi.mock('../api/hooks/useOnboardingMutations', () => ({
  useAdvanceOnboarding: () => ({ mutate: vi.fn() }),
  usePatchChecklist: () => ({ mutate: vi.fn() }),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('OnboardingScreen', () => {
  it('renders cards grouped into stage columns', () => {
    render(<NavCtx.Provider value={{ route: { name: 'onboarding', params: {} }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><OnboardingScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Greenwood')).toBeInTheDocument();
    expect(screen.getByText('Trial')).toBeInTheDocument(); // column header
  });
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** per Port spec.
- [ ] **Step 4: Run → pass.** `npm run typecheck`.
- [ ] **Step 5: Commit** `git add src/screens/OnboardingScreen.tsx src/screens/OnboardingScreen.test.tsx && git commit -m "feat(catreadmin): Onboarding Kanban wired (3c)"`

---

### Task 5: Routing + gate

**Files:** Modify `src/App.tsx`; Test extend not required (covered by screen test). Recover none.

- [ ] **Step 1:** In `src/App.tsx`, add `import { OnboardingScreen } from './screens/OnboardingScreen';` with the other imports, and in `renderScreen()`'s switch add (preserving Forbidden guard + default): `case 'onboarding': return <OnboardingScreen />;`
- [ ] **Step 2: Full gate** — `npm test` (all pass), `npm run typecheck` (clean), `npm run build` (succeeds).
- [ ] **Step 3: Commit** `git add src/App.tsx && git commit -m "feat(catreadmin): wire onboarding route (3c)"`

---

## Self-review checklist (done)

- **Spec coverage:** DTO+contract (T1) · api (T2) · hooks (T3) · Kanban screen with drag→advance + checklist→patch (T4) · routing (T5). All mapped.
- **Placeholder scan:** data-layer tasks full code; screen task = git recovery + port/wire spec + test.
- **Type consistency:** `OnboardingCard`/`OnboardingStage`/`ChecklistItem` defined in T1, used in T2–T4; `qk.onboarding.list` defined T2, used T3.

## Flagged (verify during implementation)

- `GET /onboarding` shape (flat list w/ `stage`), `advance` body `{stage}`, `checklist` body `{index,done}` are assumed snake_case — confirm against swagger; adjust T1/T2 if different.
- Backward drag may be rejected by `/advance` (forward-only) → error toast; acceptable.
