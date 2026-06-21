# Static API Contract Audit — catreadmin frontend → backend design doc

**Date:** 2026-06-22
**Type:** Read-only audit (no code changes, no app run)
**Scope:** Verify every frontend API binding (path, method, request body, response DTO,
conventions) against the canonical backend contract.

## Goal

Produce a single findings report that cross-references the `sms-catreadmin` frontend API
layer against the authoritative backend design doc, so contract drift is caught before the
backend lands and the app is flipped to `live`.

## Source of truth

`../sms-backend/docs/2026-06-13-backend-api-design.md`, specifically:

- **§3B — Canonical data dictionary**: authoritative snake_case field list per entity.
  Relevant to catreadmin: **Tenant** + **Catre-only entities** (Plan, Subscription,
  Invoice, SupportTicket + TicketMessage, OnboardingItem, TeamMember, AuditLog), plus the
  Dashboard/Reports KPIs implied by Phase 1.
- **§3C — Cross-app route & contract consistency**: route rules + conventions the backend
  MUST follow (unified `/auth/*` surface, envelope, snake_case).
- **§4 Phase 1** — *Representative* (non-exhaustive) route list for catreadmin:
  `GET/POST/PUT/DELETE /v1/clients`, `/clients/{id}/usage`, `/clients/{id}/activity`,
  `/plans`, `/subscriptions`, `/invoices/{id}/mark-paid|refund`, `/onboarding`, `/tickets`,
  `/team`, `/reports`.

**Important limitation:** the doc is field- and rules-focused, not a full OpenAPI spec. It
gives exact field names, cross-cutting route rules, and a *representative* route list. For
endpoint paths/query-params beyond what the doc explicitly covers, the doc has no opinion;
those are labeled **"not specified in doc"**, NOT counted as mismatches.

## Frontend surface under audit (11 modules, ~33 endpoints)

- `auth.ts` — `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/me`,
  `/auth/logout`, `/auth/set-password`
- `clients.ts` — `GET /clients`, `GET /clients/{id}`, `GET /clients/{id}/usage`,
  `GET /clients/{id}/activity`, `POST /clients`, `POST /clients/{id}/status`,
  `POST /clients/{id}/change-plan`
- `dashboard.ts` — `GET /dashboard/overview`
- `invoices.ts` — `GET /invoices`, `GET /invoices/{id}`, `POST /invoices/{id}/mark-paid`,
  `POST /invoices/{id}/refund`
- `onboarding.ts` — `GET /onboarding`, `POST /onboarding/{id}/advance`,
  `PATCH /onboarding/{id}/checklist`
- `plans.ts` — `GET /plans`, `POST /plans`, `GET /plans/{id}`, `PATCH /plans/{id}`,
  `POST /plans/{id}/publish`
- `reports.ts` — `GET /reports/revenue`
- `subscriptions.ts` — `GET /subscriptions`
- `team.ts` — `GET /team`
- `tickets.ts` — `GET /tickets`, `GET /tickets/{id}`, `PATCH /tickets/{id}`,
  `POST /tickets/{id}/messages`
- Plus `client.ts` (envelope/auth/refresh/error conventions), `types.ts` (DTO fields),
  `queryKeys.ts` (list param types).

## Method (approach A — matrix-driven diff)

1. Build one normalized inventory row per endpoint: path · method · request body keys ·
   response type · backing DTO fields (from `types.ts`).
2. Diff each row on five axes:

   | Axis | Frontend source | Doc anchor |
   |---|---|---|
   | Path | literal in `src/api/*.ts` | §3C rules + Phase-1 routes |
   | Method | `method:` in module | §3C / Phase-1 |
   | Request body keys | `body:{…}` + `Patch*Body` types | §3B field names |
   | Response DTO fields | `types.ts` interfaces | §3B canonical field list |
   | Conventions | `client.ts` | §3 conventions + §3C |

3. Record each finding as: **resource · endpoint · axis · severity · description · suggested fix**.

## Findings severity model

- **🔴 Mismatch** — frontend contradicts an explicit doc rule (wrong path/method, renamed
  field, missing snake_case key the doc marks required for CA).
- **🟡 Divergence / gap** — frontend does something the doc doesn't cover, or doc marks a
  field `ADD` for CA that the frontend lacks (e.g. Tenant `city`, `currency`, `timezone`).
- **🔵 Note** — intentional/explainable difference flagged for confirmation, not necessarily
  a bug (e.g. OTP auth flow vs doc's `/auth/login`).

## Out of scope

- Hooks → UI wiring and rendering.
- Live/runtime behavior (no backend boot, no network calls).
- The `api/adapter.js` prototype mock seam.
- Other apps' entities (admin/teacher/staff/student).

## Deliverable

`docs/api/2026-06-22-catreadmin-contract-audit.md` containing:

1. Summary table — counts by severity, per resource.
2. Full endpoint inventory matrix.
3. Findings grouped by resource (fields per the severity model above).
4. Conventions section for `client.ts`-level findings.
5. Open questions — the 🔵 notes needing a product/architecture call.

## Success criteria

- All 11 modules + `client.ts`/`types.ts`/`queryKeys.ts` covered; no endpoint omitted.
- Every finding cites its doc anchor (§ reference) and a concrete suggested fix.
- Doc-silent endpoints explicitly labeled rather than dropped.
- Report is committed; no source code modified.
