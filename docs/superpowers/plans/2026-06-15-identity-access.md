# Identity & Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable **Identity & Access** section to the Catre operator console — Users (by ID), Roles, and a permission × role Access Matrix, all filterable by role.

**Architecture:** A new browser-only screen (`screen-identity.jsx`) reads the RBAC model from `window.RBAC` and renders three tabs driven by a shared role filter. Edits live in the screen's local React state (toasts + in-screen audit) and deliberately do **not** rewire the global `can()`. The RBAC model in `data.jsx` gains two permission keys and a `PERMISSION_CATALOG`. The canonical `api/` seam gains role + permission DTOs with node tests.

**Tech Stack:** React 18 via CDN + Babel-standalone (no build), `React.createElement` style (matching existing screens), CommonJS node tests for `api/`.

---

## File Structure

- `api/contracts.js` — **modify**: add `ROLE_KEYS`, `PERMISSION_KEYS` and export them.
- `api/adapter.js` — **modify**: add `toRoleDTO`, `toPermissionDTO` and export them.
- `api/adapter.test.js` — **modify**: add Role + Permission test cases.
- `data.jsx` — **modify**: add `identity.view`/`identity.manage` to `MATRIX`; add `PERMISSION_CATALOG`; export it on `window.RBAC`.
- `screen-identity.jsx` — **create**: `IdentityScreen` + `IAUsers`, `IARoles`, `IAMatrix` sub-components, plus `window.IdentityScreen` export.
- `index.html` — **modify**: load `screen-identity.jsx` after `screen-team-settings.jsx`.
- `app.jsx` — **modify**: NAV item, `ROUTE_PERM`, `CRUMB`, `renderScreen` case.
- `styles.css` — **modify**: small additive block for the access matrix.

Verification reality: the `api/` changes are node-testable (TDD). `data.jsx`, `screen-identity.jsx`, and the wiring are browser-only and verified by running a static server and checking the UI + console — those steps are written for a human reviewer.

---

## Task 1: Canonical seam — Role & Permission DTOs (TDD)

**Files:**
- Modify: `api/contracts.js`
- Modify: `api/adapter.js`
- Test: `api/adapter.test.js`

- [ ] **Step 1: Write the failing tests**

In `api/adapter.test.js`, insert these blocks immediately **before** the final `console.log(...)` line:

```javascript
// ── Role (from a ROLES entry) ──
const roleDTO = A.toRoleDTO({ key: 'admin', name: 'Admin', desc: 'Client lifecycle, billing, support, onboarding.', color: 'var(--blue)' });
sameKeys(roleDTO, C.ROLE_KEYS, 'Role');
assert.strictEqual(roleDTO.description, 'Client lifecycle, billing, support, onboarding.');
assert.strictEqual(roleDTO.color, 'var(--blue)');

// ── Permission (key + catalog meta + matrix row) ──
const permDTO = A.toPermissionDTO('billing.refund', { label: 'Issue refunds', group: 'Revenue' }, { 'billing.refund': ['owner', 'finance'] });
sameKeys(permDTO, C.PERMISSION_KEYS, 'Permission');
assert.strictEqual(permDTO.label, 'Issue refunds');
assert.strictEqual(permDTO.group, 'Revenue');
assert.deepStrictEqual(permDTO.roles, ['owner', 'finance']);

// toPermissionDTO with a key absent from the matrix yields an empty roles list
const permDTOmissing = A.toPermissionDTO('identity.view', { label: 'View Identity & Access', group: 'Admin' }, {});
assert.deepStrictEqual(permDTOmissing.roles, []);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node api/adapter.test.js`
Expected: a `TypeError` such as `A.toRoleDTO is not a function` (also `C.ROLE_KEYS` is `undefined`).

- [ ] **Step 3: Add the contract key lists**

In `api/contracts.js`, add these two constants after the `SUPPORT_TICKET_KEYS` line:

```javascript
const ROLE_KEYS = ['key', 'name', 'description', 'color'];

const PERMISSION_KEYS = ['key', 'label', 'group', 'roles'];
```

Then update the export line to include them:

```javascript
module.exports = { TENANT_KEYS, PLAN_KEYS, TEAM_MEMBER_KEYS, INVOICE_KEYS, SUPPORT_TICKET_KEYS, ROLE_KEYS, PERMISSION_KEYS };
```

- [ ] **Step 4: Add the adapters**

In `api/adapter.js`, add these two functions after `toTicketDTO` (before `module.exports`):

```javascript
function toRoleDTO(r) {
  return {
    key: r.key,
    name: r.name,
    description: r.desc,
    color: r.color,
  };
}

function toPermissionDTO(key, meta, matrix) {
  return {
    key,
    label: meta.label,
    group: meta.group,
    roles: matrix[key] || [],
  };
}
```

Then update the export line:

```javascript
module.exports = { toTenantDTO, toPlanDTO, toTeamMemberDTO, toInvoiceDTO, toTicketDTO, toRoleDTO, toPermissionDTO };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node api/adapter.test.js`
Expected: `OK: all canonical adapter contracts pass`

- [ ] **Step 6: Commit**

```bash
git add api/contracts.js api/adapter.js api/adapter.test.js
git commit -m "feat(catreadmin): add role + permission DTOs to canonical seam"
```

---

## Task 2: RBAC data additions (`data.jsx`)

**Files:**
- Modify: `data.jsx`

- [ ] **Step 1: Add the two new permission keys to `MATRIX`**

In `data.jsx`, in the `MATRIX` object, the last entry is currently:

```javascript
  'reports.view':          ['owner','admin','support','sales','finance','analyst'],
```

Add two lines directly after it (still inside `MATRIX`):

```javascript
  'identity.view':         ['owner','admin'],
  'identity.manage':       ['owner','admin'],
```

- [ ] **Step 2: Add `PERMISSION_CATALOG`**

In `data.jsx`, immediately **after** the line `const can = (role, action) => !!MATRIX[action] && MATRIX[action].includes(role);`, insert:

```javascript
// Human-readable metadata for every MATRIX permission key — drives the Identity & Access UI.
const PERMISSION_CATALOG = {
  'dashboard.view':         { label: 'View dashboard',           group: 'Overview' },
  'clients.view':           { label: 'View clients',             group: 'Clients' },
  'clients.start_trial':    { label: 'Start trial',              group: 'Clients' },
  'clients.activate':       { label: 'Activate client',          group: 'Clients' },
  'clients.suspend':        { label: 'Suspend client',           group: 'Clients' },
  'clients.reinstate':      { label: 'Reinstate client',         group: 'Clients' },
  'clients.cancel':         { label: 'Cancel client',            group: 'Clients' },
  'clients.change_plan':    { label: 'Change plan',              group: 'Clients' },
  'clients.delete':         { label: 'Delete client',            group: 'Clients' },
  'clients.impersonate':    { label: 'Impersonate client',       group: 'Clients' },
  'usage.view':             { label: 'View usage',               group: 'Clients' },
  'onboarding.view':        { label: 'View onboarding',          group: 'Onboarding' },
  'onboarding.manage':      { label: 'Manage onboarding',        group: 'Onboarding' },
  'plans.view':             { label: 'View plans',               group: 'Revenue' },
  'plans.manage':           { label: 'Manage plans',             group: 'Revenue' },
  'billing.view':           { label: 'View billing',             group: 'Revenue' },
  'billing.manage_invoice': { label: 'Manage invoices',          group: 'Revenue' },
  'billing.refund':         { label: 'Issue refunds',            group: 'Revenue' },
  'reports.view':           { label: 'View reports',             group: 'Revenue' },
  'support.view':           { label: 'View support',             group: 'Support' },
  'support.manage':         { label: 'Manage tickets',           group: 'Support' },
  'team.view':              { label: 'View team',                group: 'Admin' },
  'team.manage':            { label: 'Manage team',              group: 'Admin' },
  'settings.view':          { label: 'View settings',            group: 'Admin' },
  'settings.manage':        { label: 'Manage settings',          group: 'Admin' },
  'identity.view':          { label: 'View Identity & Access',   group: 'Admin' },
  'identity.manage':        { label: 'Manage Identity & Access', group: 'Admin' },
};
```

- [ ] **Step 3: Export `PERMISSION_CATALOG` on `window.RBAC`**

In `data.jsx`, change the existing line:

```javascript
window.RBAC = { ROLES, MATRIX, can, DEMO_ROLES };
```

to:

```javascript
window.RBAC = { ROLES, MATRIX, can, DEMO_ROLES, PERMISSION_CATALOG };
```

- [ ] **Step 4: Verify the catalog covers the matrix (browser console check)**

Start a static server and open the app:

```bash
npx serve .
```

Open the printed URL, then in the browser devtools console run:

```javascript
Object.keys(window.RBAC.MATRIX).filter(k => !window.RBAC.PERMISSION_CATALOG[k])
```

Expected: `[]` (empty array — every permission key has catalog metadata).
Also run `window.RBAC.can('admin','identity.view')` → expected `true`, and `window.RBAC.can('sales','identity.view')` → expected `false`.

- [ ] **Step 5: Commit**

```bash
git add data.jsx
git commit -m "feat(catreadmin): add identity permissions + permission catalog to RBAC"
```

---

## Task 3: Create the Identity & Access screen (`screen-identity.jsx`)

**Files:**
- Create: `screen-identity.jsx`

- [ ] **Step 1: Create the file with the full screen**

Create `screen-identity.jsx` with exactly this content:

```javascript
/* ============================================================
   Identity & Access (owner / admin)
   Users · Roles · Access Matrix — all filterable by role.
   Reuses InviteModal / EditRoleModal from screen-team-settings.jsx
   (loaded earlier in index.html, so they exist in global scope).
   Edits live in local state only — they do NOT rewire window.RBAC,
   to avoid self-lockout.
   ============================================================ */
const IA_GROUP_ORDER = ['Overview', 'Clients', 'Onboarding', 'Revenue', 'Support', 'Admin'];

function IdentityScreen() {
  const { DB, Icon, Avatar, RBAC } = window;
  const toast = window.useToast();
  const { ROLES, PERMISSION_CATALOG } = RBAC;
  const { role: myRole } = window.useRole();
  const canManage = RBAC.can(myRole, 'identity.manage');

  const [tab, setTab] = React.useState('users');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [team, setTeam] = React.useState(DB.TEAM);
  const [matrix, setMatrix] = React.useState(() => {
    const m = {}; Object.keys(RBAC.MATRIX).forEach(k => { m[k] = RBAC.MATRIX[k].slice(); }); return m;
  });
  const [audit, setAudit] = React.useState([]);
  const [onlyGranted, setOnlyGranted] = React.useState(false);
  const [invite, setInvite] = React.useState(false);
  const [editUser, setEditUser] = React.useState(null);
  const seq = React.useRef(0);

  const roleList = Object.values(ROLES);
  const permEntries = Object.keys(PERMISSION_CATALOG).map(k => [k, PERMISSION_CATALOG[k]]);
  const roleHas = (r, k) => !!matrix[k] && matrix[k].includes(r);
  const me = (DB.TEAM.find(u => u.role === myRole && u.status === 'active') || { name: ROLES[myRole].name + ' User' }).name;

  const pushAudit = (action, target) => {
    seq.current += 1;
    const id = 'ia_' + seq.current;
    setAudit(a => [{ id, actor: me, role: myRole, action, target, time: 'just now' }, ...a]);
  };

  const toggleCell = (k, r) => {
    if (!canManage) return;
    const has = roleHas(r, k);
    setMatrix(m => ({ ...m, [k]: has ? m[k].filter(x => x !== r) : m[k].concat(r) }));
    toast({ title: (has ? 'Revoked ' : 'Granted ') + k, msg: (has ? 'from ' : 'to ') + ROLES[r].name, kind: has ? 'info' : 'success' });
    pushAudit((has ? 'revoked ' : 'granted ') + k, ROLES[r].name);
  };

  const roleOptions = [{ value: 'all', label: 'All roles' }].concat(roleList.map(r => ({ value: r.key, label: r.name })));

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Identity & Access'),
        React.createElement('p', { className: 'page-desc' }, team.length + ' users · ' + roleList.length + ' roles · ' + permEntries.length + ' permissions')),
      React.createElement('div', { className: 'page-actions' },
        canManage && React.createElement(Btn, { variant: 'primary', icon: Icon.userPlus, onClick: () => setInvite(true) }, 'Invite teammate'))),

    React.createElement('div', { className: 'row jb', style: { flexWrap: 'wrap', gap: 12, marginBottom: 16 } },
      React.createElement(window.Segmented, { value: tab, onChange: setTab, options: [
        { value: 'users', label: 'Users' }, { value: 'roles', label: 'Roles' }, { value: 'matrix', label: 'Access matrix' }] }),
      React.createElement('div', { className: 'row gap8' },
        React.createElement('span', { className: 'tiny muted' }, 'Role'),
        React.createElement(window.Segmented, { value: roleFilter, onChange: setRoleFilter, options: roleOptions }))),

    tab === 'users' && React.createElement(IAUsers, { team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit }),
    tab === 'roles' && React.createElement(IARoles, { roleList, roleFilter, team, permEntries, roleHas }),
    tab === 'matrix' && React.createElement(IAMatrix, { roleList, roleFilter, permEntries, roleHas, toggleCell, canManage, onlyGranted, setOnlyGranted }),

    audit.length > 0 && React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('div', { className: 'card-head' },
        React.createElement('h3', null, 'Session changes'),
        React.createElement('span', { className: 'badge badge-slate', style: { marginLeft: 'auto' } }, 'Audit log')),
      React.createElement('div', { style: { padding: '4px 0' } }, audit.map((a, i) =>
        React.createElement('div', { key: a.id, className: 'row gap12', style: { padding: '10px 16px', borderBottom: i < audit.length - 1 ? '1px solid var(--border-soft)' : 'none' } },
          React.createElement(Avatar, { name: a.actor, size: 22 }),
          React.createElement('div', { className: 'f1', style: { fontSize: 13 } },
            React.createElement('b', null, a.actor), React.createElement('span', { className: 'muted' }, ' ' + a.action + ' '), React.createElement('b', null, a.target)),
          React.createElement('span', { className: 'tiny muted' }, a.time))))),

    invite && React.createElement(InviteModal, { onClose: () => setInvite(false), onInvite: (u) => {
      setTeam(t => [...t, { ...u, id: 'u' + Date.now(), status: 'invited', lastLogin: '—', joined: '2026-06-15' }]);
      toast({ title: 'Invite sent', msg: u.email }); pushAudit('invited teammate', u.email); setInvite(false); } }),
    editUser && React.createElement(EditRoleModal, { user: editUser, onClose: () => setEditUser(null), onSave: (role) => {
      setTeam(t => t.map(x => x.id === editUser.id ? { ...x, role } : x));
      toast({ title: 'Role updated', msg: editUser.name + ' → ' + ROLES[role].name });
      pushAudit('changed role of ' + editUser.name + ' to', ROLES[role].name); setEditUser(null); } }));
}

function IAUsers({ team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit }) {
  const { Icon, Avatar, RBAC, StatusBadge } = window;
  const { ROLES } = RBAC;
  const q = query.trim().toLowerCase();
  const rows = team.filter(u => (roleFilter === 'all' || u.role === roleFilter) &&
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)));
  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-head' },
      React.createElement('div', { className: 'search-box', style: { maxWidth: 280 } },
        React.createElement(Icon.search, { size: 15 }),
        React.createElement('input', { placeholder: 'Search id, name, email…', value: query, onChange: e => setQuery(e.target.value) })),
      React.createElement('span', { className: 'tiny muted', style: { marginLeft: 'auto' } }, rows.length + ' of ' + team.length)),
    React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', { style: { width: 92 } }, 'ID'),
        React.createElement('th', null, 'Member'),
        React.createElement('th', null, 'Role'),
        React.createElement('th', null, 'Status'),
        React.createElement('th', null, 'Last login'),
        React.createElement('th', { style: { width: 40 } }))),
      React.createElement('tbody', null, rows.length === 0
        ? React.createElement('tr', null, React.createElement('td', { colSpan: 6 }, React.createElement(window.Empty, { title: 'No users match', icon: Icon.user })))
        : rows.map(u => React.createElement('tr', { key: u.id },
          React.createElement('td', null, React.createElement('code', { className: 'mono tiny muted' }, u.id)),
          React.createElement('td', null, React.createElement('div', { className: 'row gap10' },
            React.createElement(Avatar, { name: u.name, size: 32 }),
            React.createElement('div', null,
              React.createElement('div', { style: { fontWeight: 600 } }, u.name),
              React.createElement('div', { className: 'tiny muted' }, u.email)))),
          React.createElement('td', null, React.createElement('span', { className: 'role-badge', style: { background: ROLES[u.role].color + '22', color: ROLES[u.role].color } }, ROLES[u.role].name)),
          React.createElement('td', null, React.createElement(StatusBadge, { status: u.status })),
          React.createElement('td', { className: 'tiny muted' }, u.lastLogin),
          React.createElement('td', null, canManage && React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.moreH }) },
            React.createElement(window.MenuItem, { icon: Icon.edit, onClick: () => setEditUser(u) }, 'Edit role'),
            u.status === 'active'
              ? React.createElement(window.MenuItem, { icon: Icon.ban, danger: true, onClick: () => { setTeam(t => t.map(x => x.id === u.id ? { ...x, status: 'deactivated' } : x)); toast({ title: 'Deactivated', msg: u.name, kind: 'info' }); pushAudit('deactivated', u.name); } }, 'Deactivate')
              : React.createElement(window.MenuItem, { icon: Icon.checkCircle, onClick: () => { setTeam(t => t.map(x => x.id === u.id ? { ...x, status: 'active' } : x)); toast({ title: 'Reactivated', msg: u.name }); pushAudit('reactivated', u.name); } }, 'Reactivate')))))))));
}

function IARoles({ roleList, roleFilter, team, permEntries, roleHas }) {
  const shown = roleFilter === 'all' ? roleList : roleList.filter(r => r.key === roleFilter);
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, alignItems: 'start' } },
    shown.map(r => {
      const perms = permEntries.filter(([k]) => roleHas(r.key, k));
      const count = team.filter(u => u.role === r.key).length;
      return React.createElement('div', { key: r.key, className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('span', { style: { width: 10, height: 10, borderRadius: 3, background: r.color } }),
          React.createElement('h3', { style: { marginLeft: 8 } }, r.name),
          React.createElement('span', { className: 'badge badge-slate', style: { marginLeft: 'auto' } }, count + ' user' + (count === 1 ? '' : 's'))),
        React.createElement('div', { className: 'card-pad' },
          React.createElement('p', { className: 'tiny muted', style: { marginTop: 0 } }, r.desc),
          React.createElement('div', { className: 'tiny muted', style: { margin: '10px 0 6px', fontWeight: 600 } }, perms.length + ' permissions'),
          React.createElement('div', { className: 'row', style: { flexWrap: 'wrap', gap: 6 } },
            perms.length === 0
              ? React.createElement('span', { className: 'tiny muted' }, 'No permissions')
              : perms.map(([k, meta]) => React.createElement('span', { key: k, className: 'badge badge-slate', title: k }, meta.label)))));
    }));
}

function IAMatrix({ roleList, roleFilter, permEntries, roleHas, toggleCell, canManage, onlyGranted, setOnlyGranted }) {
  const { Icon } = window;
  const cols = roleList;
  const highlight = (rKey) => roleFilter !== 'all' && roleFilter === rKey;
  const rowsFor = (group) => permEntries
    .filter(([, m]) => m.group === group)
    .filter(([k]) => !onlyGranted || roleFilter === 'all' || roleHas(roleFilter, k));
  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-head' },
      React.createElement('h3', null, 'Access matrix'),
      React.createElement('label', { className: 'row gap6 tiny muted', style: { marginLeft: 'auto', cursor: roleFilter === 'all' ? 'not-allowed' : 'pointer' } },
        React.createElement('input', { type: 'checkbox', checked: onlyGranted, disabled: roleFilter === 'all', onChange: e => setOnlyGranted(e.target.checked) }),
        'Only granted')),
    React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl tbl-matrix' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, 'Permission'),
        cols.map(r => React.createElement('th', { key: r.key, style: { textAlign: 'center', background: highlight(r.key) ? r.color + '22' : undefined } },
          React.createElement('div', { className: 'row gap6', style: { justifyContent: 'center' } },
            React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: r.color } }),
            React.createElement('span', null, r.name)))))),
      React.createElement('tbody', null, IA_GROUP_ORDER.map(group => {
        const rows = rowsFor(group);
        if (rows.length === 0) return null;
        return React.createElement(React.Fragment, { key: group },
          React.createElement('tr', null, React.createElement('td', { colSpan: cols.length + 1, className: 'tiny muted', style: { fontWeight: 700, background: 'var(--surface-2)', textTransform: 'uppercase', letterSpacing: '.04em' } }, group)),
          rows.map(([k, meta]) => React.createElement('tr', { key: k },
            React.createElement('td', null,
              React.createElement('div', { style: { fontWeight: 600, fontSize: 13 } }, meta.label),
              React.createElement('code', { className: 'mono tiny muted' }, k)),
            cols.map(r => {
              const on = roleHas(r.key, k);
              return React.createElement('td', { key: r.key, style: { textAlign: 'center', background: highlight(r.key) ? r.color + '22' : undefined } },
                React.createElement('button', {
                  disabled: !canManage,
                  title: (on ? 'Granted' : 'Not granted') + ' · ' + r.name + (canManage ? ' · click to toggle' : ''),
                  onClick: () => toggleCell(k, r.key),
                  style: { width: 26, height: 26, borderRadius: 7, border: '1.5px solid ' + (on ? r.color : 'var(--border)'), background: on ? r.color + '22' : 'transparent', color: on ? r.color : 'var(--text-3)', cursor: canManage ? 'pointer' : 'default', display: 'inline-grid', placeItems: 'center' } },
                  on ? React.createElement(Icon.check, { size: 15 }) : React.createElement('span', { style: { width: 8, height: 2, borderRadius: 2, background: 'var(--border)' } }))); }))));
      }))));
}

window.IdentityScreen = IdentityScreen;
```

- [ ] **Step 2: Commit (screen not yet wired — that is Task 4)**

```bash
git add screen-identity.jsx
git commit -m "feat(catreadmin): add Identity & Access screen component"
```

---

## Task 4: Wire the screen into the app (`index.html` + `app.jsx`)

**Files:**
- Modify: `index.html`
- Modify: `app.jsx`

- [ ] **Step 1: Load the screen script**

In `index.html`, find the line:

```html
  <script type="text/babel" src="screen-team-settings.jsx"></script>
```

Add a new line directly **after** it:

```html
  <script type="text/babel" src="screen-identity.jsx"></script>
```

- [ ] **Step 2: Add the nav item**

In `app.jsx`, the Admin nav group is currently:

```javascript
  { group: 'Admin', items: [
    { key: 'team', label: 'Team', icon: Icon.team, perm: 'team.view', route: 'team' },
    { key: 'settings', label: 'Settings', icon: Icon.settings, perm: 'settings.view', route: 'settings' },
  ]},
```

Replace it with (adds `identity` above `team`):

```javascript
  { group: 'Admin', items: [
    { key: 'identity', label: 'Identity & Access', icon: Icon.shield, perm: 'identity.view', route: 'identity' },
    { key: 'team', label: 'Team', icon: Icon.team, perm: 'team.view', route: 'team' },
    { key: 'settings', label: 'Settings', icon: Icon.settings, perm: 'settings.view', route: 'settings' },
  ]},
```

- [ ] **Step 3: Add the route permission**

In `app.jsx`, the `ROUTE_PERM` object ends with:

```javascript
  support: 'support.view', health: 'support.view', team: 'team.view', settings: 'settings.view',
```

Replace that line with:

```javascript
  support: 'support.view', health: 'support.view', team: 'team.view', settings: 'settings.view',
  identity: 'identity.view',
```

- [ ] **Step 4: Add the breadcrumb**

In `app.jsx`, the `CRUMB` object ends with:

```javascript
  health: ['Support', 'System health'], team: ['Team'], settings: ['Settings'],
```

Replace that line with:

```javascript
  health: ['Support', 'System health'], team: ['Team'], settings: ['Settings'],
  identity: ['Identity & Access'],
```

- [ ] **Step 5: Add the render case**

In `app.jsx`, in `renderScreen`'s `switch`, find:

```javascript
      case 'settings': return React.createElement(window.SettingsScreen);
```

Add directly **after** it:

```javascript
      case 'identity': return React.createElement(window.IdentityScreen);
```

- [ ] **Step 6: Verify in the browser**

Start the server (if not running): `npx serve .` and open the URL. On the login screen, choose the **Admin** demo login (or use the role switcher to act as **Admin**). Then verify:

1. The sidebar **Admin** group shows **Identity & Access** above Team.
2. Clicking it opens the screen with breadcrumb "Identity & Access" and three tabs: **Users · Roles · Access matrix**.
3. **Users** tab shows an **ID** column (e.g. `u1`), the search box filters by id/name/email, and the role filter (top-right) narrows the list.
4. **Roles** tab shows six role cards, each with a user count and a permission list.
5. **Access matrix** tab shows permissions grouped by section with ✓/— toggle cells. Clicking a cell flips it, raises a toast, and adds a "Session changes" audit row.
6. Switch the role filter to e.g. **Finance** → Users filters to finance users, the Roles tab shows only the Finance card, and the matrix highlights the Finance column (and the "Only granted" checkbox becomes enabled).
7. Use the role switcher to act as **Sales** → **Identity & Access** disappears from the sidebar, and the screen is not reachable.

- [ ] **Step 7: Commit**

```bash
git add index.html app.jsx
git commit -m "feat(catreadmin): wire Identity & Access into nav and router"
```

---

## Task 5: Access-matrix CSS polish (`styles.css`)

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Append the matrix styles**

Add this block at the **end** of `styles.css`:

```css
/* ── Identity & Access — access matrix ── */
.tbl-matrix th, .tbl-matrix td { vertical-align: middle; }
.tbl-matrix tbody td:first-child { white-space: nowrap; }
.tbl-matrix button:not(:disabled):hover { filter: brightness(1.12); }
```

- [ ] **Step 2: Verify**

Reload the app (Admin role) → Access matrix tab. The toggle cells brighten on hover; the permission name/code column does not wrap awkwardly. No other screen is affected (the `.tbl-matrix` class is unique to this screen).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style(catreadmin): polish Identity & Access matrix cells"
```

---

## Final verification

- [ ] Run `node api/adapter.test.js` → `OK: all canonical adapter contracts pass`.
- [ ] In the browser console: `Object.keys(window.RBAC.MATRIX).filter(k => !window.RBAC.PERMISSION_CATALOG[k])` → `[]`.
- [ ] As **Admin**: all three tabs render, role filter drives every tab, matrix toggles produce toasts + audit rows.
- [ ] As **Sales**: Identity & Access is hidden and unreachable.
- [ ] `git log --oneline` shows the five feature commits plus the earlier spec commit.

---

## Self-review notes

- **Spec coverage:** Users-by-ID (Task 3 `IAUsers`, ID column) · Roles + permissions (Task 3 `IARoles`) · editable matrix (Task 3 `IAMatrix` + `toggleCell`) · filter-by-role (Task 3 shared `roleFilter`) · owner+admin gating (Task 2 MATRIX + Task 4 nav/route) · canonical seam (Task 1). All spec sections map to a task.
- **Editing model:** `toggleCell`/user edits mutate local `matrix`/`team` state only; `window.RBAC` is never written — matches the spec's prototype-safe rule.
- **Type/name consistency:** `roleHas(role, key)`, `toggleCell(key, role)`, `pushAudit(action, target)`, `permEntries` (array of `[key, meta]`), and `IA_GROUP_ORDER` are used consistently across `IdentityScreen`, `IAUsers`, `IARoles`, `IAMatrix`. DTO field names (`description`, `roles`) match `ROLE_KEYS`/`PERMISSION_KEYS` from Task 1.
- **Reuse:** `InviteModal`/`EditRoleModal` are referenced from global scope (defined in `screen-team-settings.jsx`, loaded earlier) — no duplication, no extraction.
```