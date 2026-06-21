# catreadmin API binding — end-to-end (frontend ↔ live backend source)

**Date:** 2026-06-22
**Type:** Static end-to-end binding audit, read-only (both sides of the wire read; no app run)
**Frontend:** `src/api/*.ts`, `src/api/types.ts`
**Backend (truth):** `../sms-backend/src/Sms.Modules.Tenancy/ModuleEndpoints.cs`
+ `Contracts/{CatreContracts,OpsContracts,BillingContracts}.cs`, `Sms.Api/Endpoints/AuthEndpoints.cs`,
`Sms.Shared.Kernel/Http/ErrorEnvelope.cs`, `Program.cs` (JSON policy)

> This supersedes the doc-based audit (`2026-06-22-catreadmin-contract-audit.md`) for anything
> the backend actually implements. The backend's catreadmin surface is **fully built** (the
> earlier "backend not landed" note was wrong — the endpoints live in the Tenancy module, not
> `Sms.Api/Endpoints/`). Wire format confirmed snake_case via `SnakeCaseNamingPolicy` in
> `Program.cs`, so PascalCase records serialize to snake_case keys.

## Verdict

**9 confirmed binding breaks** (route missing or DTO fields that won't line up at runtime),
plus 5 minor issues. Auth, plans, invoices, reports/revenue, and the envelope/error/snake_case
layer are clean.

| Layer | Result |
|---|---|
| Envelopes (`data` / `next_cursor` / `error{code,message,details}`) | ✅ exact match |
| Auth (`/auth/otp/*`, `/refresh`, `/me`, `/logout`, `/set-password`) | ✅ all implemented & match |
| snake_case wire format | ✅ enforced both directions |
| Routes | 🔴 2 frontend calls hit non-existent backend routes |
| Request bodies | 🔴 3 mismatched key sets |
| Response DTOs | 🔴 4 mismatched field sets |

## 🔴 Confirmed binding breaks

### B1 — `GET /clients/{id}/usage` does not exist on backend
`clients.ts:16` `getClientUsage` → `/clients/{id}/usage`. Backend `ModuleEndpoints.cs` has no
such route → **404**. The `ClientUsage` panel (`useClient`) is dead. *Fix:* add the endpoint
server-side, or derive usage from `GET /clients/{id}` (which already returns
`students_count`/`staff_count`/`storage_gb`/`limits`).

### B2 — `GET /clients/{id}/activity` does not exist; backend exposes `/audit`
`clients.ts:20` `getClientActivity` → `/clients/{id}/activity` → **404**. Backend serves the
same data at `GET /audit?tenant_id={id}` and the `AuditEntry` DTO **matches `AuditLog` exactly**
(`id, actor_id, actor_name, role, action, target, kind, time`) under a `CursorPage` envelope.
*Fix:* point the frontend at `/audit` with `query:{ tenant_id: id, cursor }` — purely a path change.

### B3 — `POST /clients/{id}/status` body: `{action}` vs backend `{status}`
Frontend (`clients.ts:28`) sends `{ action: 'start_trial'|'activate'|'suspend'|'reinstate'|'cancel' }`.
Backend `SetStatusRequest(string Status, string? Reason)` reads `req.Status` → frontend's `action`
key never binds, `Status` is null. Vocabulary also differs (action **verbs** vs status **nouns**:
`suspend` → `suspended`). *Fix:* send `{ status: <noun> }` (and optional `reason`), mapping the UI
action to the target status; or rename the backend param to `action` and translate server-side.

### B4 — `PATCH /onboarding/{id}/checklist` body: `{index}` vs backend `{label}`
Frontend (`onboarding.ts:11`) sends `{ index: number, done }`. Backend
`ChecklistRequest(string Label, bool Done)` keys the item by **label string**, not index →
`Label` binds null. *Fix:* send `{ label, done }` (the `OnboardingCard.checklist[i].label` is
available client-side), or add index-based addressing server-side.

### B5 — `POST /tickets/{id}/messages` body: `{body}` vs backend `{text}`
Frontend (`tickets.ts:15`) sends `{ body }`. Backend `AddMessageRequest(string Text)` → `Text`
binds null. *Fix:* send `{ text }`.

### B6 — `GET /tickets/{id}` message DTO: `author/body/created` vs backend `who/text/when`
Frontend `TicketMessage` (`types.ts:142`) = `{ id, author, role, body, created }`. Backend
`TicketMessageResponse` = `{ id, ticket_id, who, role, text, when }`. Three of five fields never
populate (`author`, `body`, `created` all `undefined`). *Fix:* align names — rename backend to
`author/body/created`, or remap in the frontend DTO. Pairs with B5 (same resource, both directions).

### B7 — `GET /subscriptions` DTO: period/charge fields don't exist on backend
Frontend `Subscription` (`types.ts:112`) expects `current_period_start`, `current_period_end`,
`next_charge`, plus `tenant_name`, `plan_name`, `tier`. Backend `SubscriptionResponse` =
`{ id, tenant_id, plan_id, status, started_at, renews_at, seats }`. The frontend's period and
charge fields are all `undefined`; `seats` is unused. (This is the doc-audit F1, now confirmed:
the **backend** followed the doc; the **frontend** diverged.) *Fix:* adopt one shape — recommend
frontend switches to `started_at`/`renews_at`/`seats`, and backend adds denormalized
`tenant_name`/`plan_name`/`tier` if the list UI needs them.

### B8 — `GET /dashboard/overview`: `usage_alerts` and `recent_activity` item shapes differ
- `usage_alerts`: frontend `UsageAlert{ tenant_id, name, usage_pct, status, csm }` vs backend
  `UsageAlertItem{ tenant, metric, used, limit, pct }` — no overlap beyond intent.
- `recent_activity`: frontend `AuditLog{ id, actor_id, actor_name, role, action, target, kind, time }`
  vs backend `RecentActivityItem{ actor, action, target, kind, at }` — missing `id/actor_id/role`,
  and `actor_name`→`actor`, `time`→`at`.

  The rest of the overview (`counts`, `mrr`, `trials_ending`, `churn_pct`, `months`, `mrr_series`,
  `signup_series`, `plan_mix`, `system_health`) matches. *Fix:* reconcile the two item DTOs on one side.

### B9 — `GET /clients` / `GET /clients/{id}`: backend omits 5 fields the frontend expects
Frontend `Client` expects `last_active_days`, `trial_ends_days`, `contact`, `gateway`,
`usage_series`; backend `ClientResponse` returns none of them. They render as `undefined`
wherever the client list/detail uses them. *Fix:* add the fields to `ClientResponse` (and the
DB projection), or drop them from the frontend DTO/UI. Note `contact` is also a doc-level type
question (string vs object) — moot until the backend returns it.

## 🟡 Minor

- **`POST /clients` body:** frontend sends `size`, `address`, `status` (backend ignores) and
  omits `csm` (backend `CreateClientRequest.Csm` → null). Matching keys (`name, slug, country,
  admin_name, admin_email, admin_phone, plan_id, trial_days`) bind fine.
- **`POST/PATCH /plans` body:** frontend sends `feature_tiers`; backend `PlanUpsertRequest` has
  no such field → silently dropped.
- **`GET /team`:** frontend `TeamMember` expects `phone`; backend `TeamMemberResponse` omits it → `undefined`.
- **`Plan.per_student` / `min_students`:** nullable on backend, typed non-null in frontend — guard for null.
- **Ignored query params:** `GET /reports/revenue?months` and `GET /subscriptions?cursor` are
  accepted but unused server-side (no paging/windowing yet).

## ✅ Clean bindings (verified both sides)

- **auth** — `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/me`,
  `/auth/logout`, `/auth/set-password` all implemented; bodies + token envelope match. (Resolves
  doc-audit open question N1: the OTP surface is real, alongside `/auth/login`.)
- **plans** — list/create/get/patch/publish; `PlanResponse` ↔ `Plan` field-for-field.
- **invoices** — list/get/mark-paid/refund; `InvoiceResponse` ↔ `Invoice` exact.
- **onboarding** — `GET /onboarding` + `advance` response (`OnboardingItemResponse` ↔
  `OnboardingCard`) match; only the **checklist PATCH body** (B4) breaks.
- **tickets** — list + `PATCH /tickets/{id}` match; only **messages** (B5/B6) break.
- **reports** — `GET /reports/revenue`; `RevenueReport` ↔ frontend exact (incl. nested
  `revenue_by_plan`, `plan_performance`).
- **dashboard** — all scalars/series + `plan_mix` + `system_health` match; only `usage_alerts` /
  `recent_activity` (B8) break.
- **Envelopes/auth/snake_case** — `CursorPage{data,next_cursor}`, `DataEnvelope{data}`,
  `ErrorEnvelope{error{code,message,details}}`, Bearer + refresh-on-401 all align.

## Method & feasibility note

Approach: read both sides of every binding (33 frontend calls vs the registered backend routes +
their request/response records + JSON policy). A **live runtime** pass (boot SQL Server via
`docker-compose` + `dotnet run` + seed a platform admin + `npm run dev`) is feasible since the
backend is fully built — but every break above is already proven from source on both ends, so a
live run would mainly reconfirm B1–B9 as 404s / `undefined` fields. Say the word and I'll boot the
stack and exercise the endpoints for live confirmation.
