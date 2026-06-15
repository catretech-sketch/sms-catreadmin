# Per-user Access Editor + Access Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** On the Identity & Access screen's Users tab, click a user to open a full **Access editor** (role + per-permission overrides + activate/deactivate), and add an **Export schedule (CSV)** button that exports users × effective permissions.

**Architecture:** Extends `screen-identity.jsx` only. Each user gains an optional `overrides` map (`{ permKey: bool }`); a user's *effective* permission = override if present, else the role default (`roleHas` over the screen's local `matrix`). All edits stay in local React state — never mutate `window.RBAC`. A new `AccessModal` replaces the old per-row ⋮ menu (it now covers role, status, and permissions).

**Tech Stack:** React 18 via CDN + Babel, `React.createElement` house style, no build step.

---

## File Structure
- `screen-identity.jsx` — **modify**: add `effective` helper in `IdentityScreen`; pass it + `permEntries`/`roleHas` to `IAUsers`; swap the `editUser` modal from `EditRoleModal` to a new `AccessModal`; rewrite `IAUsers` (clickable rows, Access column, Export CSV, no ⋮ menu); append `AccessModal`.

Verification: parse-only syntax check (browser globals) via the Function-constructor trick. Browser checks documented for a human.

---

## Task 1: Effective-permission helper + modal wiring (`IdentityScreen`)

**Files:** Modify `screen-identity.jsx`

- [ ] **Step 1: Add the `effective` helper.** Find:
```javascript
  const roleHas = (r, k) => !!matrix[k] && matrix[k].includes(r);
```
Add directly after it:
```javascript
  const effective = (u, k) => (u.overrides && Object.prototype.hasOwnProperty.call(u.overrides, k)) ? u.overrides[k] : roleHas(u.role, k);
```

- [ ] **Step 2: Pass new props to `IAUsers`.** Find:
```javascript
    tab === 'users' && React.createElement(IAUsers, { team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit }),
```
Replace with:
```javascript
    tab === 'users' && React.createElement(IAUsers, { team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit, permEntries, roleHas, effective }),
```

- [ ] **Step 3: Swap the user modal to `AccessModal`.** Find:
```javascript
    editUser && React.createElement(EditRoleModal, { user: editUser, onClose: () => setEditUser(null), onSave: (role) => {
      setTeam(t => t.map(x => x.id === editUser.id ? { ...x, role } : x));
      toast({ title: 'Role updated', msg: editUser.name + ' → ' + ROLES[role].name });
      pushAudit('changed role of ' + editUser.name + ' to', ROLES[role].name); setEditUser(null); } }));
```
Replace with:
```javascript
    editUser && React.createElement(AccessModal, {
      user: editUser, roleList, permEntries, roleHas,
      onClose: () => setEditUser(null),
      onSave: ({ role, status, overrides }) => {
        setTeam(t => t.map(x => x.id === editUser.id ? { ...x, role, status, overrides } : x));
        toast({ title: 'Access updated', msg: editUser.name });
        pushAudit('edited access of ' + editUser.name, ROLES[role].name + ' · ' + status + (Object.keys(overrides).length ? ' · ' + Object.keys(overrides).length + ' override(s)' : ''));
        setEditUser(null);
      } }));
```

- [ ] **Step 4: Syntax check.** Run:
```
node -e "new Function(require('fs').readFileSync('./screen-identity.jsx','utf8')); console.log('syntax ok')"
```
Expected: `syntax ok` (it will stay ok across Task 1–2; `AccessModal`/new `IAUsers` are added in Task 2 — the references are resolved at runtime, and the parser doesn't care that they're defined later in the file).

- [ ] **Step 5: Commit.**
```bash
git add screen-identity.jsx
git commit -m "feat(catreadmin): wire per-user AccessModal + effective-permission helper"
```

---

## Task 2: Rewrite `IAUsers` + add `AccessModal` (`screen-identity.jsx`)

**Files:** Modify `screen-identity.jsx`

- [ ] **Step 1: Replace the whole `IAUsers` function.** Find the entire existing `function IAUsers({ ... }) { ... }` (it starts with `function IAUsers({ team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit }) {` and ends at its closing `}` before `function IARoles`). Replace the ENTIRE function with:
```javascript
function IAUsers({ team, setTeam, roleFilter, query, setQuery, canManage, setEditUser, toast, pushAudit, permEntries, roleHas, effective }) {
  const { Icon, Avatar, RBAC, StatusBadge } = window;
  const { ROLES } = RBAC;
  const q = query.trim().toLowerCase();
  const rows = team.filter(u => (roleFilter === 'all' || u.role === roleFilter) &&
    (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)));

  const exportCSV = () => {
    const header = ['ID', 'Name', 'Email', 'Role', 'Status'].concat(permEntries.map(([, m]) => m.label));
    const data = [header].concat(rows.map(u => [u.id, u.name, u.email, ROLES[u.role].name, u.status]
      .concat(permEntries.map(([k]) => effective(u, k) ? 'Yes' : ''))));
    const csv = data.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'catre-access-schedule.csv';
    a.click();
    toast({ title: 'Export ready', msg: 'catre-access-schedule.csv · ' + rows.length + ' users' });
  };

  const overrideCount = (u) => u.overrides ? Object.keys(u.overrides).length : 0;

  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-head' },
      React.createElement('div', { className: 'search-box', style: { maxWidth: 280 } },
        React.createElement(Icon.search, { size: 15 }),
        React.createElement('input', { placeholder: 'Search id, name, email…', value: query, onChange: e => setQuery(e.target.value) })),
      React.createElement('div', { className: 'row gap10', style: { marginLeft: 'auto' } },
        React.createElement('span', { className: 'tiny muted' }, rows.length + ' of ' + team.length),
        React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.download, onClick: exportCSV }, 'Export schedule'))),
    React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', { style: { width: 92 } }, 'ID'),
        React.createElement('th', null, 'Member'),
        React.createElement('th', null, 'Role'),
        React.createElement('th', null, 'Access'),
        React.createElement('th', null, 'Status'),
        React.createElement('th', null, 'Last login'),
        canManage && React.createElement('th', { key: '_act', style: { width: 40 } }))),
      React.createElement('tbody', null, rows.length === 0
        ? React.createElement('tr', { key: '_empty' }, React.createElement('td', { colSpan: canManage ? 7 : 6 }, React.createElement(window.Empty, { title: 'No users match', icon: Icon.user })))
        : rows.map(u => {
            const oc = overrideCount(u);
            const cells = [
              React.createElement('td', { key: 'id' }, React.createElement('code', { className: 'mono tiny muted' }, u.id)),
              React.createElement('td', { key: 'm' }, React.createElement('div', { className: 'row gap10' },
                React.createElement(Avatar, { name: u.name, size: 32 }),
                React.createElement('div', null,
                  React.createElement('div', { style: { fontWeight: 600 } }, u.name),
                  React.createElement('div', { className: 'tiny muted' }, u.email)))),
              React.createElement('td', { key: 'r' }, React.createElement('span', { className: 'role-badge', style: { background: ROLES[u.role].color + '22', color: ROLES[u.role].color } }, ROLES[u.role].name)),
              React.createElement('td', { key: 'a' }, oc > 0
                ? React.createElement('span', { className: 'badge badge-amber', title: oc + ' permission override' + (oc === 1 ? '' : 's') }, oc + ' override' + (oc === 1 ? '' : 's'))
                : React.createElement('span', { className: 'tiny muted' }, 'Role default')),
              React.createElement('td', { key: 's' }, React.createElement(StatusBadge, { status: u.status })),
              React.createElement('td', { key: 'l', className: 'tiny muted' }, u.lastLogin),
            ];
            if (canManage) cells.push(React.createElement('td', { key: '_act' },
              React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.sliders, title: 'Edit access', onClick: (e) => { e.stopPropagation(); setEditUser(u); } })));
            return React.createElement('tr', { key: u.id, onClick: canManage ? () => setEditUser(u) : undefined, style: canManage ? { cursor: 'pointer' } : undefined }, cells);
          }))));
}
```

- [ ] **Step 2: Append `AccessModal`** at the END of the file, AFTER `window.IdentityScreen = IdentityScreen;`:
```javascript

function AccessModal({ user, roleList, permEntries, roleHas, onClose, onSave }) {
  const { Avatar } = window;
  const [role, setRole] = React.useState(user.role);
  const [status, setStatus] = React.useState(user.status);
  const [overrides, setOverrides] = React.useState(() => ({ ...(user.overrides || {}) }));

  const baseHas = (k) => roleHas(role, k);
  const has = (k) => Object.prototype.hasOwnProperty.call(overrides, k);
  const eff = (k) => has(k) ? overrides[k] : baseHas(k);
  const isOverride = (k) => has(k) && overrides[k] !== baseHas(k);

  const toggle = (k) => setOverrides(o => {
    const next = !(Object.prototype.hasOwnProperty.call(o, k) ? o[k] : baseHas(k));
    const n = { ...o };
    if (next === baseHas(k)) delete n[k]; else n[k] = next;
    return n;
  });
  const resetOne = (k) => setOverrides(o => { const n = { ...o }; delete n[k]; return n; });
  const clearAll = () => setOverrides({});

  // when role changes, drop any override that now equals the new role's default
  React.useEffect(() => {
    setOverrides(o => { const n = {}; Object.keys(o).forEach(k => { if (o[k] !== roleHas(role, k)) n[k] = o[k]; }); return n; });
  }, [role]); // eslint-disable-line

  const overrideKeys = Object.keys(overrides).filter(isOverride);
  const grouped = IA_GROUP_ORDER.map(g => ({ group: g, perms: permEntries.filter(([, m]) => m.group === g) })).filter(x => x.perms.length);

  return React.createElement(window.Modal, { open: true, onClose, size: 'lg' },
    React.createElement('div', { className: 'modal-head' },
      React.createElement(Avatar, { name: user.name, size: 38 }),
      React.createElement('div', { className: 'mh-text' },
        React.createElement('h3', null, 'Edit access'),
        React.createElement('p', null, user.name + ' · ' + user.email))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { className: 'fc gap16' },
        React.createElement('div', { className: 'row jb fw gap12' },
          React.createElement('div', { className: 'row gap8' },
            React.createElement('span', { className: 'tiny muted', style: { fontWeight: 600 } }, 'Status'),
            React.createElement(window.StatusBadge, { status }),
            React.createElement(Btn, { size: 'sm', variant: status === 'active' ? 'default' : 'primary', onClick: () => setStatus(s => s === 'active' ? 'deactivated' : 'active') }, status === 'active' ? 'Deactivate' : 'Activate')),
          overrideKeys.length > 0 && React.createElement('button', { className: 'tiny', style: { color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }, onClick: clearAll }, 'Reset all to role (' + overrideKeys.length + ')')),
        React.createElement('div', { className: 'field' },
          React.createElement('label', null, 'Role'),
          React.createElement('select', { className: 'select', value: role, onChange: e => setRole(e.target.value) }, roleList.map(r => React.createElement('option', { key: r.key, value: r.key }, r.name)))),
        React.createElement('div', null,
          React.createElement('div', { className: 'tiny muted', style: { fontWeight: 600, marginBottom: 8 } }, 'Permissions · tick to grant, untick to revoke (overrides the role default)'),
          grouped.map(({ group, perms }) => React.createElement('div', { key: group, style: { marginBottom: 12 } },
            React.createElement('div', { className: 'tiny muted', style: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 } }, group),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
              perms.map(([k, m]) => React.createElement('label', { key: k, className: 'row gap8', style: { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border-soft)', cursor: 'pointer', background: isOverride(k) ? 'var(--accent-ghost)' : 'transparent' } },
                React.createElement('input', { type: 'checkbox', checked: eff(k), onChange: () => toggle(k) }),
                React.createElement('span', { style: { fontSize: 12.5, flex: 1 } }, m.label),
                isOverride(k) && React.createElement('span', { className: 'badge badge-amber', style: { fontSize: 10 } }, 'override'),
                isOverride(k) && React.createElement('span', { className: 'tiny muted', onClick: (e) => { e.preventDefault(); resetOne(k); }, title: 'Reset to role', style: { cursor: 'pointer' } }, '↺')))))))),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', onClick: () => onSave({ role, status, overrides }) }, 'Save access')));
}
```

- [ ] **Step 3: Syntax check.** Run:
```
node -e "new Function(require('fs').readFileSync('./screen-identity.jsx','utf8')); console.log('syntax ok')"
```
Expected: `syntax ok`. If SyntaxError, fix paren/bracket balance in the new blocks.

- [ ] **Step 4: Commit.**
```bash
git add screen-identity.jsx
git commit -m "feat(catreadmin): per-user access editor + CSV access schedule on Users tab"
```

---

## Browser verification (human)
Run the server, log in as **Admin**, open **Identity & Access → Users**:
- Each row shows an **Access** column ("Role default" or "N overrides"). Rows are clickable; there's an **Edit-access** (sliders) button.
- Click a user → **Access editor**: Status with Deactivate/Activate, a Role select, and a grouped permission checklist. Ticking/unticking a box away from the role default tags it **override** and tints it; **↺** resets one; **Reset all to role** clears them. Changing the **Role** re-bases the checklist and prunes now-redundant overrides.
- **Save access** → the row's Access column reflects the override count, Status badge updates, a toast + a "Session changes" audit row appear.
- **Export schedule** downloads `catre-access-schedule.csv` for the currently filtered rows: columns ID/Name/Email/Role/Status + one per permission, `Yes` where the user effectively has it.
- As **Sales**: rows are not clickable, no Edit-access button, no Export? (Export stays — it's read-only; keep it visible. The ⋮/edit affordances are gone.)

## Self-review notes
- Effective model: `effective(u,k)` and the modal's `eff(k)` both = override-or-role-default; modal prunes overrides equal to the role default (on toggle and on role change) so `overrides` only ever holds genuine diffs.
- No `window.RBAC` mutation: overrides live on local `team` user objects; matrix stays local state.
- CSV uses the same Blob/`download` idiom as `screen-reports.jsx`; exports the filtered `rows`.
- Names consistent: `AccessModal`, `effective`, `overrides`, `permEntries`, `roleHas` across `IdentityScreen`/`IAUsers`/`AccessModal`.
