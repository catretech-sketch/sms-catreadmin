# Identity & Access — design

**Date:** 2026-06-15
**Status:** Approved (brainstorming) — ready for implementation plan
**Area:** Catre Super Admin Panel (frontend prototype)

## Summary

Add an **Identity & Access** section to the Catre operator console that surfaces
the RBAC model which today lives only in `data.jsx`. It gives operators a single
place to see internal staff **by ID**, the **roles** and the **permissions** each
role holds, and an editable **permission × role matrix** — all filterable **by
role**.

This is a full IAM hub (three tabs), editable (matrix toggles and user management
work against local state with toasts + audit entries). It is the operator-staff
IAM, **not** the tenant-school `identity` feature module in `FEATURE_CATALOG`.

## Goals

- Show all internal users **by ID**, with role, status, and last login.
- Show each **role** and the **permissions** it holds.
- Show a complete **permission × role access matrix**, editable.
- **Filter everything by role** ("show the whole list based on role").
- Keep the canonical API seam (contracts + adapters + tests) complete.

## Non-goals

- No backend. Mock/seed data and local React state only, consistent with the
  rest of the prototype.
- Do **not** rewire the global `can()` gating from matrix edits (see Editing
  model). No SSO/SCIM, no API keys, no session management.
- No changes to the existing tenant-school `identity` feature catalog entry.

## Placement & files

- **New screen file** `screen-identity.jsx`, exporting `window.IdentityScreen`.
  Loaded in `index.html` immediately after `screen-team-settings.jsx`.
- **`app.jsx` wiring**:
  - Add `{ key: 'identity', label: 'Identity & Access', icon: Icon.shield,
    perm: 'identity.view', route: 'identity' }` to the existing **Admin** nav
    group, placed above **Team**.
  - `ROUTE_PERM.identity = 'identity.view'`.
  - `CRUMB.identity = ['Identity & Access']`.
  - `renderScreen` case: `case 'identity': return React.createElement(window.IdentityScreen);`
- The screen has **three tabs** — **Users · Roles · Access Matrix** — using the
  same tab-button pattern as `SettingsScreen`.

## RBAC data additions (`data.jsx`)

- Add two permission keys to `MATRIX`, both granted to `['owner','admin']`:
  - `'identity.view': ['owner','admin']`
  - `'identity.manage': ['owner','admin']`
- Add a **`PERMISSION_CATALOG`**: maps each permission key to
  `{ label, group }`, where `group` is one of: `Overview`, `Clients`,
  `Onboarding`, `Revenue`, `Support`, `Admin`. Covers every key in `MATRIX`
  (the existing 25 plus the 2 new ones). Example:
  `'clients.suspend': { label: 'Suspend client', group: 'Clients' }`.
  This drives the readable, grouped rendering of the Roles tab and the Matrix.
- Expose on the existing object: `window.RBAC = { ROLES, MATRIX, can, DEMO_ROLES,
  PERMISSION_CATALOG }`.

### Gating note

`identity.view` / `identity.manage` = **owner + admin**. Because this
deployment's `DEMO_ROLES` is `['admin','sales']`, the **Admin** role sees and can
edit Identity & Access; **Sales** does not (consistent with Team/Settings being
owner-gated and hidden). This was explicitly approved.

## The three tabs

### Users
Table columns: **ID** · Member (avatar + name + email) · Role badge · Status ·
Last login · ⋮ menu. Data source: `DB.TEAM`. The ID column is the new bit (the
Team screen does not show it). Row actions reuse the Team screen's behaviors:
**Invite teammate**, **Edit role**, **Deactivate / Reactivate**. To avoid
duplicating modal code, extract `InviteModal`, `EditRoleModal`, and `RolePicker`
so both `TeamScreen` and `IdentityScreen` import them from a shared location
(they are already plain `window`-scoped functions in `screen-team-settings.jsx`;
keep them defined there and referenced via `window`, or hoist as needed — the
plan decides the mechanics). User edits live in the screen's local `team` state.

### Roles
One card per role (all six from `ROLES`, not just demo roles): color dot, name,
description, **count of users currently in that role** (from `DB.TEAM`), and the
**list of permissions the role holds**, derived by scanning `MATRIX` for keys
whose array includes the role and rendering them via `PERMISSION_CATALOG`
labels, grouped by `group`.

### Access Matrix
Grid: **rows = permissions** (grouped by `PERMISSION_CATALOG.group`, with a
group header row), **columns = the six roles**. Each cell is a **✓ / —** toggle
button reflecting whether that role is in `MATRIX[permission]`. Clicking a cell
(when the actor has `identity.manage`) flips it in **local matrix state**, fires
a **toast** (e.g. `"Granted billing.refund to Admin"` / `"Revoked …"`), and
appends an **audit entry**. When the actor lacks `identity.manage`, cells render
read-only (no toggle affordance).

## "Show all, based on role" filter

A shared **role selector** at the top of the screen (segmented control or
dropdown listing the six roles + an "All roles" default) drives all three tabs:

- **Users** — filters the table to users whose `role` matches the selection.
- **Roles** — highlights/scrolls to the selected role's card.
- **Access Matrix** — highlights the selected role's column and offers a "only
  permissions this role has" toggle to collapse the grid to that role's grants.

The Users tab also has a free-text **search** (name / email / id), matching the
search idiom used elsewhere in the app.

## Editing model (prototype-safe)

All edits — matrix toggles and user management — operate on the **screen's local
React state**, surfaced through toasts and an in-screen audit list. They
deliberately **do not mutate the global `window.RBAC.MATRIX` or rewire `can()`**,
because that gates the entire app and could lock the current user out mid-session
(e.g. toggling `identity.view` off). This keeps the hub feeling live while
staying safe. If we later want edits to propagate app-wide, that is a follow-up
that must add lockout guards.

## Audit

Permission toggles (and optionally user role changes) append an entry shaped like
the existing `DB.AUDIT` rows:
`{ id, actor, role, action, target, time: 'just now', kind: 'identity' }`.
Rendered in a compact activity panel on the screen (reusing the audit row styling
from `TeamScreen` / `AuditSettings`). Seeded from `DB.AUDIT` filtered/extended as
needed; new entries prepend.

## Canonical seam (`api/`)

Keep the contract complete and consistent with the existing DTO pattern:

- **`api/contracts.js`**:
  - `ROLE_KEYS = ['key', 'name', 'description', 'color']`
  - `PERMISSION_KEYS = ['key', 'label', 'group', 'roles']`
  - Export both alongside the existing key lists.
- **`api/adapter.js`**:
  - `toRoleDTO(r)` → `{ key, name, description: r.desc, color }`.
  - `toPermissionDTO(key, meta, matrix)` →
    `{ key, label: meta.label, group: meta.group, roles: matrix[key] }`.
  - Export both.
- **`api/adapter.test.js`**: add cases asserting `toRoleDTO` and
  `toPermissionDTO` outputs expose exactly `ROLE_KEYS` / `PERMISSION_KEYS` and
  carry correct values, matching the style of the existing adapter tests.

## Icon

Use `Icon.shield` for the nav item (already used by the Settings audit tab). If a
more fitting key/lock icon is desired, add one to `lib.jsx`; the plan decides.

## Testing / verification

- `node api/adapter.test.js` (or the project's test runner) passes, including the
  two new adapter cases.
- Manual: load the app as **Admin**, open **Identity & Access**; verify the three
  tabs, the ID column, the role filter affecting all tabs, matrix toggles firing
  toasts + audit entries, and that **Sales** does not see the nav item.

## Open questions

None outstanding. Owner+admin gating and the Users/Team overlap were both
confirmed during brainstorming.
