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
  const me = (team.find(u => u.role === myRole && u.status === 'active') || { name: ROLES[myRole].name + ' User' }).name;

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
      })))));
}

window.IdentityScreen = IdentityScreen;
