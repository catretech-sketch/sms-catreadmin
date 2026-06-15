# School People (Students & Staff) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a per-school **People** tab to the Client detail page with full CRUD over Students and Staff (mock, local-state), gated by a new `clients.manage_people` permission.

**Architecture:** `data.jsx` gains a deterministic `rosterFor(clientId)` generator (the panel only stores aggregate counts) plus a new RBAC permission + catalog entry. `screen-client-detail.jsx` gains a `People` tab rendering `PeopleTab` (Students/Staff toggle, search, table, add/edit/deactivate) and a `PersonModal` add/edit form. Edits are local React state only.

**Tech Stack:** React 18 via CDN + Babel-standalone, `React.createElement` house style, no build step.

---

## File Structure
- `data.jsx` — **modify**: add `clients.manage_people` to `MATRIX` + `PERMISSION_CATALOG`; add `rosterFor` generator; export `rosterFor` on `window.DB`.
- `screen-client-detail.jsx` — **modify**: add `people` tab + render line; append `PEOPLE_STATUS`, `PeopleTab`, `PersonModal`.

Verification: `data.jsx` is browser-only but loadable under node with a faked `window` (no JSX). `screen-client-detail.jsx` is plain `React.createElement` JS — syntax-check with the Function-constructor parse trick. No automated UI tests exist (prototype); browser checks are documented for a human.

---

## Task 1: RBAC permission + roster generator (`data.jsx`)

**Files:** Modify `data.jsx`

- [ ] **Step 1: Add the permission to `MATRIX`.** Find:
```javascript
  'clients.impersonate':   ['owner','admin','support'],
```
Add directly after it (still inside `MATRIX`):
```javascript
  'clients.manage_people': ['owner','admin'],
```

- [ ] **Step 2: Add the catalog entry.** In `PERMISSION_CATALOG`, find:
```javascript
  'clients.impersonate':    { label: 'Impersonate client',       group: 'Clients' },
```
Add directly after it:
```javascript
  'clients.manage_people':  { label: 'Manage school people',     group: 'Clients' },
```

- [ ] **Step 3: Add the roster generator.** Find the line `const TEAM = [` and insert this block immediately BEFORE it:
```javascript
/* ---------------- per-school people rosters (mock) ----------------
   The panel only stores aggregate counts per tenant, so this fabricates
   a deterministic, representative roster for a school's detail page. */
const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
const CLASS_SECTIONS = ['A','B','C','D'];  // NOTE: `SECTIONS` already exists in data.jsx — do not reuse it
const STAFF_DEPTS = ['Teaching','Administration','Finance','Support','Transport'];
const STAFF_ROLES = {
  Teaching:       ['Class Teacher','Subject Teacher','Senior Teacher','Coordinator'],
  Administration: ['Principal','Vice Principal','Office Admin','Receptionist'],
  Finance:        ['Accountant','Fee Manager'],
  Support:        ['Lab Assistant','Librarian','IT Support'],
  Transport:      ['Transport Manager','Driver'],
};
// FNV-1a string hash -> non-zero seed, so each tenant gets a stable roster.
const hashSeed = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) || 1; };
const rosterFor = (clientId) => {
  const client = CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
  let s = hashSeed(clientId);
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pk = (a) => a[Math.floor(r() * a.length)];
  const btw = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const sfx = clientId.replace(/^tn_/, '');
  const students = Array.from({ length: Math.min(client.students, 24) }, (_, i) => {
    const last = pk(LAST);
    const sFirst = pk(FIRST);
    // guardian shares the family surname but is always a different first name
    const gFirst = FIRST[(FIRST.indexOf(sFirst) + 1 + Math.floor(r() * (FIRST.length - 1))) % FIRST.length];
    return { id: 'st_' + sfx + '_' + (i + 1), name: sFirst + ' ' + last, grade: pk(GRADES), section: pk(CLASS_SECTIONS), roll: btw(1, 60), guardian: gFirst + ' ' + last, status: r() < 0.9 ? 'active' : 'inactive' };
  });
  const emailSeen = {};
  const staff = Array.from({ length: Math.min(client.staff, 10) }, (_, i) => {
    const dept = pk(STAFF_DEPTS); const first = pk(FIRST); const last = pk(LAST);
    const lp = (first + '.' + last).toLowerCase();
    emailSeen[lp] = (emailSeen[lp] || 0) + 1;
    const email = (emailSeen[lp] > 1 ? lp + emailSeen[lp] : lp) + '@' + client.slug + '.edu.in';
    return { id: 'sf_' + sfx + '_' + (i + 1), name: first + ' ' + last, dept, role: pk(STAFF_ROLES[dept]), email, status: r() < 0.92 ? 'active' : 'inactive' };
  });
  return { students, staff };
};
```

- [ ] **Step 4: Export `rosterFor` on `window.DB`.** Find:
```javascript
  CLIENTS, TEAM, TICKETS, INVOICES, ONBOARDING, AUDIT,
```
Replace with:
```javascript
  CLIENTS, rosterFor, TEAM, TICKETS, INVOICES, ONBOARDING, AUDIT,
```

- [ ] **Step 5: Verify** (syntax + behaviour, via a faked window):
```
node -e "global.window={}; require('./data.jsx'); const D=global.window.DB, R=global.window.RBAC; const a=D.rosterFor('tn_greenwood'), b=D.rosterFor('tn_greenwood'); console.log('students',a.students.length,'staff',a.staff.length,'deterministic',JSON.stringify(a)===JSON.stringify(b),'sampleStudent',JSON.stringify(a.students[0])); const miss=Object.keys(R.MATRIX).filter(k=>!R.PERMISSION_CATALOG[k]); console.log('catalog missing',miss,'admin',R.can('admin','clients.manage_people'),'sales',R.can('sales','clients.manage_people'));"
```
Expected: students > 0, staff > 0, `deterministic true`, a sample student object with `id/name/grade/section/roll/guardian/status`, `catalog missing []`, `admin true`, `sales false`.

- [ ] **Step 6: Commit**
```bash
git add data.jsx
git commit -m "feat(catreadmin): add school people roster generator + manage_people permission"
```

---

## Task 2: People tab + CRUD UI (`screen-client-detail.jsx`)

**Files:** Modify `screen-client-detail.jsx`

- [ ] **Step 1: Add the People tab.** In the `tabs` array, find:
```javascript
    { key: 'contacts', label: 'Contacts' },
  ].filter(t => !t.perm || can(t.perm));
```
Replace with:
```javascript
    { key: 'contacts', label: 'Contacts' },
    { key: 'people', label: 'People' },
  ].filter(t => !t.perm || can(t.perm));
```

- [ ] **Step 2: Add the render line.** Find:
```javascript
    tab === 'contacts' && React.createElement(ContactsTab, { client }),
```
Add directly after it:
```javascript
    tab === 'people' && React.createElement(PeopleTab, { client, canEdit: can('clients.manage_people') }),
```

- [ ] **Step 3: Append the components.** At the VERY END of the file, AFTER `window.ClientDetail = ClientDetail;`, append:
```javascript

/* ---------------- People (students & staff) ---------------- */
const PEOPLE_STATUS = {
  active:   { cls: 'badge-green', dot: true, label: 'Active' },
  inactive: { cls: 'badge-slate', label: 'Inactive' },
};

function PeopleTab({ client, canEdit }) {
  const { DB, Icon, Avatar, StatusBadge } = window;
  const toast = window.useToast();
  const [kind, setKind] = React.useState('students');
  const [roster, setRoster] = React.useState(() => DB.rosterFor(client.id));
  const [query, setQuery] = React.useState('');
  const [editing, setEditing] = React.useState(null);
  const [adding, setAdding] = React.useState(false);
  React.useEffect(() => { setRoster(DB.rosterFor(client.id)); setQuery(''); }, [client.id]);

  const q = query.trim().toLowerCase();
  const rows = roster[kind].filter(p => !q || p.name.toLowerCase().includes(q) ||
    (kind === 'students'
      ? (String(p.roll).includes(q) || p.grade.toLowerCase().includes(q))
      : (p.dept.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))));

  const upsert = (person) => setRoster(rt => {
    const arr = rt[kind];
    const exists = arr.some(p => p.id === person.id);
    return { ...rt, [kind]: exists ? arr.map(p => p.id === person.id ? person : p) : [person, ...arr] };
  });
  const toggleStatus = (p) => {
    const next = p.status === 'active' ? 'inactive' : 'active';
    setRoster(rt => ({ ...rt, [kind]: rt[kind].map(x => x.id === p.id ? { ...x, status: next } : x) }));
    toast({ title: next === 'active' ? 'Reactivated' : 'Deactivated', msg: p.name, kind: next === 'active' ? 'success' : 'info' });
  };

  const headers = kind === 'students'
    ? ['Name', 'Grade', 'Section', 'Roll', 'Guardian', 'Status']
    : ['Name', 'Department', 'Role', 'Email', 'Status'];

  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-head' },
      React.createElement(window.Segmented, { value: kind, onChange: setKind, options: [
        { value: 'students', label: 'Students · ' + roster.students.length },
        { value: 'staff', label: 'Staff · ' + roster.staff.length }] }),
      React.createElement('div', { className: 'search-box', style: { maxWidth: 240, marginLeft: 12 } },
        React.createElement(Icon.search, { size: 15 }),
        React.createElement('input', { placeholder: 'Search ' + kind + '…', value: query, onChange: e => setQuery(e.target.value) })),
      canEdit && React.createElement(Btn, { variant: 'primary', size: 'sm', icon: Icon.plus, style: { marginLeft: 'auto' }, onClick: () => setAdding(true) }, 'Add ' + (kind === 'students' ? 'student' : 'staff'))),
    React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
      React.createElement('thead', null, React.createElement('tr', null,
        headers.map(h => React.createElement('th', { key: h }, h)),
        canEdit && React.createElement('th', { key: '_act', style: { width: 40 } }))),
      React.createElement('tbody', null, rows.length === 0
        ? React.createElement('tr', null, React.createElement('td', { colSpan: headers.length + (canEdit ? 1 : 0) }, React.createElement(window.Empty, { title: 'No ' + kind + ' found', icon: Icon.user })))
        : rows.map(p => {
            const cells = kind === 'students'
              ? [
                  React.createElement('td', { key: 'n' }, React.createElement('div', { className: 'row gap10' }, React.createElement(Avatar, { name: p.name, size: 28 }), React.createElement('span', { style: { fontWeight: 600 } }, p.name))),
                  React.createElement('td', { key: 'g' }, p.grade),
                  React.createElement('td', { key: 's' }, p.section),
                  React.createElement('td', { key: 'r', className: 'mono' }, p.roll),
                  React.createElement('td', { key: 'gu', className: 'tiny muted' }, p.guardian),
                  React.createElement('td', { key: 'st' }, React.createElement(StatusBadge, { status: p.status, map: PEOPLE_STATUS })),
                ]
              : [
                  React.createElement('td', { key: 'n' }, React.createElement('div', { className: 'row gap10' }, React.createElement(Avatar, { name: p.name, size: 28 }), React.createElement('span', { style: { fontWeight: 600 } }, p.name))),
                  React.createElement('td', { key: 'd' }, p.dept),
                  React.createElement('td', { key: 'ro' }, p.role),
                  React.createElement('td', { key: 'e', className: 'tiny muted' }, p.email),
                  React.createElement('td', { key: 'st' }, React.createElement(StatusBadge, { status: p.status, map: PEOPLE_STATUS })),
                ];
            if (canEdit) cells.push(React.createElement('td', { key: '_act' },
              React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.moreH }) },
                React.createElement(window.MenuItem, { icon: Icon.edit, onClick: () => setEditing(p) }, 'Edit'),
                p.status === 'active'
                  ? React.createElement(window.MenuItem, { icon: Icon.ban, danger: true, onClick: () => toggleStatus(p) }, 'Deactivate')
                  : React.createElement(window.MenuItem, { icon: Icon.checkCircle, onClick: () => toggleStatus(p) }, 'Reactivate'))));
            return React.createElement('tr', { key: p.id }, cells);
          }))),
    (adding || editing) && React.createElement(PersonModal, {
      kind, person: editing, slug: client.slug,
      onClose: () => { setAdding(false); setEditing(null); },
      onSave: (person) => { upsert(person); toast({ title: editing ? 'Saved' : 'Added', msg: person.name }); setAdding(false); setEditing(null); } }));
}

function PersonModal({ kind, person, slug, onClose, onSave }) {
  const isStudent = kind === 'students';
  const blank = isStudent
    ? { name: '', grade: 'Grade 1', section: 'A', roll: '', guardian: '', status: 'active' }
    : { name: '', dept: 'Teaching', role: '', email: '', status: 'active' };
  const [form, setForm] = React.useState(person ? { ...person } : blank);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && (isStudent ? String(form.roll).trim() : String(form.role).trim());
  const sfx = (slug || 'sch').replace(/-/g, '');
  const grades = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
  const depts = ['Teaching','Administration','Finance','Support','Transport'];
  const field = (label, node) => React.createElement('div', { className: 'field' }, React.createElement('label', null, label), node);
  const input = (k, ph) => React.createElement('input', { className: 'input', value: form[k], placeholder: ph, onChange: e => set(k, e.target.value) });
  const select = (k, opts) => React.createElement('select', { className: 'select', value: form[k], onChange: e => set(k, e.target.value) }, opts.map(o => React.createElement('option', { key: o, value: o }, o)));
  const submit = () => {
    const id = person ? person.id : (isStudent ? 'st_' : 'sf_') + sfx + '_' + Date.now();
    const out = { ...form, id };
    if (isStudent) out.roll = Number(form.roll) || form.roll;
    onSave(out);
  };
  return React.createElement(window.Modal, { open: true, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: 'var(--accent-ghost)', color: 'var(--accent)' } }, React.createElement(window.Icon.userPlus, { size: 19 })),
      React.createElement('div', { className: 'mh-text' },
        React.createElement('h3', null, (person ? 'Edit ' : 'Add ') + (isStudent ? 'student' : 'staff')),
        React.createElement('p', null, isStudent ? 'Student record' : 'Staff member'))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { className: 'fc gap14' },
        field('Full name', input('name', isStudent ? 'Aarav Sharma' : 'Priya Nair')),
        isStudent
          ? React.createElement('div', { className: 'row gap10' },
              React.createElement('div', { className: 'f1' }, field('Grade', select('grade', grades))),
              React.createElement('div', { className: 'f1' }, field('Section', select('section', ['A', 'B', 'C', 'D']))),
              React.createElement('div', { className: 'f1' }, field('Roll no.', input('roll', '12'))))
          : React.createElement('div', { className: 'row gap10' },
              React.createElement('div', { className: 'f1' }, field('Department', select('dept', depts))),
              React.createElement('div', { className: 'f1' }, field('Role', input('role', 'Class Teacher')))),
        isStudent
          ? field('Guardian', input('guardian', 'Parent name'))
          : field('Email', input('email', 'name@' + (slug || 'school') + '.edu.in')),
        field('Status', select('status', ['active', 'inactive'])))),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', disabled: !valid, onClick: submit }, person ? 'Save changes' : (isStudent ? 'Add student' : 'Add staff'))));
}
```

- [ ] **Step 4: Verify syntax** (parse-only; references browser globals):
```
node -e "new Function(require('fs').readFileSync('./screen-client-detail.jsx','utf8')); console.log('syntax ok')"
```
Expected: `syntax ok`.

- [ ] **Step 5: Commit**
```bash
git add screen-client-detail.jsx
git commit -m "feat(catreadmin): add People tab with student/staff CRUD to client detail"
```

---

## Browser verification (human)
Run `npx serve .` (or the running server), log in as **Admin**, open **Clients → any school → People**:
- Students/Staff toggle shows counts; search filters; table shows the right columns per kind.
- **+ Add** opens the modal (student vs staff fields); saving prepends the row + toast.
- **⋮ → Edit** pre-fills and saves; **Deactivate/Reactivate** flips the status badge + toast.
- Switch role to **Sales**: the People tab is still visible but read-only (no Add button, no ⋮ menu).
- Open the Identity & Access → Access matrix: `Manage school people` appears under the Clients group.

## Self-review notes
- Spec coverage: rosters (Task 1 `rosterFor`) · permission + IAM cohesion (Task 1 MATRIX/catalog) · People tab (Task 2 tab + render) · CRUD (Task 2 `PeopleTab` add/edit/toggle + `PersonModal`) · view/edit gating (`canEdit = can('clients.manage_people')`).
- Editing model: all CRUD mutates local `roster` state; `DB.rosterFor` is never mutated.
- Name consistency: `PeopleTab`, `PersonModal`, `PEOPLE_STATUS`, `rosterFor`, `clients.manage_people` used consistently across both files.
