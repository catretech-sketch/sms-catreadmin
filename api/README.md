# Canonical API seam

`adapter.js` maps the prototype's `data.jsx` mock objects into the canonical
snake_case Catre contract defined in `contracts.js` (see
`sms-backend/docs/2026-06-13-backend-api-design.md` §3B).

When the real backend lands, its JSON responses must already match these keys —
the adapters become identity (or move server-side). `node api/adapter.test.js`
guards the contract.

Covered: Tenant, Plan, TeamMember, Invoice, SupportTicket.
Follow-up: Subscription, OnboardingItem, AuditLog (add adapters + keys the same way).
