/* ============================================================
   Support — tickets, ticket detail, system health
   ============================================================ */
function SupportScreen() {
  const { DB, Icon, Avatar, useCan, StatusBadge, PRIORITY_MAP } = window;
  const nav = window.useNav();
  const can = useCan();
  const toast = window.useToast();
  const [tickets, setTickets] = React.useState(DB.TICKETS);
  const [sel, setSel] = React.useState(null);
  const [filter, setFilter] = React.useState('open');
  const [q, setQ] = React.useState('');

  const list = tickets.filter(t =>
    (filter === 'all' || (filter === 'open' ? (t.status === 'open' || t.status === 'pending') : t.status === filter)) &&
    (!q || t.subject.toLowerCase().includes(q.toLowerCase()) || t.client.toLowerCase().includes(q.toLowerCase())));
  const counts = { all: tickets.length, open: tickets.filter(t=>t.status==='open'||t.status==='pending').length, resolved: tickets.filter(t=>t.status==='resolved').length, closed: tickets.filter(t=>t.status==='closed').length };

  if (sel) return React.createElement(TicketDetail, { ticket: tickets.find(t => t.id === sel.id), onBack: () => setSel(null),
    onUpdate: (patch) => { setTickets(ts => ts.map(t => t.id === sel.id ? { ...t, ...patch } : t)); } });

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Support'),
        React.createElement('p', { className: 'page-desc' }, counts.open + ' open tickets across all clients')),
      React.createElement('div', { className: 'page-actions' },
        React.createElement(Btn, { variant: 'default', icon: Icon.server, onClick: () => nav.go('health') }, 'System health'))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' } },
      React.createElement('div', null,
        React.createElement('div', { className: 'row jb gap12', style: { marginBottom: 14 } },
          React.createElement('div', { className: 'row gap8' },
            [['open','Open'],['all','All'],['resolved','Resolved'],['closed','Closed']].map(([k, l]) =>
              React.createElement('button', { key: k, className: 'chip' + (filter === k ? ' active' : ''), onClick: () => setFilter(k) }, l, React.createElement('span', { className: 'tiny', style: { opacity: 0.6 } }, counts[k])))),
          React.createElement('div', { className: 'input-group', style: { width: 200 } }, React.createElement(Icon.search, {}), React.createElement('input', { placeholder: 'Search…', value: q, onChange: e => setQ(e.target.value) }))),
        React.createElement('div', { className: 'card' },
          list.length === 0 ? React.createElement(window.Empty, { title: 'No tickets', icon: Icon.support }, 'Nothing matches this filter.')
          : list.map((t, i) => React.createElement('div', { key: t.id, className: 'row gap12 clickable', style: { padding: '13px 16px', borderBottom: i < list.length-1 ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }, onClick: () => setSel(t) },
            React.createElement('span', { className: 'badge ' + PRIORITY_MAP[t.priority].cls, style: { flexShrink: 0 } }, PRIORITY_MAP[t.priority].label),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { className: 'truncate', style: { fontWeight: 600, fontSize: 13.5 } }, t.subject),
              React.createElement('div', { className: 'row gap8 tiny muted', style: { marginTop: 3 } },
                React.createElement('span', { className: 'mono' }, t.id), React.createElement('span', null, '·'), React.createElement('span', null, t.client),
                React.createElement('span', null, '·'), React.createElement('span', { className: 'row gap4' }, React.createElement(Icon.message, { size: 11 }), t.messages))),
            React.createElement('div', { className: 'fc', style: { alignItems: 'flex-end', gap: 6 } },
              React.createElement(StatusBadge, { status: t.status }),
              t.assignee ? React.createElement('span', { className: 'row gap4 tiny muted' }, React.createElement(Avatar, { name: t.assignee, size: 16 }), t.assignee.split(' ')[0]) : React.createElement('span', { className: 'tiny', style: { color: 'var(--text-faint)' } }, 'Unassigned')),
            React.createElement('span', { className: 'tiny muted', style: { width: 56, textAlign: 'right' } }, t.updated))))),

      /* sidebar: quick health */
      React.createElement(HealthPanel, { compact: true, onExpand: () => nav.go('health') })));
}

function TicketDetail({ ticket, onBack, onUpdate }) {
  const { Icon, Avatar, useCan, StatusBadge, PRIORITY_MAP, DB } = window;
  const nav = window.useNav();
  const can = useCan();
  const manage = can('support.manage');
  const toast = window.useToast();
  const client = DB.CLIENTS.find(c => c.id === ticket.clientId);
  const [reply, setReply] = React.useState('');
  const [thread, setThread] = React.useState([
    { who: ticket.contactName || (client ? client.contact.name : 'School admin'), role: 'client', text: ticket.subject + '. This started happening after the last update and is blocking our team.', when: '2d ago' },
    { who: ticket.assignee || 'Priya Sharma', role: 'agent', text: 'Thanks for flagging — I can reproduce it. Escalating to engineering and will keep you posted.', when: '1d ago' },
    { who: client ? client.contact.name : 'School admin', role: 'client', text: 'Appreciated. Let us know if you need admin access to test.', when: '6h ago' },
  ]);

  const send = () => { if (!reply.trim()) return; setThread(t => [...t, { who: 'You', role: 'agent', text: reply, when: 'just now' }]); setReply(''); toast({ title: 'Reply sent' }); };

  return React.createElement('div', { className: 'page' },
    React.createElement('button', { className: 'row gap6 muted tiny', style: { marginBottom: 14, fontWeight: 600 }, onClick: onBack }, React.createElement(Icon.chevLeft, { size: 14 }), 'All tickets'),
    React.createElement('div', { className: 'row jb fw gap16', style: { marginBottom: 18 } },
      React.createElement('div', null,
        React.createElement('div', { className: 'row gap10' },
          React.createElement('span', { className: 'badge ' + PRIORITY_MAP[ticket.priority].cls }, PRIORITY_MAP[ticket.priority].label),
          React.createElement('span', { className: 'mono muted tiny' }, ticket.id)),
        React.createElement('h1', { style: { fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 } }, ticket.subject)),
      React.createElement('div', { className: 'row gap8' },
        React.createElement(Btn, { variant: 'default', icon: Icon.external, onClick: () => nav.go('client', { id: ticket.clientId }) }, 'Open client'),
        can('clients.impersonate') && React.createElement(Btn, { variant: 'default', icon: Icon.eye, onClick: () => client && nav.impersonate(client) }, 'Impersonate'))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' } },
      /* thread */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { style: { padding: '6px 0' } }, thread.map((m, i) =>
          React.createElement('div', { key: i, className: 'row gap12', style: { padding: '14px 18px', borderBottom: '1px solid var(--border-soft)', alignItems: 'flex-start' } },
            React.createElement(Avatar, { name: m.who, size: 32 }),
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', { className: 'row gap8' }, React.createElement('b', { style: { fontSize: 13 } }, m.who),
                React.createElement('span', { className: 'badge ' + (m.role === 'agent' ? 'badge-accent' : 'badge-slate'), style: { height: 18 } }, m.role === 'agent' ? 'Agent' : 'Client'),
                React.createElement('span', { className: 'tiny muted', style: { marginLeft: 'auto' } }, m.when)),
              React.createElement('p', { style: { fontSize: 13, marginTop: 6, color: 'var(--text-2)', lineHeight: 1.55 } }, m.text)))),
          manage ? React.createElement('div', { style: { padding: 14 } },
            React.createElement('textarea', { className: 'textarea', placeholder: 'Write a reply…', value: reply, onChange: e => setReply(e.target.value), style: { minHeight: 70 } }),
            React.createElement('div', { className: 'row jb', style: { marginTop: 10 } },
              React.createElement('span', { className: 'tiny muted' }, 'Replies are visible to the school admin.'),
              React.createElement(Btn, { variant: 'primary', size: 'sm', icon: Icon.send, disabled: !reply.trim(), onClick: send }, 'Send reply')))
          : React.createElement('div', { style: { padding: 14, textAlign: 'center' } }, React.createElement('span', { className: 'forbidden-note' }, React.createElement(Icon.lock, {}), 'Your role can view but not reply.')))),

      /* meta */
      React.createElement('div', { className: 'card card-pad' },
        React.createElement('div', { className: 'tiny muted', style: { fontWeight: 600, marginBottom: 12 } }, 'DETAILS'),
        React.createElement('dl', { className: 'dl', style: { gridTemplateColumns: '90px 1fr' } },
          React.createElement('dt', null, 'Status'), React.createElement('dd', null, React.createElement(StatusBadge, { status: ticket.status })),
          React.createElement('dt', null, 'Client'), React.createElement('dd', null, ticket.client),
          React.createElement('dt', null, 'Created'), React.createElement('dd', { className: 'mono tiny' }, ticket.created),
          React.createElement('dt', null, 'Assignee'), React.createElement('dd', null, ticket.assignee || '—')),
        manage && React.createElement('div', { style: { marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' } },
          React.createElement('label', { className: 'tiny muted', style: { fontWeight: 600, display: 'block', marginBottom: 8 } }, 'Change status'),
          React.createElement('div', { className: 'row gap6 fw', style: { marginBottom: 14 } },
            ['open', 'pending', 'resolved', 'closed'].map(s => React.createElement('button', { key: s, className: 'chip' + (ticket.status === s ? ' active' : ''), style: { textTransform: 'capitalize' }, onClick: () => { onUpdate({ status: s }); toast({ title: 'Status → ' + s, kind: 'info' }); } }, s))),
          React.createElement('label', { className: 'tiny muted', style: { fontWeight: 600, display: 'block', marginBottom: 8 } }, 'Assign to'),
          React.createElement('select', { className: 'select', value: ticket.assignee || '', onChange: e => { onUpdate({ assignee: e.target.value || null }); toast({ title: 'Assigned', msg: e.target.value || 'Unassigned' }); } },
            React.createElement('option', { value: '' }, 'Unassigned'),
            DB.TEAM.filter(u => ['support','admin','owner'].includes(u.role) && u.status === 'active').map(u => React.createElement('option', { key: u.id, value: u.name }, u.name)))))));
}

function HealthPanel({ compact, onExpand }) {
  const { DB, Icon, StatusBadge } = window;
  const allOk = DB.SYSTEM_HEALTH.every(s => s.status === 'operational');
  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-head' },
      React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'System health'),
        React.createElement('div', { className: 'sub' }, allOk ? 'All systems operational' : 'Some degradation')),
      React.createElement('span', { style: { width: 9, height: 9, borderRadius: '50%', background: allOk ? 'var(--green)' : 'var(--amber)', boxShadow: '0 0 0 4px ' + (allOk ? 'var(--green-bg)' : 'var(--amber-bg)') } })),
    React.createElement('div', { style: { padding: '4px 0' } }, DB.SYSTEM_HEALTH.map((s, i) =>
      React.createElement('div', { key: i, className: 'row jb gap10', style: { padding: '10px 16px', borderBottom: i < DB.SYSTEM_HEALTH.length-1 ? '1px solid var(--border-soft)' : 'none' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600 } }, s.name),
          React.createElement('div', { className: 'tiny muted mono' }, s.latency + ' · ' + s.uptime)),
        React.createElement('span', { className: 'badge ' + window.STATUS_MAP[s.status].cls + ' badge-dot-' + window.STATUS_MAP[s.status].cls.split('-')[1] }, React.createElement('span', { className: 'dot' }), window.STATUS_MAP[s.status].label)))));
}

function HealthScreen() {
  const nav = window.useNav();
  return React.createElement('div', { className: 'page', style: { maxWidth: 760 } },
    React.createElement('button', { className: 'row gap6 muted tiny', style: { marginBottom: 14, fontWeight: 600 }, onClick: () => nav.go('support') }, React.createElement(window.Icon.chevLeft, { size: 14 }), 'Support'),
    React.createElement('h1', { className: 'page-title', style: { marginBottom: 6 } }, 'System health'),
    React.createElement('p', { className: 'page-desc', style: { marginBottom: 20 } }, 'Live status of platform services (mock).'),
    React.createElement(HealthPanel, null));
}

window.SupportScreen = SupportScreen;
window.HealthScreen = HealthScreen;
