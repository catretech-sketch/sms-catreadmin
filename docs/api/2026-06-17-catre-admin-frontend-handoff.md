# Catre Admin — Frontend Handoff: Mock Removal & Production Live-Backend Binding

**Date:** 2026-06-17
**Repo:** `sms-catreadmin`
**Companion (backend side):** `sms-backend/docs/api/2026-06-17-catre-admin-frontend-handoff.md`,
`sms-backend/docs/api/catreadmin-api.md` (full forward contract),
`sms-backend/docs/2026-06-13-backend-api-design.md` (platform design).

This is the **master design + integration reference** for removing all mock data from the Catre
super-admin frontend and binding it to the real `.NET 10` backend, production-grade. It also defines
the **sequenced sub-projects** this work is split into — each gets its own spec → plan →
implementation cycle.

---

## 1. Goal

Replace the no-build CDN React prototype (all data baked into `data.jsx`) with a real, deployable
app that talks to the live backend end-to-end. "Production-level" means: env-based config, real
JWT + rotating-refresh auth, cursor pagination, typed contracts, proper loading/error handling,
build/deploy tooling — no mock data.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Build tooling | **Vite + React** | Real bundler, env vars, code-splitting, deployable |
| Language | **TypeScript** | Contract is precisely typed; catch field/enum drift at compile time |
| Data fetching | **TanStack Query** (`@tanstack/react-query`) | Caching, cursor pagination, mutations + invalidation, loading/error |
| Binding scope | **Full live binding, no mock fallback** | Backend ships Phase 1 in parallel; `data.jsx` is deleted |
| Auth | **Real email-OTP** (password optional); demo logins + role-switcher **removed** | Role comes from the token via `/auth/me`; server is source of truth |
| Bootstrap login | Seeded platform admin **`catre.tech@gmail.com`** | Backend auto-provisions it on startup; further users via Team invite |
| Delivery | **3 sequenced sub-projects** (§9) | Migration is large; each phase shippable & verifiable |

## 3. Conventions (from the backend contract)

- Base URL: `{VITE_API_BASE_URL}` already including `/v1` (e.g. `http://localhost:8080/v1`).
- **snake_case** JSON, request and response. Dates ISO-8601 UTC; money INR `decimal(18,2)`.
- Success: single `{ "data": {…} }`; list `{ "data": [...], "next_cursor": "…"|null }`.
- Error: `{ "error": { "code", "message", "details"|null } }`. Codes: `invalid_credentials`,
  `invalid_token`, `unauthorized`, `forbidden`, `not_found`, `validation_error` (422),
  `conflict` (409), `rate_limited` (429), `internal_error` (500).
- `Authorization: Bearer <access_token>` on every endpoint except `/auth/otp/*` and `/auth/refresh`.
- `X-Tenant-Id` **only** while impersonating a school (§7).
- Lists are **cursor-paged**: `?limit=50&cursor=…` → `next_cursor` (null = last page).

## 4. Target architecture & project structure

```
sms-catreadmin/
  index.html              vite entry → src/main.tsx
  package.json  vite.config.ts  tsconfig.json
  .env.example            VITE_API_BASE_URL=http://localhost:8080/v1
  src/
    main.tsx              root: QueryClientProvider + AuthProvider + ToastHost
    App.tsx               shell: sidebar, topbar, router, route guards
    config.ts             import.meta.env → { apiBaseUrl }
    api/
      client.ts           fetch wrapper: base URL, Bearer, {data} unwrap, error→ApiError, 401→refresh→retry
      auth.ts             otpRequest / otpVerify / refresh / me / logout / setPassword + token store
      types.ts            DTOs + enums (Client, Plan, Invoice, Ticket, …) — supersedes api/contracts.js
      clients.ts plans.ts subscriptions.ts invoices.ts onboarding.ts
      tickets.ts team.ts audit.ts settings.ts dashboard.ts reports.ts
      queryKeys.ts        central query-key factory
      hooks/*.ts          useClients, useClient, useSuspendClient, useMarkPaid, …
    auth/   AuthContext.tsx  useAuth.ts  rbac.ts   (ROLES / MATRIX / can / PERMISSION_CATALOG — UI gating only)
    components/  ← ui.jsx primitives, typed (Btn, Modal, Menu, Toast, Avatar, Can…)
    lib/         ← lib.jsx (icons, SVG charts, fmt)
    screens/     ← the 10 screens as .tsx
    styles.css   ← unchanged design tokens, imported in main.tsx
```

The existing `api/contracts.js` + `adapter.js` are mock→DTO mappers. With no mock, the adapters are
**deleted**; `contracts.js` is reborn as `src/api/types.ts`, and `adapter.test.js` becomes a TS
**contract test** asserting `types.ts` covers every documented key.

## 5. API client & auth

- **`client.ts`** — one typed `request<T>()`: prepends base URL, attaches `Authorization: Bearer`,
  unwraps `{data}`, throws typed `ApiError {status, code, message, details}`. On `401 invalid_token`
  it calls `/auth/refresh` **once**, retries the original request; if refresh fails → clear tokens →
  bounce to login.
- **Tokens** — access token in memory; refresh token in `localStorage`; session rehydrated on load
  via `GET /auth/me`. *(The backend returns the refresh token in the JSON body, so localStorage is
  the available option. A httpOnly-cookie refresh would be more XSS-resistant but requires a backend
  change — flagged, not blocking.)*
- **Login flow** (replaces the faked banner):
  1. `POST /auth/otp/request { identifier: "catre.tech@gmail.com" }` → always `200 {data:{sent:true}}`.
  2. User enters the 6-digit code emailed to them (valid 10 min).
  3. `POST /auth/otp/verify { identifier, code }` → `{ access_token, refresh_token }`.
  4. `GET /auth/me` → `{ id, tenant_id:null, roles:[…] }`; role drives nav/route gating.
  - Password mode kept as the optional `/auth/login` path (admin may `POST /auth/set-password`).
  - **Removed:** one-click demo logins, topbar role-switcher, `DEMO_ROLES`. Topbar shows the real role.
- **Refresh** is rotating: always store the newly returned refresh token; old one is revoked on use.

## 6. Data fetching (TanStack Query)

- Lists (`clients`, `invoices`, `tickets`, `audit`) → `useInfiniteQuery` keyed on `next_cursor`;
  today's client-side paginate/sort/filter become **query params** (`status`, `tier`, `q`, `sort`).
- Detail/overview reads → `useQuery`.
- Mutations → `useMutation` + targeted `invalidateQueries`:
  client lifecycle (start_trial/activate/change_plan/suspend/reinstate/cancel/delete/impersonate),
  invoice mark-paid/refund, plan create/patch/publish, ticket patch/reply, onboarding
  advance/checklist, team invite/patch, settings patch.
- A shared `<QueryBoundary>` standardizes loading / error / empty states.

## 7. Screen → endpoint map

| Screen | Endpoints |
|---|---|
| Login | `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/me`, `/auth/logout` |
| Dashboard + Health | `GET /dashboard/overview` (counts, mrr, series, plan_mix, usage_alerts, system_health, recent_activity) |
| Clients + Detail | `/clients` (list, paged, filter, sort), `/clients/{id}`, `/usage`, `/activity`, `/status`, `/change-plan`, `DELETE /clients/{id}`, `/impersonate` |
| Onboard wizard | `POST /clients` |
| Onboarding (Kanban) | `/onboarding`, `/{id}/advance`, `/{id}/checklist` |
| Billing → Plans | `/plans`, `/plans/{id}`, `POST`/`PATCH`, `/plans/{id}/publish` |
| Billing → Subscriptions | `/subscriptions` |
| Billing → Invoices | `/invoices`, `/{id}/mark-paid`, `/{id}/refund` |
| Support | `/tickets`, `/tickets/{id}` (+ messages), `PATCH /tickets/{id}`, `/tickets/{id}/messages` |
| Team / Settings | `/team` (+ invite/patch), `/settings` |
| Identity & Access | client-side `MATRIX` / `PERMISSION_CATALOG` (no permissions endpoint in the contract) |
| Reports | `/reports/revenue`, `GET /reports/clients.csv` (blob download with auth header) |

**Static client-side constants kept** (not API-backed): `FEATURE_CATALOG`/labels/tiers, `TIER_META`,
`ROLES`, `MATRIX`, `PERMISSION_CATALOG`. RBAC is **UI-gating only** — the server enforces the real
matrix (403 on violation).

## 8. Open items / flagged discrepancies

1. **`months` length**: the backend handoff doc shows **6** elements; `catreadmin-api.md` shows
   **12**. Charts will be **length-agnostic** (x-axis driven by the returned `months[]`). Confirm
   against the live response.
2. **Early-history zeros**: `mrr_series`, `churn_pct`, `gross_churn_pct`, `net_growth` come from a
   monthly snapshot with no backfill — render flat/0 early series as "not enough history yet", not
   an error.
3. **Client-detail student/staff roster** (`rosterFor` in the prototype) has **no Catre Phase-1
   endpoint** — that is school (Phase-2) data, reachable only via impersonation. **Decision:** hide
   that sub-view until impersonation/school endpoints land.
4. **Impersonation**: `/clients/{id}/impersonate` returns a read-only tenant-scoped token, but the
   school console endpoints are Phase-2. **Decision:** wire the action + banner; land on a
   "school console coming soon" placeholder for now.
5. **Backend endpoint readiness**: today only **auth (email-OTP)**, **`/dashboard/overview`**, and
   **`/reports/revenue`** return real data; the rest of §7 is the documented forward contract. We
   build the full layer now; screens whose endpoints aren't live yet must degrade to clean
   loading/error states (verified in §10), not crash.

## 9. Delivery — sequenced sub-projects

Each is independently shippable and verifiable; each gets its own spec → plan → implementation.

### Sub-project 1 — Foundation: Vite + TS scaffold, API client, live auth
Vite + React + TS toolchain; `styles.css` + `lib`/`components` ported and typed; `config.ts`;
`api/client.ts` (envelope, errors, refresh-on-401); `auth.ts` + `AuthContext` + `rbac.ts`;
**Login screen wired to real email-OTP** end-to-end against the seeded `catre.tech@gmail.com`;
app shell (sidebar/topbar/router/guards) with real role from `/auth/me`; demo controls removed.
**DoD:** `npm run dev`, log in with a real emailed OTP, land on the (empty/loading) shell with
correct role-gated nav; build passes; client unit tests + contract test green.

### Sub-project 2 — Read screens bound live
Bind the read-heavy surface to TanStack Query: **Dashboard + Health** (`/dashboard/overview`),
**Clients list + detail + usage/activity** (cursor pagination, filters, sort), **Reports**
(`/reports/revenue` + CSV export). `<QueryBoundary>` for loading/error/empty.
**DoD:** against a local backend, dashboard and reports render real data; clients list paginates and
filters server-side; not-yet-live detail sub-views degrade cleanly.

### Sub-project 3 — Mutations & remaining screens
Wire all writes + remaining screens: client lifecycle actions, **Onboard wizard**, **Onboarding**
Kanban, **Billing** (plans/subscriptions/invoices incl. mark-paid/refund), **Support** (tickets +
replies), **Team**, **Settings**, **Identity & Access**. Mutation → invalidation; optimistic where
safe; 403/422/429 handling surfaced in the UI. Delete `data.jsx` and the mock adapters entirely.
**DoD:** every screen operates against live endpoints (or degrades cleanly where backend Phase 1 is
pending); zero references to `data.jsx`; full smoke pass.

## 10. Verification

- **Unit**: `client.ts` (envelope unwrap, error mapping, refresh-on-401-once), `rbac.can`.
- **Contract test (TS)**: `types.ts` covers every key in the contract (reborn `adapter.test`).
- **Local e2e**: `docker compose up` in `sms-backend`, set `VITE_API_BASE_URL` to it, smoke
  login → dashboard → reports (the 3 live endpoints); confirm not-yet-live screens degrade to clean
  loading/error rather than crashing.

## 11. Local dev / env

```
# 1. backend
cd ../sms-backend && docker compose up        # API + SQL Server; seeds catre.tech@gmail.com admin

# 2. frontend
cp .env.example .env                           # VITE_API_BASE_URL=http://localhost:8080/v1
npm install && npm run dev
```
Log in via email-OTP as `catre.tech@gmail.com` (code arrives by the backend's email sender; SMS is a
stub — use email). Additional team logins are created through the in-app Team invite flow.

## 12. References

- `sms-backend/docs/api/catreadmin-api.md` — full endpoint contract (the authority for §7).
- `sms-backend/docs/api/2026-06-17-catre-admin-frontend-handoff.md` — what the backend has live now.
- `sms-backend/docs/2026-06-13-backend-api-design.md` — platform architecture & phases.
- `sms-catreadmin/api/contracts.js` — current canonical key list (→ `src/api/types.ts`).
