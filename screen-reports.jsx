/* ============================================================
   Reports — read-only analytics + CSV export
   ============================================================ */
function ReportsScreen() {
  const { DB, fmt, Icon, Charts } = window;
  const toast = window.useToast();
  const [range, setRange] = React.useState('12m');

  const exportCSV = () => {
    const rows = [['Client', 'Status', 'Plan', 'MRR', 'Students', 'Staff', 'Country', 'Created']];
    DB.CLIENTS.forEach(c => rows.push([c.name, c.status, c.planName, c.mrr, c.students, c.staff, c.country, c.created]));
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'catre-clients.csv'; a.click();
    toast({ title: 'Export ready', msg: 'catre-clients.csv downloaded.' });
  };

  const revenueByPlan = DB.PLANS.filter(p => p.active).map(p => ({
    plan: p, mrr: DB.CLIENTS.filter(c => c.plan === p.id && c.status === 'active').reduce((s, c) => s + c.mrr, 0),
    clients: DB.CLIENTS.filter(c => c.plan === p.id).length,
  }));
  const totalMRR = DB.dash.mrr;

  const reports = [
    { title: 'Revenue', val: fmt.money(totalMRR * 12), sub: 'ARR · annualized', delta: '+18%', up: true, icon: Icon.dollar },
    { title: 'Net growth', val: '+12', sub: 'clients this quarter', delta: '+4 vs Q1', up: true, icon: Icon.trendUp },
    { title: 'Gross churn', val: '1.8%', sub: 'monthly logo churn', delta: '-0.4pt', up: true, icon: Icon.trendDown },
    { title: 'Avg. revenue / client', val: fmt.money(totalMRR / DB.dash.counts.active), sub: 'per active client', delta: '+$22', up: true, icon: Icon.activity },
  ];

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Reports'),
        React.createElement('p', { className: 'page-desc' }, 'Revenue, growth, churn and usage analytics.')),
      React.createElement('div', { className: 'page-actions' },
        React.createElement(window.Segmented, { value: range, onChange: setRange, options: [{ value: '90d', label: '90d' }, { value: '12m', label: '12m' }, { value: 'ytd', label: 'YTD' }] }),
        React.createElement(Btn, { variant: 'primary', icon: Icon.download, onClick: exportCSV }, 'Export CSV'))),

    React.createElement('div', { className: 'kpi-grid', style: { marginBottom: 16 } }, reports.map((r, i) =>
      React.createElement('div', { className: 'kpi', key: i },
        React.createElement('div', { className: 'kpi-top' }, React.createElement('span', null, r.title),
          React.createElement('span', { className: 'kpi-ic' }, React.createElement(r.icon, { size: 14 }))),
        React.createElement('div', { className: 'kpi-val' }, r.val),
        React.createElement('div', { className: 'tiny muted', style: { marginTop: 2 } }, r.sub),
        React.createElement('div', { className: 'kpi-delta ' + (r.up ? 'up' : 'down'), style: { marginTop: 6 } }, React.createElement(Icon.arrowUp, { size: 13 }), r.delta)))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 } },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Revenue trend'), React.createElement('div', { className: 'sub' }, 'MRR, last 12 months')),
        React.createElement('div', { className: 'card-pad' }, React.createElement(Charts.Line, { data: DB.dash.MRR_SERIES, labels: DB.dash.MONTHS, height: 230, format: v => '₹' + (v/1000).toFixed(0) + 'k' }))),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Revenue by plan')),
        React.createElement('div', { className: 'card-pad', style: { display: 'grid', placeItems: 'center', minHeight: 230 } },
          React.createElement(Charts.Donut, { data: revenueByPlan.map(r => ({ label: r.plan.name, value: r.mrr, color: r.plan.color })) })))),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Plan performance')),
      React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', null, 'Plan'), React.createElement('th', { style: { textAlign: 'right' } }, 'Clients'),
          React.createElement('th', { style: { textAlign: 'right' } }, 'MRR'), React.createElement('th', { style: { textAlign: 'right' } }, 'Share'), React.createElement('th', null, ''))),
        React.createElement('tbody', null, revenueByPlan.map(r => {
          const share = Math.round(r.mrr / totalMRR * 100) || 0;
          return React.createElement('tr', { key: r.plan.id },
            React.createElement('td', null, React.createElement('div', { className: 'row gap8' }, React.createElement('span', { style: { width: 9, height: 9, borderRadius: 3, background: r.plan.color } }), React.createElement('b', null, r.plan.name))),
            React.createElement('td', { className: 'num' }, r.clients),
            React.createElement('td', { className: 'num', style: { fontWeight: 600 } }, fmt.money(r.mrr)),
            React.createElement('td', { className: 'num' }, share + '%'),
            React.createElement('td', { style: { width: 180 } }, React.createElement('div', { className: 'bar' }, React.createElement('span', { style: { width: share + '%', background: r.plan.color } }))));
        }))))));
}
window.ReportsScreen = ReportsScreen;
