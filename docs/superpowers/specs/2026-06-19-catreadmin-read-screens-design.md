# Catre Admin — Read Screens Bound Live — design

**Date:** 2026-06-19
**Status:** Approved (brainstorming) — ready for implementation plan
**Area:** Catre Super Admin Panel (frontend, `sms-catreadmin`)
**Sub-project:** 2 of 3 (per `docs/api/2026-06-17-catre-admin-frontend-handoff.md` §9)

## Summary

Bind the **read-heavy surface** of the Catre operator console to the live backend,
matching the Claude Design `index.html` prototype pixel-for-pixel. Five screens move
from placeholder to real, data-driven views: **Dashboard**, **Health**, **Clients
list**, **Client detail**, and **Reports**. All reads go through TanStack Query behind
a single `<QueryBoundary>` that standardizes loading / error / empty states.

The existing foundation — Vite + TS toolchain, `client.ts` (envelope unwrap +
refresh-on-401), `AuthContext`, `rbac.ts`, the app shell (sidebar/topbar/router/guards),
and the `QueryClientProvider` in `main.tsx` — is **untouched**. This sub-project only
adds a typed data layer and the five screens, and flips their routes in
`App.tsx`'s `renderScreen()`.

## Goals

- Dashboard + Health render **real** data from `GET /dashboard/overview`.
- Reports renders `GET /reports/revenue` and exports via authed `GET /reports/clients.csv`.
- Clients list/detail/usage/activity are **built to the documented contract** with
  cursor pagination and server-side filter/sort/search.
- Every read region degrades cleanly (loading → error/empty) — no crashes — so the
  not-yet-live Clients endpoints show honest states until the backend lands.
- Visuals match the imported `index.html` prototype.

## Non-goals

- **No mutations** and no Onboarding / Billing / Support / Team / Settings / Identity
  binding — those are sub-project 3.
- No changes to the shell, auth, RBAC, or the API client's transport behavior.
- **Client-detail student/staff roster stays hidden** (Phase-2 / impersonation data,
  per handoff §8.3).
- No numbered pagination (the API is cursor-based — see Decisions).

## Prerequisite (implementation gate)

To match the prototype pixel-for-pixel, `index.html` from the Claude Design project
(`634cc3d4-99d8-4f2b-84ff-4f505fbce65b`) must be imported via the design connector.
This requires the user to run `/design-login` (or `/login` → "Claude account with
subscription") first. **Implementation does not start until the design file is
readable.** The data layer (hooks, types, query keys) can be specced and reviewed
independently of the visuals, but the screens are built against the imported design.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Design source | `index.html` prototype = pixel-perfect visual truth | User: "keep the views the same"; match exactly, wire backend underneath |
| Scope | Read screens only (sub-project 2) | Smaller, verifiable, ships sooner; mutations are sub-project 3 |
| Clients (not yet live) | Build to contract now, degrade cleanly | Matches handoff DoD; whole read surface done in one pass |
| Clients pagination | **"Load more"** button (cursor) | API is cursor-paged with no total count; numbered pages aren't honest |
| Data fetching | TanStack Query; `useInfiniteQuery` for lists, `useQuery` for reads | Per handoff §6; caching + cursor pagination + standard states |

## Placement & files

New typed data layer + screens; nothing existing is rewritten.

```
src/api/
  queryKeys.ts        key factory: dashboard, clients(list params), client(id),
                      clientUsage(id), clientActivity(id), revenue(params)
  dashboard.ts        getOverview(): DashboardOverview
  clients.ts          listClients(params), getClient(id), getClientUsage(id), getClientActivity(id)
  reports.ts          getRevenue(params), downloadClientsCsv()  // authed blob, Content-Disposition
  types.ts            +DashboardOverview, +RevenueReport DTOs; +CONTRACT_KEYS entries
  hooks/
    useDashboardOverview.ts   useQuery
    useClients.ts             useInfiniteQuery (cursor → next_cursor)
    useClient.ts              useQuery
    useClientUsage.ts         useQuery
    useClientActivity.ts      useQuery
    useRevenueReport.ts       useQuery
src/components/
  QueryBoundary.tsx   loading (skeleton) / error (ApiError-aware) / empty in one place
src/screens/
  DashboardScreen.tsx   ClientsScreen.tsx   ClientDetailScreen.tsx
  HealthScreen.tsx      ReportsScreen.tsx
src/App.tsx           renderScreen(): dashboard|health|clients|client|reports → real screens
                      (onboarding|plans|billing|support|team|settings|identity stay placeholders)
```

## Screen → endpoint binding

| Screen | Endpoint(s) | Notes |
|---|---|---|
| **Dashboard** | `GET /dashboard/overview` | KPI cards, MRR line, plan donut, signup bars, usage alerts, recent activity |
| **Health** | `GET /dashboard/overview` (`system_health`) | Same payload as Dashboard; renders the health panel |
| **Clients list** | `GET /clients?limit&cursor&status&tier&q&sort` | Server-side filter/sort/search; "Load more" cursor pagination |
| **Client detail** | `GET /clients/{id}` `+/usage` `+/activity` | Overview, subscription, usage, activity, contacts; roster hidden |
| **Reports** | `GET /reports/revenue`, `GET /reports/clients.csv` | Revenue analytics + authed CSV blob download (replaces client-side CSV) |

### Charts (length-agnostic)

The MRR / signup series x-axis is driven by the returned `months[]` (handoff §8.1: the
two contract docs disagree on 6 vs 12 — render whatever length comes back). Early-history
flat/zero series (`mrr_series`, churn, net growth) render as **"not enough history yet"**,
not an error (handoff §8.2).

## Loading / error / empty — `<QueryBoundary>`

A single component wraps each screen's data region and takes a query result:

- **loading** → skeleton matching the screen's layout (cards, table rows, chart frames).
- **error** → `ApiError`-aware message. A not-yet-live Clients endpoint (e.g. 404 /
  `not_found` / 5xx) renders "Not available yet" copy rather than crashing — this is how
  Clients degrades today.
- **empty** → list-specific empty-state copy when a successful response has zero rows.

`useInfiniteQuery` for Clients keys on `next_cursor`; the "Load more" button is disabled
and hidden when `next_cursor` is `null`. Filters (`status`, `tier`, `q`, `sort`) are part
of the query key, so changing a filter starts a fresh cursor sequence.

## Types & contract

`types.ts` gains `DashboardOverview` and `RevenueReport` interfaces (snake_case, matching
the contract) and corresponding `CONTRACT_KEYS` entries. The `Client` DTO is the existing
`TENANT_KEYS` shape. `types.test.ts` is extended so the new keys are covered by the
contract test (catches field/enum drift at compile + test time).

## Testing / verification

- **Unit:** new hooks' query-key shape; `downloadClientsCsv()` blob path (auth header
  attached, filename from `Content-Disposition`); `QueryBoundary` renders the three states.
- **Contract test:** `types.test.ts` covers every key in the new DTOs.
- **Local e2e:** against the running backend (`http://localhost:5162/v1` local .NET, or
  `5080` Docker), log in via email-OTP, confirm **Dashboard** and **Reports** render real
  data, and **Clients** shows clean loading → empty/error (endpoints not yet live).
- **Build:** `npm run build` and `npm run typecheck` pass.

## Out of scope / deferred to sub-project 3

Client lifecycle mutations, Onboard wizard, Onboarding Kanban, Billing
(plans/subscriptions/invoices + mark-paid/refund), Support (tickets), Team, Settings,
Identity & Access. Deleting `data.jsx` and mock adapters (already absent here) is tracked
by the handoff but not part of this read-only pass.
