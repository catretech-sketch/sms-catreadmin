/* ============================================================
   Dashboard — KPIs, charts, usage alerts, activity
   ============================================================ */
function Dashboard() {
  const { DB, Charts, Icon, fmt, StatusBadge, Avatar } = window;
  const nav = window.useNav();
  const { dash, usageAlerts, AUDIT } = DB;
  const { counts } = dash;
  const [range, setRange] = React.useState('12m');
  const loaded = window.useMock(() => true, [], 360);

  const kpis = [
    { label: 'Total clients', val: fmt.num(counts.total), icon: Icon.building, delta: '+3', dir: 'up', since: 'this month' },
    { label: 'Active', val: fmt.num(counts.active), icon: Icon.checkCircle, delta: '+2', dir: 'up', since: 'this month', tint: 'var(--green)' },
    { label: 'Trials', val: fmt.num(counts.trial), icon: Icon.zap, delta: '+1', dir: 'up', since: 'this week', tint: 'var(--amber)' },
    { label: 'Suspended', val: fmt.num(counts.suspended), icon: Icon.pause, delta: '0', dir: 'flat', since: '', tint: 'var(--red)' },
    { label: 'MRR', val: fmt.money(dash.mrr), icon: Icon.dollar, delta: '+6.2%', dir: 'up', since: 'vs last mo', tint: 'var(--accent)' },
    { label: 'Churn', val: '1.8%', icon: Icon.trendDown, delta: '-0.4pt', dir: 'up', since: 'improving', tint: 'var(--green)' },
    { label: 'Trials ending', val: fmt.num(dash.trialsEnding), icon: Icon.clock, delta: 'this week', dir: 'flat', since: '', tint: 'var(--amber)' },
  ];

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, 'Dashboard'),
        React.createElement('p', { className: 'page-desc' }, 'Tuesday, June 8 · Here’s how the platform is doing.')),
      React.createElement('div', { className: 'page-actions' },
        React.createElement(window.Segmented, { value: range, onChange: setRange, options: [
          { value: '30d', label: '30d' }, { value: '90d', label: '90d' }, { value: '12m', label: '12m' }] }),
        React.createElement(window.Can, { action: 'reports.view' },
          React.createElement(Btn, { variant: 'default', icon: Icon.download, onClick: () => nav.go('reports') }, 'Reports')))),

    /* KPIs */
    React.createElement('div', { className: 'kpi-grid', style: { marginBottom: 16 } }, kpis.map((k, i) =>
      React.createElement('div', { className: 'kpi', key: i },
        React.createElement('div', { className: 'kpi-top' },
          React.createElement('span', null, k.label),
          React.createElement('span', { className: 'kpi-ic', style: { color: k.tint || 'var(--text-2)' } }, React.createElement(k.icon, { size: 14 }))),
        loaded.loading
          ? React.createElement('div', { className: 'skel', style: { height: 28, width: '60%', marginTop: 12 } })
          : React.createElement('div', { className: 'kpi-val' }, k.val),
        React.createElement('div', { className: 'kpi-delta ' + k.dir },
          k.dir === 'up' && React.createElement(Icon.arrowUp, { size: 13 }),
          k.dir === 'down' && React.createElement(Icon.arrowUp, { size: 13, style: { transform: 'rotate(180deg)' } }),
          React.createElement('span', null, k.delta),
          k.since && React.createElement('span', { className: 'since' }, k.since))))),

    /* charts row */
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 } },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'Recurring revenue'),
            React.createElement('div', { className: 'sub' }, 'MRR over the last 12 months')),
          React.createElement('div', { className: 'row gap8' },
            React.createElement('span', { className: 'mono', style: { fontSize: 17, fontWeight: 700 } }, fmt.money(dash.mrr)),
            React.createElement('span', { className: 'badge badge-green badge-dot-green' }, React.createElement('span', { className: 'dot' }), '+6.2%'))),
        React.createElement('div', { className: 'card-pad' },
          React.createElement(Charts.Line, { data: dash.MRR_SERIES, labels: dash.MONTHS, height: 224, format: (v) => '₹' + (v/1000).toFixed(0) + 'k' }))),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Clients by plan')),
        React.createElement('div', { className: 'card-pad', style: { display: 'grid', placeItems: 'center', minHeight: 224 } },
          React.createElement(Charts.Donut, { data: dash.planMix })))),

    React.createElement(SchoolsMapCard, null),

    /* second row: signups + usage alerts */
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, marginBottom: 16 } },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'New signups'),
            React.createElement('div', { className: 'sub' }, 'Per month'))),
        React.createElement('div', { className: 'card-pad' },
          React.createElement(Charts.Bars, { data: dash.SIGNUP_SERIES, labels: dash.MONTHS, height: 200, color: 'var(--blue)' }))),

      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'Usage alerts'),
            React.createElement('div', { className: 'sub' }, 'Clients near a plan limit')),
          React.createElement('span', { className: 'badge badge-amber' }, usageAlerts.length + ' flagged')),
        React.createElement('div', null, usageAlerts.slice(0, 5).map((c, i) =>
          React.createElement('div', { key: c.id, className: 'row gap12', style: { padding: '11px 18px', borderBottom: i < 4 ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' },
            onClick: () => nav.go('client', { id: c.id }) },
            React.createElement(Avatar, { name: c.name, size: 30, square: true }),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { className: 'row jb' },
                React.createElement('span', { style: { fontWeight: 600, fontSize: 13 } }, c.name),
                React.createElement('span', { className: 'mono tiny', style: { color: c.usagePct >= 95 ? 'var(--red)' : 'var(--amber)' } }, c.usagePct + '%')),
              React.createElement('div', { style: { marginTop: 5 } },
                React.createElement(window.UsageBar, { value: c.students, limit: c.limits.students, compact: true }))),
            React.createElement(window.StatusBadge, { status: c.status })))))),

    /* recent activity */
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' },
        React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'Recent activity'),
          React.createElement('div', { className: 'sub' }, 'Audit log across the team')),
        React.createElement(window.Can, { action: 'settings.view' },
          React.createElement(Btn, { variant: 'ghost', size: 'sm', onClick: () => nav.go('settings') }, 'View all'))),
      React.createElement('div', null, AUDIT.slice(0, 6).map((a, i) =>
        React.createElement('div', { key: a.id, className: 'row gap12', style: { padding: '11px 18px', borderBottom: i < 5 ? '1px solid var(--border-soft)' : 'none' } },
          React.createElement(Avatar, { name: a.actor, size: 26 }),
          React.createElement('div', { className: 'f1', style: { fontSize: 13 } },
            React.createElement('span', { style: { fontWeight: 600 } }, a.actor),
            React.createElement('span', { className: 'muted' }, ' ' + a.action + ' '),
            React.createElement('span', { style: { fontWeight: 600 } }, a.target)),
          React.createElement('span', { className: 'role-badge', style: { background: window.RBAC.ROLES[a.role].color + '22', color: window.RBAC.ROLES[a.role].color } }, a.role),
          React.createElement('span', { className: 'tiny muted', style: { width: 76, textAlign: 'right' } }, a.time))))));
}
/* ---------------- Schools-across-India map (unique city markers) ---------------- */
const CITY_COORDS = {
  'Mumbai, MH': [19.08, 72.88], 'New Delhi, DL': [28.61, 77.21], 'Bengaluru, KA': [12.97, 77.59],
  'Hyderabad, TS': [17.39, 78.49], 'Chennai, TN': [13.08, 80.27], 'Pune, MH': [18.52, 73.86],
  'Kolkata, WB': [22.57, 88.36], 'Ahmedabad, GJ': [23.03, 72.58], 'Jaipur, RJ': [26.91, 75.79],
  'Kochi, KL': [9.93, 76.27],
};
// coarse India silhouette (clockwise [lat,lng]) — decorative backdrop for the markers
const INDIA_OUTLINE = [
  [35.5, 76.0], [32.5, 75.0], [30.2, 74.2], [28.0, 70.0], [24.3, 68.4],
  [22.2, 69.2], [20.7, 72.8], [15.8, 73.6], [12.5, 74.9], [8.1, 77.5],
  [9.6, 79.3], [13.1, 80.3], [16.2, 81.3], [19.5, 85.2], [21.6, 87.0],
  [21.9, 89.0], [25.3, 89.8], [26.8, 92.5], [28.1, 95.6], [27.0, 96.0],
  [27.9, 92.0], [28.5, 88.8], [30.3, 81.0], [30.7, 79.0], [32.6, 78.7], [34.5, 78.2],
];

function SvgSchoolsMap({ cities }) {
  const nav = window.useNav();
  const W = 360, H = 430, PAD = 16;
  const minLng = 67, maxLng = 98, minLat = 6.5, maxLat = 37;
  const px = (ln) => PAD + (ln - minLng) / (maxLng - minLng) * (W - 2 * PAD);
  const py = (la) => PAD + (maxLat - la) / (maxLat - minLat) * (H - 2 * PAD);
  const outlinePath = 'M ' + INDIA_OUTLINE.map(([la, ln]) => px(ln).toFixed(1) + ' ' + py(la).toFixed(1)).join(' L ') + ' Z';
  const maxCount = Math.max.apply(null, cities.map(c => c.count).concat(1));
  return React.createElement('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', maxWidth: 380, height: 'auto' }, role: 'img', 'aria-label': 'Map of schools across India' },
    React.createElement('path', { d: outlinePath, fill: 'var(--surface-2)', stroke: 'var(--border)', strokeWidth: 1.5, strokeLinejoin: 'round' }),
    cities.map(c => {
      const r = 5 + (c.count / maxCount) * 16, x = px(c.lng), y = py(c.lat);
      return React.createElement('g', { key: c.city, style: { cursor: 'pointer' }, onClick: () => nav.go('clients') },
        React.createElement('title', null, c.city + ' · ' + c.count + ' schools (' + c.active + ' active)'),
        React.createElement('circle', { cx: x, cy: y, r: r, fill: 'var(--accent)', fillOpacity: 0.22, stroke: 'var(--accent)', strokeWidth: 1.5 }),
        React.createElement('circle', { cx: x, cy: y, r: 2.5, fill: 'var(--accent)' }),
        React.createElement('text', { x: x, y: y - r - 3, textAnchor: 'middle', style: { fontSize: 9, fontWeight: 700, fill: 'var(--text-2)' } }, c.count));
    }));
}

function SchoolsMap({ cities, onPick }) {
  const [ready, setReady] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const L = window.L;
    if (!L || !ref.current) return; // no Leaflet (offline) → SVG overlay stays
    let map;
    try {
      map = L.map(ref.current, { scrollWheelZoom: false }).setView([22, 79.5], 4);
      const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' });
      layer.on('load', () => setReady(true)); // reveal OSM only once tiles actually render
      layer.addTo(map);
      const maxCount = Math.max.apply(null, cities.map(c => c.count).concat(1));
      cities.forEach(c => {
        const m = L.circleMarker([c.lat, c.lng], { radius: 8 + (c.count / maxCount) * 18, color: '#7c74ff', weight: 2, fillColor: '#7c74ff', fillOpacity: 0.35 }).addTo(map);
        m.bindPopup('<b>' + c.city + '</b><br>' + c.count + ' schools · ' + c.active + ' active');
        m.bindTooltip(String(c.count), { permanent: true, direction: 'center', className: 'sm-map-count' });
        if (onPick) m.on('click', onPick);
      });
      const bounds = cities.length ? cities.map(c => [c.lat, c.lng]) : null;
      // Leaflet renders grey until it knows its real container size — recompute once layout settles.
      const fix = () => { if (!ref.current) return; map.invalidateSize(false); if (bounds) map.fitBounds(bounds, { padding: [30, 30] }); };
      const raf = requestAnimationFrame(() => requestAnimationFrame(fix));
      const t1 = setTimeout(fix, 150);
      const t2 = setTimeout(fix, 600);
      let ro;
      if (window.ResizeObserver) { ro = new ResizeObserver(fix); ro.observe(ref.current); }
      window.addEventListener('resize', fix);
      return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); if (ro) ro.disconnect(); window.removeEventListener('resize', fix); map.remove(); };
    } catch (e) { try { if (map) map.remove(); } catch (_) {} }
  }, []); // eslint-disable-line
  // SVG India map shows instantly and stays until live OSM tiles have loaded — so it is never blank.
  return React.createElement('div', { style: { position: 'relative', width: '100%', minHeight: 430 } },
    React.createElement('div', { ref: ref, style: { height: 430, width: '100%', borderRadius: 12, overflow: 'hidden', isolation: 'isolate', background: 'var(--surface-2)' } }),
    !ready && React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--surface)', borderRadius: 12 } },
      React.createElement(SvgSchoolsMap, { cities: cities })));
}

function SchoolsMapCard() {
  const { DB } = window;
  const nav = window.useNav();
  const byCity = {};
  DB.CLIENTS.forEach(c => { if (!CITY_COORDS[c.country]) return; const b = byCity[c.country] || (byCity[c.country] = { count: 0, active: 0 }); b.count++; if (c.status === 'active') b.active++; });
  const cities = Object.keys(byCity).map(city => ({ city, count: byCity[city].count, active: byCity[city].active, lat: CITY_COORDS[city][0], lng: CITY_COORDS[city][1] }));
  const maxCount = Math.max.apply(null, cities.map(c => c.count).concat(1));
  const ranked = cities.slice().sort((a, b) => b.count - a.count);

  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 } },
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' },
        React.createElement('div', { className: 'f1' },
          React.createElement('h3', null, 'Schools across India'),
          React.createElement('div', { className: 'sub' }, DB.CLIENTS.length + ' schools · ' + cities.length + ' cities')),
        React.createElement('span', { className: 'badge badge-slate' }, 'OpenStreetMap')),
      React.createElement('div', { className: 'card-pad', style: { padding: 12 } },
        React.createElement(SchoolsMap, { cities: cities, onPick: () => nav.go('clients') }))),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Schools by city')),
      React.createElement('div', null, ranked.map((c, i) =>
        React.createElement('div', { key: c.city, className: 'row gap12', style: { padding: '10px 16px', borderBottom: i < ranked.length - 1 ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }, onClick: () => nav.go('clients') },
          React.createElement('span', { className: 'tiny muted mono', style: { width: 16 } }, i + 1),
          React.createElement('div', { className: 'f1', style: { minWidth: 0 } },
            React.createElement('div', { className: 'row jb' },
              React.createElement('span', { style: { fontWeight: 600, fontSize: 13 } }, c.city),
              React.createElement('span', { className: 'mono tiny muted' }, c.count)),
            React.createElement('div', { style: { height: 5, borderRadius: 3, background: 'var(--surface-2)', marginTop: 5, overflow: 'hidden' } },
              React.createElement('div', { style: { width: (c.count / maxCount * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 3 } }))))))));
}

window.Dashboard = Dashboard;
