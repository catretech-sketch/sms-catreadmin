# Catre Admin — Client Lifecycle Writes + Onboard Wizard — design

**Date:** 2026-06-19
**Status:** Approved (brainstorming) — ready for implementation plan
**Area:** Catre Super Admin Panel (frontend, `sms-catreadmin`)
**Sub-project:** 3 of 3 (per `docs/api/2026-06-17-catre-admin-frontend-handoff.md` §9) — **Slice 3a of 5**

## Summary

First write-slice of sub-project 3. Wire the **client lifecycle mutations** and the
**Onboard wizard** to the live backend, keeping the existing UI unchanged. This is the
slice that **establishes the mutation pattern** (`useMutation` → `invalidateQueries` →
toast, with `ConfirmDialog` gating) that every later write-slice (Billing, Onboarding,
Support, Team) reuses.

The read surface (sub-project 2) is untouched: Dashboard, Health, Clients list/detail,
Reports stay as-is. This slice only adds a mutation data layer, two UI pieces ported
from the prototype (`<ClientActions>` + `<ChangePlanModal>`, the `OnboardWizard` screen),
and flips the `onboard` route in `App.tsx`'s `renderScreen()`.

## Decomposition (sub-project 3 → 5 slices)

Sub-project 3 is too large for one spec/plan/implementation cycle. It is delivered as
five independently shippable slices, each its own spec → plan → implementation:

| Slice | Scope | Prototype source |
|---|---|---|
| **3a (this)** | Client lifecycle writes + Onboard wizard | `client-actions.jsx`, `screen-onboard.jsx` |
| 3b | Billing: Plans CRUD, Subscriptions, Invoices (+ mark-paid / refund) | `screen-billing.jsx` |
| 3c | Onboarding Kanban (advance / checklist) | `screen-onboarding.jsx` |
| 3d | Support: Tickets (+ messages, PATCH) | `screen-support.jsx` |
| 3e | Team / Settings / Identity & Access / Audit | `screen-team-settings.jsx`, `screen-identity.jsx` |

Order rationale: 3a is prerequisite-free, hangs off the existing Clients/Client-detail
screens (no new shell wiring beyond the already-registered `onboard` route), and defines
the reusable write pattern. Billing (3b) is the highest-value surface next.

## Goals

- **Onboard wizard** (`screen-onboard.jsx`, ported verbatim) creates a real client via
  `POST /clients` and navigates to the clients list on success.
- **Client lifecycle actions** on Client-detail drive `POST /clients/{id}/status`:
  `start_trial`, `activate`, `suspend`, `reinstate`, `cancel` — status-gated per the
  prototype's `byStatus` map.
- **Change plan** drives `POST /clients/{id}/change-plan` via the ported
  `<ChangePlanModal>`, populated from a read-only `GET /plans`.
- Establish the **mutation → invalidation → toast** pattern + `ConfirmDialog` gating as
  the template for slices 3b–3e.
- Every mutation surfaces backend errors honestly (403 → forbidden, 422 → validation,
  409 → conflict) via toast; no crashes.

## Non-goals

- **No Delete, no Impersonate.** Neither `DELETE /clients/{id}` nor
  `/clients/{id}/impersonate` is in the live swagger, so those prototype actions stay
  **hidden** in 3a (Impersonation is deferred per handoff §8.4). They light up when their
  endpoints land.
- **No Plans CRUD** — only a read-only `GET /plans` to populate the change-plan modal.
  Create / publish / edit plans is slice 3b.
- No Subscriptions / Invoices / Onboarding-Kanban / Support / Team / Settings / Identity
  binding — slices 3b–3e.
- No changes to the shell, auth, RBAC transport, `client.ts`, or the read screens/hooks.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI source | Port `client-actions.jsx` + `screen-onboard.jsx` 1:1 | "Keep the UI the same"; recover exact design from git (`5660fb0^`) |
| Actions placement | `<ClientActions client>` component (status-driven set) + `<ChangePlanModal>`, rendered on Client-detail | Reusable, mirrors prototype; inlining into the screen loses reuse |
| Mutation layer | TanStack `useMutation` + targeted `invalidateQueries` | Per handoff §6; the pattern all later slices copy |
| Plans here | Read-only `GET /plans` (`usePlans`) | Change-plan modal needs the list; full CRUD is 3b — don't over-build |
| Delete / Impersonate | **Hidden** (no live endpoint) | Wire only endpoints that exist; honest UI over dead buttons |
| Confirm gating | `ConfirmDialog` for every lifecycle action (prototype copy); suspend/cancel use `danger` | Prototype confirms all lifecycle transitions; only `change_plan` uses a modal instead. "Keep UI same" |

## Placement & files

New mutation data layer + two UI pieces; nothing existing is rewritten.

```
src/api/
  plans.ts              listPlans(): Plan[]                       // read-only (full CRUD = 3b)
  clients.ts            + createClient(body), setClientStatus(id, action), changeClientPlan(id, plan_id)
  queryKeys.ts          + qk.plans.list()
  types.ts              + Plan, CreateClientBody, ClientStatusAction; + CONTRACT_KEYS entries
  hooks/
    usePlans.ts                 useQuery(qk.plans.list)
    useClientMutations.ts       useCreateClient, useSetClientStatus, useChangeClientPlan
                                 (each: useMutation + invalidate clients.list & clients.detail(id) + toast)
src/components/
  ClientActions.tsx     status-driven action set (Btn + Menu) + ChangePlanModal; ConfirmDialog gating
src/screens/
  OnboardWizard.tsx     ported screen-onboard.jsx; real POST /clients via useCreateClient
  ClientsScreen.tsx     + "Onboard client" button → go('onboard') (role-gated clients.create)
  ClientDetailScreen.tsx + render <ClientActions client={detail.data} />
src/App.tsx             renderScreen(): + case 'onboard' → <OnboardWizard/>   (route already registered)
```

## Action → endpoint binding

| UI action | Endpoint | Request (assumed snake_case — verify §Flagged) | Invalidates |
|---|---|---|---|
| Onboard → Create client | `POST /clients` | `{ name, slug, country, size, admin_name, admin_email, admin_phone, plan_id, trial_days }` | `clients.list` |
| Start trial / Activate / Suspend / Reinstate / Cancel | `POST /clients/{id}/status` | `{ action: 'start_trial' \| 'activate' \| 'suspend' \| 'reinstate' \| 'cancel' }` | `clients.detail(id)`, `clients.list` |
| Change plan | `POST /clients/{id}/change-plan` | `{ plan_id }` | `clients.detail(id)`, `clients.list` |
| (modal data) Plans | `GET /plans` | — | — |

Status → available actions (from the prototype's `byStatus`):

| Status | Actions |
|---|---|
| `trial` | activate · change_plan · cancel |
| `active` | change_plan · suspend · cancel |
| `suspended` | reinstate · cancel |
| `cancelled` | start_trial |

(`impersonate` and `delete` removed vs. prototype — no live endpoint.)

## Mutation pattern (the reusable template)

Each mutation hook:

```
useMutation({
  mutationFn,                               // calls the api/ function
  onSuccess: () => { invalidate(detail+list); toast({ kind:'success', ...copy }); },
  onError:   (e: ApiError) => toast({ kind:'error', title:..., msg: e.message }),
})
```

- **Confirm gating:** every lifecycle action (`start_trial` / `activate` / `suspend` /
  `reinstate` / `cancel`) opens `ConfirmDialog` with the prototype's `confirm` copy before
  firing — matching the prototype, where only `change_plan` skips confirmation (modal instead).
  `suspend` / `cancel` additionally use `danger` styling.
- **Change plan:** `<ChangePlanModal>` lists active plans from `usePlans`; "Update plan"
  is disabled while the selection equals the current plan; on confirm → `changeClientPlan`.
- **Error semantics:** `ApiError.code` drives the toast — `forbidden` (403),
  `validation_error` (422), `conflict` (409) each get honest copy; the action's optimistic
  state is not applied (we invalidate on success only).
- **Pending state:** action buttons disable while their mutation `isPending`.

## Onboard wizard

`OnboardWizard.tsx` ports `screen-onboard.jsx`: 5-step stepper (School details → Admin
contact → Plan & tier → Trial length → Review), same fields, same client-side validation
(name/slug required; valid admin email). Differences from the prototype:

- Plan list in step 3 comes from `usePlans` (live) instead of `DB.PLANS`.
- `create()` calls `useCreateClient` against `POST /clients`; on success → success toast +
  `nav.go('clients')`; on error → error toast, stay on the Review step.
- "Create client" button shows pending state while the mutation is in flight.

## Types & contract

`types.ts` gains `Plan` (id, name, price, color, popular, active, desc, `limits {students,
staff, storage_gb}`), `CreateClientBody`, and a `ClientStatusAction` union, plus
`CONTRACT_KEYS` entries. `types.test.ts` is extended so the new keys are covered by the
contract test (catches field/enum drift at compile + test time).

## Testing / verification

- **Unit (api):** `createClient` / `setClientStatus` / `changeClientPlan` build the
  correct method, path, and body; `listPlans` hits `GET /plans`.
- **Unit (hooks):** each mutation invalidates `clients.detail(id)` and `clients.list` on
  success; `onError` surfaces `ApiError.message`.
- **Unit (UI):** `ClientActions` renders the right action set per status, hides
  delete/impersonate, and gates suspend/cancel behind `ConfirmDialog`; `OnboardWizard`
  blocks Continue on invalid steps and calls `createClient` then navigates on submit.
- **Contract test:** `types.test.ts` covers `Plan` / `CreateClientBody` keys.
- **Local e2e:** against the running backend, onboard a client → it appears in the list;
  suspend/reinstate/cancel a client → status badge updates after invalidation; change plan
  → MRR/plan reflect the new plan.
- **Build:** `npm run build` + `npm run typecheck` + `npm test` pass.

## ⚠️ Flagged for verification (during implementation)

The exact request/response shapes for `POST /clients`, `POST /clients/{id}/status`, and
`POST /clients/{id}/change-plan` are defined in the backend contract
(`sms-backend/docs/api/catreadmin-api.md` / `/swagger/catre-admin/swagger.json`), not in
this repo. The shapes above are the **assumed** snake_case contract; confirm them against
the live swagger before/while wiring, and adjust `types.ts` + the api/ functions if the
backend differs (e.g. `{ status }` vs `{ action }` on the status endpoint).

## Out of scope / deferred

Delete + Impersonate client (no endpoint), Plans/Subscriptions/Invoices (3b), Onboarding
Kanban (3c), Support/Tickets (3d), Team/Settings/Identity/Audit (3e).
