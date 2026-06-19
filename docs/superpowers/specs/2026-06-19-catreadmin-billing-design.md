# Catre Admin — Billing (Plans · Subscriptions · Invoices) — design

**Date:** 2026-06-19
**Status:** Approved (brainstorming) — ready for implementation plan
**Area:** Catre Super Admin Panel (frontend, `sms-catreadmin`)
**Sub-project:** 3 of 3 (per `docs/api/2026-06-17-catre-admin-frontend-handoff.md` §9) — **Slice 3b of 5**

## Summary

Second write-slice of sub-project 3. Bind the **Billing** surface — Plans catalog (full
CRUD), Subscriptions (read), and Invoices (mark-paid / refund) — to the live backend,
keeping the prototype UI unchanged. Reuses the mutation→invalidation→toast pattern and the
`ConfirmDialog`/`useToast` infrastructure established in slice 3a.

Two nav routes are served by one `BillingScreen` component (ported from `screen-billing.jsx`):
the **Plans** route renders it in `plansOnly` mode (Plans catalog only); the **Billing**
route renders the full tabbed view (Plans · Subscriptions · Invoices) with a past-due banner.
Both currently fall through to the `default` placeholder in `App.tsx` — this slice flips them.

## Decomposition context (sub-project 3 → 5 slices)

| Slice | Status | Scope |
|---|---|---|
| 3a | ✅ complete | Client lifecycle writes + Onboard wizard |
| **3b (this)** | — | Billing: Plans CRUD, Subscriptions, Invoices (+ mark-paid / refund) |
| 3c | pending | Onboarding Kanban |
| 3d | pending | Support / Tickets |
| 3e | pending | Team / Settings / Identity / Audit |

## Goals

- **Plans catalog** lists `GET /plans`, filters by visibility/audience client-side (as the
  prototype does), and supports full lifecycle: **create** (`POST /plans`), **edit**
  (`PATCH /plans/{id}`), **publish/unpublish** (`POST /plans/{id}/publish`) via the ported
  `PlanEditModal` and the card Publish/Edit buttons — all role-gated by `plans.manage`.
- **Subscriptions** renders a read-only table from `GET /subscriptions`; rows navigate to
  client detail.
- **Invoices** lists `GET /invoices`, filters by status, and wires **mark-paid**
  (`POST /invoices/{id}/mark-paid`, gated `billing.manage_invoice`) and **refund**
  (`POST /invoices/{id}/refund`, gated `billing.refund`, `ConfirmDialog`); past-due banner.
- Every mutation invalidates the relevant list and surfaces `ApiError.message` on failure;
  not-yet-live endpoints (plan edit/publish) **degrade to an error toast**, never crash.
- Visuals match `screen-billing.jsx` exactly.

## Non-goals

- **No `POST /subscriptions` UI** — the prototype Subscriptions tab is read-only; creating a
  subscription has no prototype surface. Wire `GET /subscriptions` only.
- **No invoice PDF** — "Download PDF" has no endpoint; the menu item is omitted (not wired
  to a dead action), consistent with 3a's hide-what-has-no-endpoint discipline.
- No Onboarding / Support / Team / Settings / Identity (slices 3c–3e).
- No changes to the shell, auth, RBAC transport, `client.ts`, or slice-3a code.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI source | Port `screen-billing.jsx` 1:1 (BillingScreen + PlansTab + PlanEditModal + SubscriptionsTab + InvoicesTab) | "Keep UI same"; recover from git `5660fb0^` |
| Route mapping | `plans` → `<BillingScreen plansOnly />`; `billing` → `<BillingScreen />` | Matches the prototype's two entry points |
| Plan edit/publish (not yet live) | **Build the full UI**, wire to `PATCH /plans/{id}` + `POST /plans/{id}/publish`; degrade to error toast | User decision; matches handoff §8.5 "build the full layer, degrade cleanly" |
| Invoice "Download PDF" | **Omit** (no endpoint) | No live endpoint; honest UI over a dead button |
| Subscriptions | Read-only `GET /subscriptions` → `Subscription` DTO | Prototype tab is read-only; bind to the real list endpoint, not derived from clients |
| Feature catalog | **Port** `FEATURE_CATALOG`/`TIER_META`/`FEATURE_GROUPS`/labels/notes/tiers to a static TS module | Static client-side constants per handoff §7; required by the New/Edit plan form |
| Mutations | TanStack `useMutation` + `invalidateQueries`; toast at call site | Same pattern as slice 3a |

## Placement & files

New data layer + static catalog + billing screen/components; nothing existing is rewritten.

```
src/api/
  plans.ts            + createPlan(body), getPlan(id), updatePlan(id, body), publishPlan(id, publish)
  subscriptions.ts    listSubscriptions(params)                              // GET /subscriptions
  invoices.ts         listInvoices(params), getInvoice(id),
                      markInvoicePaid(id), refundInvoice(id)
  queryKeys.ts        + qk.plans.detail(id), qk.subscriptions.list(params),
                        qk.invoices.list(params), qk.invoices.detail(id)
  types.ts            + Subscription, Invoice DTOs; + CreatePlanBody/UpdatePlanBody;
                      + SUBSCRIPTION_KEYS (INVOICE_KEYS/PLAN_KEYS already present)
  hooks/
    usePlanMutations.ts     useCreatePlan, useUpdatePlan, usePublishPlan
    useSubscriptions.ts     useInfiniteQuery (cursor) or useQuery
    useInvoices.ts          useInfiniteQuery (cursor)
    useInvoiceMutations.ts  useMarkInvoicePaid, useRefundInvoice
src/lib/
  featureCatalog.ts   FEATURE_CATALOG, TIER_META, FEATURE_LABELS/TIER/NOTE,
                      FEATURE_GROUPS, featuresForTier  (static, ported from data.jsx)
src/screens/
  BillingScreen.tsx   shell: plansOnly vs tabbed; past-due banner; tab routing
src/components/billing/
  PlansTab.tsx  PlanEditModal.tsx  SubscriptionsTab.tsx  InvoicesTab.tsx
src/App.tsx           renderScreen(): + case 'plans' → <BillingScreen plansOnly/>,
                      + case 'billing' → <BillingScreen/>
```

## Tab → endpoint binding

| Tab | Reads | Writes (role-gated) |
|---|---|---|
| **Plans** | `GET /plans` (list), `GET /plans/{id}` | `POST /plans` (create) · `PATCH /plans/{id}` (edit) · `POST /plans/{id}/publish` (publish/unpublish) — all `plans.manage` |
| **Subscriptions** | `GET /subscriptions` | — (read-only) |
| **Invoices** | `GET /invoices`, `GET /invoices/{id}` | `POST /invoices/{id}/mark-paid` (`billing.manage_invoice`, status≠paid) · `POST /invoices/{id}/refund` (`billing.refund`, status=paid, `ConfirmDialog`) |

Filters (Plans visibility/audience tabs, Invoices status chips) stay **client-side** exactly
as the prototype does — the lists are small. List pagination follows the cursor convention
(`useInfiniteQuery`) where the endpoint is paged; "Load more" like the Clients list.

## Plan create/edit (`PlanEditModal`)

Ported verbatim: name, size band, pricing model (flat ₹/mo vs per-student + min students),
promotional offer toggle, availability (public/new/exclusive), visibility (published/draft),
limits (students/staff/storage_gb), and the **school-modules feature matrix** (add modules,
set the tier each unlocks at) driven by the static `featureCatalog`. On Save:
- new plan → `useCreatePlan` (`POST /plans` with `CreatePlanBody`);
- existing plan → `useUpdatePlan` (`PATCH /plans/{id}` with `UpdatePlanBody`).
Card **Publish/Unpublish** → `usePublishPlan(id, publish)` (`POST /plans/{id}/publish`).
All map prototype camelCase (`perStudent`, `minStudents`, `featureTiers`) → snake_case
contract keys (`per_student`, `min_students`, …).

## Types & contract

`types.ts` gains `Subscription` and `Invoice` interfaces (snake_case) plus
`CreatePlanBody`/`UpdatePlanBody`, and a `SUBSCRIPTION_KEYS` entry; `Invoice` aligns to the
existing `INVOICE_KEYS`, `Plan` to `PLAN_KEYS` (from 3a). `types.test.ts` is extended so the
new DTO keys are covered by the contract test. The static `featureCatalog` is **not** a
contract type (client-side only).

## Loading / error / empty

Each tab's data region uses the shared `<QueryBoundary>` (loading skeleton / `ApiError`-aware
error / empty copy). Plan **edit/publish** failures (e.g. 404 until the backend lands them)
surface as an error toast and leave the optimistic state unapplied (invalidate-on-success only).

## Testing / verification

- **Unit (api):** each new function builds the correct method/path/body — `createPlan` (POST
  /plans), `updatePlan` (PATCH /plans/{id}), `publishPlan` (POST /plans/{id}/publish),
  `listSubscriptions`, `listInvoices`, `markInvoicePaid`, `refundInvoice`.
- **Unit (hooks):** each mutation invalidates the right key(s) on success; errors surface
  `ApiError.message`.
- **Unit (UI):** PlansTab renders cards + gates New/Edit/Publish on `plans.manage`;
  PlanEditModal toggles pricing model and feature tiers and Save calls the right mutation;
  InvoicesTab gates mark-paid/refund and confirms refund; SubscriptionsTab rows navigate.
- **Contract test:** `types.test.ts` covers `Subscription`/`Invoice` keys.
- **Local e2e:** against the backend, Invoices list renders; mark-paid flips status after
  invalidation; refund (after confirm) issues; plan create persists; plan edit/publish show
  a clean error toast where the endpoint isn't live yet.
- **Build:** `npm run build` + `npm run typecheck` + `npm test` pass.

## ⚠️ Flagged for verification (during implementation)

- Request/response shapes for `POST /plans`, `PATCH /plans/{id}`, `POST /plans/{id}/publish`,
  `GET /subscriptions`, `GET /invoices`, `POST /invoices/{id}/mark-paid|refund` live in the
  backend contract (`sms-backend/.../swagger.json`), not this repo. Define assumed snake_case
  shapes and verify against the live swagger; adjust `types.ts` + api/ functions if they differ.
- **`Subscription` DTO has no `CONTRACT_KEYS` precedent** — define `SUBSCRIPTION_KEYS` from the
  swagger's subscription schema; the assumed shape (client, plan, status, current period, next
  charge) must be confirmed.
- `publishPlan` body shape (`{ publish: true|false }` vs separate publish/unpublish paths) is
  assumed — confirm against swagger.

## Out of scope / deferred

`POST /subscriptions` UI, invoice PDF, Onboarding Kanban (3c), Support (3d), Team/Settings/
Identity/Audit (3e).
