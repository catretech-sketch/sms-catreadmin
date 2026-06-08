/* ============================================================
   Team (Owner only) + Settings (Owner only)
   ============================================================ */
function TeamScreen() {
  const { DB, Icon, Avatar, RBAC, StatusBadge } = window;
  const toast = window.useToast();
  const [team, setTeam] = React.useState(DB.TEAM);
  const [invite, setInvite] = React.useState(false);
  const [editUser, setEditUser] = React.useState(null);
  const { ROLES } = RBAC;

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Team'),
        React.createElement('p', { className: 'page-desc' }, team.filter(u=>u.status==='active').length + ' active staff · ' + team.length + ' total')),
      React.createElement('div', { className: 'page-actions' },
        React.createElement(Btn, { variant: 'primary', icon: Icon.userPlus, onClick: () => setInvite(true) }, 'Invite teammate'))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' } },
      React.createElement('div', { className: 'card' }, React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', null, 'Member'), React.createElement('th', null, 'Role'), React.createElement('th', null, 'Status'),
          React.createElement('th', null, 'Last login'), React.createElement('th', { style: { width: 40 } }))),
        React.createElement('tbody', null, team.map(u =>
          React.createElement('tr', { key: u.id },
            React.createElement('td', null, React.createElement('div', { className: 'row gap10' }, React.createElement(Avatar, { name: u.name, size: 32 }),
              React.createElement('div', null, React.createElement('div', { style: { fontWeight: 600 } }, u.name), React.createElement('div', { className: 'tiny muted' }, u.email)))),
            React.createElement('td', null, React.createElement('span', { className: 'role-badge', style: { background: ROLES[u.role].color + '22', color: ROLES[u.role].color } }, ROLES[u.role].name)),
            React.createElement('td', null, React.createElement(StatusBadge, { status: u.status })),
            React.createElement('td', { className: 'tiny muted' }, u.lastLogin),
            React.createElement('td', null, React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.moreH }) },
              React.createElement(window.MenuItem, { icon: Icon.edit, onClick: () => setEditUser(u) }, 'Edit role'),
              u.status === 'active' ? React.createElement(window.MenuItem, { icon: Icon.ban, danger: true, onClick: () => { setTeam(t => t.map(x => x.id === u.id ? { ...x, status: 'deactivated' } : x)); toast({ title: 'Deactivated', msg: u.name, kind: 'info' }); } }, 'Deactivate')
                : React.createElement(window.MenuItem, { icon: Icon.checkCircle, onClick: () => { setTeam(t => t.map(x => x.id === u.id ? { ...x, status: 'active' } : x)); toast({ title: 'Reactivated', msg: u.name }); } }, 'Reactivate'))))))))),

      /* audit panel */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Team activity'), React.createElement('span', { className: 'badge badge-slate', style: { marginLeft: 'auto' } }, 'Audit log')),
        React.createElement('div', { style: { padding: '4px 0' } }, DB.AUDIT.map((a, i) =>
          React.createElement('div', { key: a.id, style: { padding: '10px 16px', borderBottom: i < DB.AUDIT.length-1 ? '1px solid var(--border-soft)' : 'none' } },
            React.createElement('div', { className: 'row gap8' }, React.createElement(Avatar, { name: a.actor, size: 20 }),
              React.createElement('span', { style: { fontSize: 12.5, fontWeight: 600 } }, a.actor.split(' ')[0]),
              React.createElement('span', { className: 'tiny muted', style: { marginLeft: 'auto', whiteSpace: 'nowrap' } }, a.time)),
            React.createElement('div', { className: 'tiny muted', style: { marginTop: 4, paddingLeft: 28 } }, a.action + ' · ', React.createElement('span', { style: { color: 'var(--text-2)' } }, a.target)))))) ),

    invite && React.createElement(InviteModal, { onClose: () => setInvite(false), onInvite: (u) => { setTeam(t => [...t, { ...u, id: 'u' + Date.now(), status: 'invited', lastLogin: '—', joined: '2026-06-08' }]); toast({ title: 'Invite sent', msg: u.email }); setInvite(false); } }),
    editUser && React.createElement(EditRoleModal, { user: editUser, onClose: () => setEditUser(null), onSave: (role) => { setTeam(t => t.map(x => x.id === editUser.id ? { ...x, role } : x)); toast({ title: 'Role updated', msg: editUser.name + ' → ' + ROLES[role].name }); setEditUser(null); } }));
}

function RolePicker({ value, onChange }) {
  const { ROLES } = window.RBAC;
  return React.createElement('div', { className: 'fc gap8' }, Object.values(ROLES).map(r =>
    React.createElement('button', { key: r.key, onClick: () => onChange(r.key), className: 'row gap10', style: { padding: '11px 13px', borderRadius: 10, border: '1.5px solid ' + (value === r.key ? 'var(--accent)' : 'var(--border)'), background: value === r.key ? 'var(--accent-ghost)' : 'var(--surface-2)', textAlign: 'left' } },
      React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 } }),
      React.createElement('div', null, React.createElement('div', { style: { fontWeight: 650, fontSize: 13 } }, r.name), React.createElement('div', { className: 'tiny muted' }, r.desc)))));
}

function InviteModal({ onClose, onInvite }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('support');
  const valid = name.trim() && /^[^@]+@[^@]+\.[^@]+$/.test(email);
  return React.createElement(window.Modal, { open: true, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: 'var(--accent-ghost)', color: 'var(--accent)' } }, React.createElement(window.Icon.userPlus, { size: 19 })),
      React.createElement('div', { className: 'mh-text' }, React.createElement('h3', null, 'Invite teammate'), React.createElement('p', null, 'They’ll receive an email to join.'))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { className: 'fc gap14' },
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Full name'), React.createElement('input', { className: 'input', value: name, onChange: e => setName(e.target.value), placeholder: 'Jane Doe' })),
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Email'), React.createElement('input', { className: 'input', type: 'email', value: email, onChange: e => setEmail(e.target.value), placeholder: 'jane@schoolmate.io' })),
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Role'), React.createElement(RolePicker, { value: role, onChange: setRole })))),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', disabled: !valid, onClick: () => onInvite({ name, email, role }) }, 'Send invite')));
}

function EditRoleModal({ user, onClose, onSave }) {
  const [role, setRole] = React.useState(user.role);
  return React.createElement(window.Modal, { open: true, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement(window.Avatar, { name: user.name, size: 38 }),
      React.createElement('div', { className: 'mh-text' }, React.createElement('h3', null, 'Edit role'), React.createElement('p', null, user.name + ' · ' + user.email))),
    React.createElement('div', { className: 'modal-body' }, React.createElement(RolePicker, { value: role, onChange: setRole })),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', disabled: role === user.role, onClick: () => onSave(role) }, 'Save role')));
}

/* ---------------- SETTINGS ---------------- */
function SettingsScreen() {
  const { Icon } = window;
  const toast = window.useToast();
  const [tab, setTab] = React.useState('branding');
  const tabs = [
    { key: 'branding', label: 'Branding', icon: Icon.paint },
    { key: 'announcement', label: 'Announcement', icon: Icon.megaphone },
    { key: 'flags', label: 'Feature flags', icon: Icon.toggle },
    { key: 'audit', label: 'Audit log', icon: Icon.shield },
  ];
  return React.createElement('div', { className: 'page' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Settings'),
        React.createElement('p', { className: 'page-desc' }, 'Platform configuration · Owner only'))),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' } },
      React.createElement('div', { className: 'fc gap2' }, tabs.map(t =>
        React.createElement('button', { key: t.key, className: 'nav-item' + (tab === t.key ? ' active' : ''), style: { position: 'static' }, onClick: () => setTab(t.key) },
          React.createElement(t.icon, { size: 16 }), React.createElement('span', null, t.label)))),
      React.createElement('div', null,
        tab === 'branding' && React.createElement(BrandingSettings, { toast }),
        tab === 'announcement' && React.createElement(AnnouncementSettings, { toast }),
        tab === 'flags' && React.createElement(FlagsSettings, { toast }),
        tab === 'audit' && React.createElement(AuditSettings, null))));
}

function SettingCard({ title, desc, children }) {
  return React.createElement('div', { className: 'card', style: { marginBottom: 16 } },
    React.createElement('div', { className: 'card-head' }, React.createElement('div', null, React.createElement('h3', null, title), desc && React.createElement('div', { className: 'sub' }, desc))),
    React.createElement('div', { className: 'card-pad' }, children));
}

function BrandingSettings({ toast }) {
  const [name, setName] = React.useState('Catre Technology');
  const colors = ['#7c74ff', '#3ecf8e', '#4ca6ff', '#f0b429', '#b07cff'];
  const [accent, setAccent] = React.useState(colors[0]);
  return React.createElement('div', null,
    React.createElement(SettingCard, { title: 'Platform identity', desc: 'Shown across the operator console.' },
      React.createElement('div', { className: 'fc gap16', style: { maxWidth: 420 } },
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Product name'), React.createElement('input', { className: 'input', value: name, onChange: e => setName(e.target.value) })),
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Accent color'),
          React.createElement('div', { className: 'row gap8' }, colors.map(c => React.createElement('button', { key: c, onClick: () => setAccent(c), style: { width: 32, height: 32, borderRadius: 9, background: c, border: accent === c ? '2px solid var(--text)' : '2px solid transparent', outline: accent===c?'none':'1px solid var(--border)' } })))),
        React.createElement(Btn, { variant: 'primary', style: { alignSelf: 'flex-start' }, onClick: () => toast({ title: 'Branding saved' }) }, 'Save changes'))));
}

function AnnouncementSettings({ toast }) {
  const [on, setOn] = React.useState(false);
  const [msg, setMsg] = React.useState('Scheduled maintenance this Sunday 02:00–04:00 UTC.');
  return React.createElement(SettingCard, { title: 'Announcement banner', desc: 'Broadcast a message to all tenant schools.' },
    React.createElement('div', { className: 'row jb', style: { marginBottom: 16 } },
      React.createElement('div', null, React.createElement('div', { style: { fontWeight: 600, fontSize: 13.5 } }, 'Show banner to all tenants'),
        React.createElement('div', { className: 'tiny muted' }, on ? 'Currently visible to every school.' : 'Hidden.')),
      React.createElement('button', { className: 'switch' + (on ? ' on' : ''), onClick: () => setOn(o => !o) })),
    React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Message'), React.createElement('textarea', { className: 'textarea', value: msg, onChange: e => setMsg(e.target.value) })),
    on && React.createElement('div', { className: 'banner banner-pastdue', style: { borderRadius: 9, marginTop: 14, background: 'var(--accent-ghost)', color: 'var(--accent-text)', border: '1px solid var(--accent-line)' } }, React.createElement(window.Icon.megaphone, {}), msg),
    React.createElement(Btn, { variant: 'primary', style: { marginTop: 16 }, onClick: () => toast({ title: 'Announcement saved' }) }, 'Save'));
}

function FlagsSettings({ toast }) {
  const [flags, setFlags] = React.useState([
    { key: 'new_gradebook', label: 'New gradebook UI', desc: 'Rolled out to 40% of tenants.', on: true },
    { key: 'ai_insights', label: 'AI attendance insights', desc: 'Beta — internal testing only.', on: false },
    { key: 'parent_app_v2', label: 'Parent app v2', desc: 'Available on Platinum.', on: true },
    { key: 'self_serve_billing', label: 'Self-serve billing', desc: 'Let schools manage their own plan.', on: false },
  ]);
  return React.createElement(SettingCard, { title: 'Feature flags', desc: 'Toggle platform capabilities.' },
    React.createElement('div', { className: 'fc' }, flags.map((f, i) =>
      React.createElement('div', { key: f.key, className: 'row jb', style: { padding: '13px 0', borderBottom: i < flags.length-1 ? '1px solid var(--border-soft)' : 'none' } },
        React.createElement('div', null, React.createElement('div', { className: 'row gap8' }, React.createElement('span', { style: { fontWeight: 600, fontSize: 13.5 } }, f.label), React.createElement('code', { className: 'mono tiny muted' }, f.key)),
          React.createElement('div', { className: 'tiny muted', style: { marginTop: 2 } }, f.desc)),
        React.createElement('button', { className: 'switch' + (f.on ? ' on' : ''), onClick: () => { setFlags(fs => fs.map((x, j) => j === i ? { ...x, on: !x.on } : x)); toast({ title: f.label + (f.on ? ' disabled' : ' enabled'), kind: 'info' }); } })))));
}

function AuditSettings() {
  const { DB, Avatar, RBAC } = window;
  return React.createElement(SettingCard, { title: 'Audit log', desc: 'Every mutating action across the platform.' },
    React.createElement('div', { className: 'fc' }, DB.AUDIT.concat(DB.AUDIT.map(a => ({ ...a, id: a.id + 100, time: 'last week' }))).map((a, i, arr) =>
      React.createElement('div', { key: a.id, className: 'row gap12', style: { padding: '11px 0', borderBottom: i < arr.length-1 ? '1px solid var(--border-soft)' : 'none' } },
        React.createElement(Avatar, { name: a.actor, size: 26 }),
        React.createElement('div', { className: 'f1', style: { fontSize: 13 } }, React.createElement('b', null, a.actor), React.createElement('span', { className: 'muted' }, ' ' + a.action + ' '), React.createElement('b', null, a.target)),
        React.createElement('span', { className: 'role-badge', style: { background: RBAC.ROLES[a.role].color + '22', color: RBAC.ROLES[a.role].color } }, a.role),
        React.createElement('span', { className: 'tiny muted', style: { width: 72, textAlign: 'right' } }, a.time)))));
}

window.TeamScreen = TeamScreen;
window.SettingsScreen = SettingsScreen;
