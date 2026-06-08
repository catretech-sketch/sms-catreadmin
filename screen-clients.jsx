/* ============================================================
   Clients (Tenants) — data table with search/filter/sort/paginate
   ============================================================ */
function ClientsScreen() {
  const { DB, fmt, Icon, StatusBadge, Avatar, useCan } = window;
  const nav = window.useNav();
  const can = useCan();
  const [q, setQ] = React.useState('');
  const [statusF, setStatusF] = React.useState('all');
  const [planF, setPlanF] = React.useState('all');
  const [sort, setSort] = React.useState({ key: 'mrr', dir: 'desc' });
  const [page, setPage] = React.useState(1);
  const perPage = 9;
  const loaded = window.useMock(() => true, [], 420);

  const filtered = React.useMemo(() => {
    let list = DB.CLIENTS.filter(c =>
      (statusF === 'all' || c.status === statusF) &&
      (planF === 'all' || c.tier === planF) &&
      (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.slug.includes(q.toLowerCase())));
    list = [...list].sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1);
    });
    return list;
  }, [q, statusF, planF, sort]);

  React.useEffect(() => setPage(1), [q, statusF, planF]);
  const pages = Math.ceil(filtered.length / perPage);
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key) => setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  const Th = ({ k, children, num }) => React.createElement('th', { className: 'sortable' + (num ? ' num' : ''), style: num ? { textAlign: 'right' } : null, onClick: () => toggleSort(k) },
    children, sort.key === k && React.createElement('span', { className: 'sort-ar' }, sort.dir === 'asc' ? ' ▲' : ' ▼'));

  const statusCounts = { all: DB.CLIENTS.length };
  ['active','trial','suspended','cancelled'].forEach(s => statusCounts[s] = DB.CLIENTS.filter(c=>c.status===s).length);

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Clients'),
        React.createElement('p', { className: 'page-desc' }, fmt.num(DB.CLIENTS.length) + ' client schools across all statuses')),
      React.createElement('div', { className: 'page-actions' },
        window.Can({ action: 'clients.start_trial', children:
          React.createElement(Btn, { variant: 'primary', icon: Icon.plus, onClick: () => nav.go('onboard') }, 'Onboard client') }))),

    /* filter bar */
    React.createElement('div', { className: 'row jb fw gap12', style: { marginBottom: 14 } },
      React.createElement('div', { className: 'row gap8 fw' },
        ['all','active','trial','suspended','cancelled'].map(s =>
          React.createElement('button', { key: s, className: 'chip' + (statusF === s ? ' active' : ''), onClick: () => setStatusF(s) },
            s === 'all' ? 'All' : (window.STATUS_MAP[s] ? window.STATUS_MAP[s].label : s),
            React.createElement('span', { className: 'tiny', style: { opacity: 0.6 } }, statusCounts[s])))),
      React.createElement('div', { className: 'row gap8' },
        React.createElement('div', { className: 'input-group', style: { width: 220 } },
          React.createElement(Icon.search, {}),
          React.createElement('input', { placeholder: 'Search clients…', value: q, onChange: e => setQ(e.target.value) })),
        React.createElement('select', { className: 'select', style: { width: 130, height: 36 }, value: planF, onChange: e => setPlanF(e.target.value) },
          React.createElement('option', { value: 'all' }, 'All plans'),
          DB.PLANS.filter(p=>p.active).map(p => React.createElement('option', { key: p.id, value: p.tier }, p.name))))),

    /* table */
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'tbl-wrap' },
        React.createElement('table', { className: 'tbl' },
          React.createElement('thead', null, React.createElement('tr', null,
            React.createElement(Th, { k: 'name' }, 'Client'),
            React.createElement(Th, { k: 'status' }, 'Status'),
            React.createElement(Th, { k: 'planName' }, 'Plan'),
            React.createElement(Th, { k: 'mrr', num: true }, 'MRR'),
            React.createElement('th', null, 'Usage'),
            React.createElement(Th, { k: 'createdAgo', num: true }, 'Created'),
            React.createElement(Th, { k: 'lastActiveDays' }, 'Last active'),
            React.createElement('th', { style: { width: 40 } }))),
          loaded.loading
            ? React.createElement(window.SkeletonRows, { cols: 8, rows: 8 })
            : React.createElement('tbody', null, pageItems.length === 0
              ? React.createElement('tr', null, React.createElement('td', { colSpan: 8 },
                  React.createElement(window.Empty, { title: 'No clients match', icon: Icon.building }, 'Try clearing filters or a different search.')))
              : pageItems.map(c => React.createElement('tr', { key: c.id, className: 'clickable', onClick: () => nav.go('client', { id: c.id }) },
                React.createElement('td', null, React.createElement('div', { className: 'row gap10', style: { minWidth: 180 } },
                  React.createElement(Avatar, { name: c.name, size: 30, square: true }),
                  React.createElement('div', { style: { minWidth: 0 } },
                    React.createElement('div', { className: 'truncate', style: { fontWeight: 600 } }, c.name),
                    React.createElement('div', { className: 'tiny muted mono truncate' }, c.slug)))),
                React.createElement('td', null, React.createElement(StatusBadge, { status: c.status })),
                React.createElement('td', null, React.createElement('span', { className: 'badge badge-' + (c.tier==='gold'?'amber':c.tier==='platinum'?'violet':'slate') }, c.planName)),
                React.createElement('td', { className: 'num' }, c.mrr ? fmt.money(c.mrr) : React.createElement('span', { className: 'muted' }, '—')),
                React.createElement('td', { style: { width: 150 } }, React.createElement('div', { style: { width: 130 } }, React.createElement(window.UsageBar, { value: c.students, limit: c.limits.students, label: 'Students' }))),
                React.createElement('td', { className: 'num muted tiny' }, c.created),
                React.createElement('td', { className: 'tiny' }, React.createElement('span', { style: { color: c.lastActiveDays <= 2 ? 'var(--green)' : c.lastActiveDays > 30 ? 'var(--text-faint)' : 'var(--text-2)' } }, c.lastActive)),
                React.createElement('td', { onClick: e => e.stopPropagation() },
                  React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.moreH }) },
                    React.createElement(window.MenuItem, { icon: Icon.eye, onClick: () => nav.go('client', { id: c.id }) }, 'View details'),
                    can('clients.impersonate') && React.createElement(window.MenuItem, { icon: Icon.login }, 'Impersonate'),
                    can('billing.view') && React.createElement(window.MenuItem, { icon: Icon.invoice, onClick: () => nav.go('billing', { tab: 'invoices' }) }, 'View invoices')))))))),
      React.createElement(window.Pagination, { page, pages, total: filtered.length, onPage: setPage })));
}
window.ClientsScreen = ClientsScreen;
