# catreadmin API contract audit — frontend vs backend design doc

**Date:** 2026-06-22
**Type:** Static, read-only audit (no code changed, no app run)
**Frontend audited:** `src/api/*.ts`, `src/api/types.ts`, `src/api/queryKeys.ts`, `src/api/client.ts`
**Source of truth:** `../sms-backend/docs/2026-06-13-backend-api-design.md` — §3B (canonical
data dictionary), §3C (route/contract rules), §4 Phase 1 (representative routes)

> **Doc limitation (carried from the spec):** the design doc is field- and rules-focused,
> not a full OpenAPI spec. It pins exact field names (§3B), cross-cutting route rules (§3C),
> and a *representative* route list (Phase 1). Endpoints/params the doc never addresses are
> labeled **"doc-silent"** and are NOT counted as mismatches.

## 1. Summary

| Resource | 🔴 Mismatch | 🟡 Divergence/gap | 🔵 Note | Verdict |
|---|---|---|---|---|
| auth | 0 | 1 | 1 | ⚠ confirm login surface |
| clients (Tenant) | 1 | 2 | 0 | ⚠ field + lifecycle drift |
| dashboard | 0 | 0 | 1 | ✅ doc-silent shape |
| invoices | 0 | 0 | 0 | ✅ clean |
| onboarding | 0 | 1 | 1 | ⚠ slug/done vs stage |
| plans | 0 | 0 | 1 | ✅ (desc vs description) |
| reports | 0 | 0 | 1 | ✅ doc-silent shape |
| subscriptions | 1 | 0 | 0 | 🔴 period fields + seats |
| team | 0 | 0 | 0 | ✅ clean |
| tickets | 0 | 0 | 1 | ✅ (threads question) |
| **Totals** | **2** | **4** | **6** | |

**Headline:** Two real contract mismatches (`Subscription` period fields + missing `seats`;
`Tenant.contact` typed as a string vs json). Auth uses an OTP surface the doc doesn't define.
Everything else is either clean or a doc-acknowledged gap (`city`/`currency`/`timezone`).

## 2. Endpoint inventory matrix

| Module | Method | Path | Req body | Resp DTO | Doc anchor | Status |
|---|---|---|---|---|---|---|
| auth | POST | `/auth/otp/request` | `{identifier}` | — | §3C `/auth/login` | 🔵 |
| auth | POST | `/auth/otp/verify` | `{identifier,code}` | AuthTokens | §3C `/auth/login` | 🔵 |
| auth | POST | `/auth/refresh` | `{refresh_token}` | AuthTokens | §3C ✓ | ✅ |
| auth | GET | `/auth/me` | — | Me | §3C ✓ | ✅ |
| auth | POST | `/auth/logout` | `{refresh_token}` | — | §3C ✓ | ✅ |
| auth | POST | `/auth/set-password` | `{password}` | — | doc-silent | 🟡 |
| clients | GET | `/clients` | — | List<Client> | Phase1 ✓ | ✅ |
| clients | GET | `/clients/{id}` | — | Client | Phase1 ✓ | ⚠ DTO |
| clients | GET | `/clients/{id}/usage` | — | ClientUsage | Phase1 ✓ | ✅ |
| clients | GET | `/clients/{id}/activity` | — | List<AuditLog> | Phase1 ✓ | ✅ |
| clients | POST | `/clients` | CreateClientBody | Client | Phase1 ✓ | ✅ |
| clients | POST | `/clients/{id}/status` | `{action}` | Client | Phase1 PUT/DELETE | 🟡 |
| clients | POST | `/clients/{id}/change-plan` | `{plan_id}` | Client | doc-silent | 🟡 |
| dashboard | GET | `/dashboard/overview` | — | DashboardOverview | doc-silent shape | 🔵 |
| invoices | GET | `/invoices` | — | List<Invoice> | Phase1 ✓ | ✅ |
| invoices | GET | `/invoices/{id}` | — | Invoice | Phase1 ✓ | ✅ |
| invoices | POST | `/invoices/{id}/mark-paid` | — | Invoice | Phase1 ✓ | ✅ |
| invoices | POST | `/invoices/{id}/refund` | — | Invoice | Phase1 ✓ | ✅ |
| onboarding | GET | `/onboarding` | — | List<OnboardingCard> | Phase1 ✓ | ⚠ DTO |
| onboarding | POST | `/onboarding/{id}/advance` | `{stage}` | OnboardingCard | doc-silent | 🔵 |
| onboarding | PATCH | `/onboarding/{id}/checklist` | `{index,done}` | OnboardingCard | doc-silent | 🔵 |
| plans | GET | `/plans` | — | List<Plan> | Phase1 ✓ | ✅ |
| plans | POST | `/plans` | CreatePlanBody | Plan | Phase1 ✓ | ✅ |
| plans | GET | `/plans/{id}` | — | Plan | Phase1 ✓ | ✅ |
| plans | PATCH | `/plans/{id}` | UpdatePlanBody | Plan | doc-silent | 🔵 |
| plans | POST | `/plans/{id}/publish` | `{visibility}` | Plan | doc-silent | 🔵 |
| reports | GET | `/reports/revenue` | `?months` | RevenueReport | Phase1 `/reports` | 🔵 |
| subscriptions | GET | `/subscriptions` | `?cursor` | List<Subscription> | Phase1 ✓ | 🔴 DTO |
| team | GET | `/team` | — | List<TeamMember> | Phase1 ✓ | ✅ |
| tickets | GET | `/tickets` | `?status,q,cursor` | List<Ticket> | Phase1 ✓ | ✅ |
| tickets | GET | `/tickets/{id}` | — | TicketDetail | Phase1 ✓ | ✅ |
| tickets | PATCH | `/tickets/{id}` | PatchTicketBody | Ticket | doc-silent | ✅ |
| tickets | POST | `/tickets/{id}/messages` | `{body}` | TicketMessage | §3C `/threads`? | 🔵 |

Base URL `http://localhost:5162/v1` → the `/v1` prefix matches the doc's `/v1/clients`. ✅

## 3. Findings

### 🔴 F1 — `Subscription` DTO diverges from doc §3B
- **Resource/endpoint:** subscriptions · `GET /subscriptions`
- **Axis:** response DTO fields
- **Doc (§3B Catre-only):** `id, tenant_id, plan_id, status, started_at, renews_at, seats`
- **Frontend (`types.ts:112`):** `id, tenant_id, tenant_name, plan_id, plan_name, tier,
  status, current_period_start, current_period_end, next_charge`
- **Description:** `started_at` → renamed to `current_period_start`; `renews_at` → has no
  direct equal (closest is `current_period_end`); **`seats` is missing entirely**. Frontend
  adds `tenant_name`/`plan_name`/`tier`/`next_charge` (denormalized; doc-silent, acceptable).
- **Suggested fix:** either add `started_at`/`renews_at`/`seats` to the DTO and the backend
  response, or update §3B to adopt the Stripe-style `current_period_*` + `next_charge` shape.
  Pick one as canonical; `seats` (seat count) has no frontend equivalent and is likely needed.

### 🔴 F2 — `Tenant.contact` typed as string, doc says json object
- **Resource/endpoint:** clients · `GET /clients`, `GET /clients/{id}`
- **Axis:** response DTO field type
- **Doc (§3B Tenant, line 258):** `contact {name,email,phone}` — type **json**, CA ✓
- **Frontend (`types.ts:84`):** `contact: string`
- **Description:** Doc models contact as a structured object; frontend flattens it to a
  single string. A consumer expecting `contact.email` would break.
- **Suggested fix:** change DTO to `contact: { name: string; email: string; phone: string }`
  (and `CONTRACT_KEYS.TENANT_KEYS` already lists `contact` as a key — only the shape differs).

### 🟡 F4 — Tenant missing canonical fields
- **Resource:** clients (Tenant) · DTO
- **Doc (§3B Tenant):** CA marked **ADD** for `city`, `currency`, `timezone`; CA marked **✓**
  for `logo_url` and `color`.
- **Frontend (`Client`, `types.ts:79`):** has none of `city`, `currency`, `timezone`,
  `logo_url`, `color`.
- **Description:** `city`/`currency`/`timezone` are doc-acknowledged gaps (doc itself says CA
  must ADD them). `logo_url`/`color` are listed as already-present for CA but the DTO omits
  them — likely dropped when the prototype was ported.
- **Suggested fix:** add the five fields to `Client` + `CONTRACT_KEYS.TENANT_KEYS` when the
  backend exposes them; prioritize `logo_url`/`color` (doc expects them now).

### 🟡 F5 — Client lifecycle modeled as POST actions, not PUT/DELETE
- **Resource:** clients · `POST /clients/{id}/status {action}`, `POST /clients/{id}/change-plan`
- **Doc (Phase 1):** lists generic `GET/POST/PUT/DELETE /v1/clients` for lifecycle
  (trial→active→suspended→cancelled).
- **Description:** Frontend never uses PUT or DELETE; lifecycle transitions go through
  `POST …/status` with an `action` enum (`start_trial|activate|suspend|reinstate|cancel`) and
  plan changes through `POST …/change-plan`. This is arguably *cleaner* (explicit verbs,
  auditable) than PUT/DELETE, but it diverges from the representative route list.
- **Suggested fix:** confirm the action-endpoint style is the intended contract and update the
  doc's Phase-1 route list to match (`POST /clients/{id}/status`, `/change-plan`), or add
  PUT/DELETE handlers. Recommend keeping the action style.

### 🟡 F6 — `OnboardingItem` DTO drift
- **Resource:** onboarding · `GET /onboarding`
- **Doc (§3B):** `id, tenant_id?, name, slug, owner, value, checklist[5], done, age`
- **Frontend (`OnboardingCard`, `types.ts:130`):** `id, name, value, owner, age, stage, checklist[]`
- **Description:** missing `tenant_id`, `slug`, and the boolean `done`. Frontend instead adds
  a `stage` enum (`lead|trial|onboarding|active`) to drive the Kanban — the doc describes
  "Kanban stages" in Phase 1 prose but §3B lists only `done`, not `stage`. Also doc fixes
  `checklist[5]` (5 items) while frontend allows variable length.
- **Suggested fix:** reconcile §3B to include `stage` (the Kanban needs it) and decide whether
  `done` is derived from `stage === 'active'`. Add `tenant_id`/`slug` to the DTO.

### 🟡 F7 — `/auth/set-password` not in doc
- **Resource:** auth · `POST /auth/set-password {password}`
- **Doc:** the unified auth surface in §3C lists only login/refresh/me/logout.
- **Description:** Used for invited team members setting an initial password. Reasonable but
  undocumented.
- **Suggested fix:** add `/auth/set-password` (and the OTP routes, see N1) to §3C's auth
  surface so the backend implements them.

## 4. Conventions (`client.ts` vs §3 / §3C)

All conventions **match** the doc:

- **Envelope:** single = `{data: T}` (unwrapped by `request`), list = `{data: [], next_cursor}`
  (returned whole by `listRequest`) — matches §3C cursor paging. ✅
- **snake_case:** every request/response key is snake_case. ✅
- **Auth:** `Authorization: Bearer <access>`, refresh-on-401 with single retry then
  `clear()` + `onAuthFailure()` — matches Phase-0 "JWT+refresh". ✅
- **Error body:** parses `{error:{code,message,details}}` → `ApiError`. Consistent with the
  doc's error conventions (verify the backend emits exactly this shape when it lands). ✅
- **NO_AUTH set:** `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh` correctly skip the
  bearer header. ✅

## 5. Open questions (🔵 — need a product/architecture call)

- **N1 — Catre login surface.** Frontend uses `/auth/otp/request` + `/auth/otp/verify`, but
  §3C's unified surface is `/auth/login` with a polymorphic body covering teacher/admin,
  student/parent, and staff — **catre super-admin is not among the three listed credential
  types**, and OTP is mentioned only as a Phase-0 "stub". Decide: is catre login `/auth/login`
  with an OTP credential variant, or are these dedicated `/auth/otp/*` routes sanctioned?
  Whichever, document it in §3C.
- **N2 — `Plan.desc` vs `description`.** §3B writes `desc`; frontend uses `description`
  (and `CONTRACT_KEYS.PLAN_KEYS` lists `description`). Almost certainly doc shorthand —
  confirm the wire key is `description`.
- **N3 — Ticket messages vs `/threads`.** §3C unifies *chat* messaging under `/threads`.
  Support tickets are a separate Catre-only entity, so `/tickets/{id}/messages` is likely
  correct — confirm ticket threads are intentionally outside the `/threads` chat resource.
- **N4 — Doc-silent shapes.** `DashboardOverview` and `RevenueReport` field lists, the
  `TicketMessage` shape, and create-bodies (`CreateClientBody`, `CreatePlanBody`,
  `feature_tiers`) are not specified in §3B. The frontend shapes look reasonable; capture them
  in the doc so the backend matches on first build.
- **N5 — Doc-silent sub-routes.** `/onboarding/{id}/advance`, `/onboarding/{id}/checklist`,
  `/plans/{id}/publish`, `/clients/{id}/change-plan`, `/reports/revenue` are not in the
  representative list. Add them to Phase 1 so they aren't missed server-side.

## 6. Method & coverage

Approach A (matrix-driven diff): all 11 modules + `client.ts` conventions audited; 33/33
endpoints inventoried; every finding cites a §ref and a suggested fix; doc-silent endpoints
labeled, not dropped. No source code was modified.
