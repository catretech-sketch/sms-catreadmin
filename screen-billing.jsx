/* ============================================================
   Billing & Payments — Plans / Subscriptions / Invoices
   ============================================================ */
function BillingScreen({ tab: initialTab, plansOnly }) {
  const { useCan } = window;
  const can = useCan();
  const nav = window.useNav();
  const tabs = (plansOnly ? [
    { key: 'plans', label: 'Plans catalog', perm: 'plans.view' },
  ] : [
    { key: 'plans', label: 'Plans', perm: 'plans.view' },
    { key: 'subscriptions', label: 'Subscriptions', perm: 'billing.view' },
    { key: 'invoices', label: 'Invoices', perm: 'billing.view' },
  ]).filter(t => can(t.perm));
  const [tab, setTab] = React.useState(initialTab && tabs.find(t=>t.key===initialTab) ? initialTab : (tabs[0] && tabs[0].key));
  const pastDue = window.DB.INVOICES.filter(i => i.status === 'past_due');

  return React.createElement('div', { className: 'page page-wide' },
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'ph-text' },
        React.createElement('h1', { className: 'page-title' }, plansOnly ? 'Plans' : 'Billing & payments'),
        React.createElement('p', { className: 'page-desc' }, plansOnly ? 'Care plans — pricing, offers and publishing.' : 'Plans, subscriptions and invoices across all clients.'))),

    !plansOnly && pastDue.length > 0 && tab !== 'plans' && React.createElement('div', { className: 'banner banner-pastdue', style: { borderRadius: 10, marginBottom: 16, border: '1px solid var(--red-line)' } },
      React.createElement(window.Icon.warn, {}),
      React.createElement('span', null, React.createElement('b', null, pastDue.length + ' invoices'), ' are past due across ', new Set(pastDue.map(i=>i.clientId)).size, ' clients.'),
      React.createElement('div', { className: 'banner-act' }, React.createElement(Btn, { variant: 'danger', size: 'sm', onClick: () => setTab('invoices') }, 'Review'))),

    !plansOnly && React.createElement('div', { className: 'tabs', style: { marginBottom: 18 } }, tabs.map(t =>
      React.createElement('button', { key: t.key, className: 'tab' + (tab === t.key ? ' active' : ''), onClick: () => setTab(t.key) }, t.label))),

    tab === 'plans' && React.createElement(PlansTab, null),
    tab === 'subscriptions' && React.createElement(SubscriptionsTab, null),
    tab === 'invoices' && React.createElement(InvoicesTab, null));
}

function PlansTab() {
  const { DB, fmt, Icon, useCan, FEATURE_LABELS } = window;
  const can = useCan();
  const manage = can('plans.manage');
  const toast = window.useToast();
  const [plans, setPlans] = React.useState(DB.PLANS);
  const [editing, setEditing] = React.useState(null);
  const [filter, setFilter] = React.useState('all');

  const priceLabel = (p) => p.pricing === 'per_student'
    ? { big: fmt.money(p.perStudent), small: ' / student / mo' }
    : { big: fmt.money(p.price), small: ' / ' + p.period };
  const AUD = { all: { label: 'Public', cls: 'badge-slate' }, new: { label: 'New schools', cls: 'badge-blue' }, exclusive: { label: 'Exclusive', cls: 'badge-violet' } };

  const list = plans.filter(p => filter === 'all' ? true
    : filter === 'published' ? p.visibility === 'published'
    : filter === 'unpublished' ? p.visibility === 'draft'
    : filter === 'new' ? p.audience === 'new'
    : filter === 'existing' ? p.audience === 'all'
    : filter === 'exclusive' ? p.audience === 'exclusive' : true);
  const counts = {
    all: plans.length,
    published: plans.filter(p=>p.visibility==='published').length,
    unpublished: plans.filter(p=>p.visibility==='draft').length,
    new: plans.filter(p=>p.audience==='new').length,
    existing: plans.filter(p=>p.audience==='all').length,
    exclusive: plans.filter(p=>p.audience==='exclusive').length,
  };
  const TABS = [['all','All plans'],['published','Published'],['unpublished','Unpublished'],['new','New client'],['existing','Existing client'],['exclusive','Exclusive']];

  return React.createElement('div', null,
    React.createElement('div', { className: 'row jb fw gap12', style: { marginBottom: 18, alignItems: 'flex-end' } },
      React.createElement('div', { className: 'tabs', style: { border: 'none', flexWrap: 'wrap' } },
        TABS.map(([k,l]) => React.createElement('button', { key: k, className: 'tab' + (filter === k ? ' active' : ''), onClick: () => setFilter(k) },
          l, React.createElement('span', { className: 'tab-count' }, counts[k])))),
      React.createElement('div', { className: 'row gap8' },
        React.createElement('p', { className: 'muted tiny', style: { alignSelf: 'center' } }, manage ? 'School modules drive capabilities.' : 'Read-only — Finance/Owner edit plans.'),
        manage && React.createElement(Btn, { variant: 'primary', size: 'sm', icon: Icon.plus, onClick: () => setEditing({ name: '', pricing: 'flat', price: 0, perStudent: 10, minStudents: 100, period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 }, features: [], visibility: 'draft', audience: 'all', band: '', offer: null }) }, 'New plan'))),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 } },
      list.map(p => { const pr = priceLabel(p); return React.createElement('div', { key: p.id, className: 'card', style: { opacity: p.active ? 1 : 0.55, position: 'relative', borderColor: p.visibility === 'draft' ? 'var(--amber-line)' : undefined } },
        React.createElement('div', { className: 'card-pad' },
          React.createElement('div', { className: 'row jb gap8' },
            React.createElement('div', { className: 'row gap8', style: { minWidth: 0 } },
              React.createElement('span', { style: { width: 11, height: 11, borderRadius: 3, background: p.color, flexShrink: 0 } }),
              React.createElement('span', { style: { fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' } }, p.name)),
            p.popular && React.createElement('span', { className: 'badge badge-accent' }, 'Popular')),
          React.createElement('div', { className: 'row gap6 fw', style: { marginTop: 8 } },
            React.createElement('span', { className: 'badge ' + (p.visibility === 'published' ? 'badge-green badge-dot-green' : 'badge-amber badge-dot-amber') }, React.createElement('span', { className: 'dot' }), p.visibility === 'published' ? 'Published' : 'Draft'),
            React.createElement('span', { className: 'badge ' + AUD[p.audience].cls }, AUD[p.audience].label),
            p.pricing === 'per_student' && React.createElement('span', { className: 'badge badge-blue' }, 'Metered')),
          React.createElement('div', { style: { margin: '12px 0 6px' } },
            React.createElement('span', { className: 'mono', style: { fontSize: 26, fontWeight: 750 } }, pr.big),
            React.createElement('span', { className: 'muted tiny' }, pr.small)),
          p.offer && React.createElement('div', { className: 'row gap6', style: { padding: '6px 9px', background: 'var(--green-bg)', borderRadius: 7, color: 'var(--green)', fontSize: 11.5, fontWeight: 600, marginBottom: 8 } },
            React.createElement(Icon.zap, { size: 12 }), p.offer.label),
          React.createElement('p', { className: 'tiny muted', style: { minHeight: 30 } }, p.desc),
          React.createElement('div', { className: 'tiny muted row gap6', style: { marginTop: 4 } }, React.createElement(Icon.cap, { size: 13 }), p.band),
          React.createElement('div', { className: 'divider', style: { margin: '12px 0' } }),
          React.createElement('div', { className: 'fc gap8' },
            [['Students', p.pricing === 'per_student' ? 'min ' + fmt.num(p.minStudents) : fmt.num(p.limits.students)], ['Staff', fmt.num(p.limits.staff)], ['Storage', p.limits.storage_gb + ' GB']].map(([k, v]) =>
              React.createElement('div', { key: k, className: 'row jb tiny' }, React.createElement('span', { className: 'muted' }, k), React.createElement('span', { className: 'mono', style: { fontWeight: 600 } }, v)))),
          React.createElement('div', { className: 'divider', style: { margin: '12px 0' } }),
          React.createElement('div', { className: 'fc gap6' }, p.features.slice(0, 4).map(f =>
            React.createElement('div', { key: f, className: 'row gap6 tiny' }, React.createElement(Icon.check, { size: 13, style: { color: 'var(--green)', flexShrink: 0 } }), React.createElement('span', { className: 'muted truncate' }, FEATURE_LABELS[f] || f))),
            p.features.length > 4 && React.createElement('div', { className: 'tiny muted', style: { paddingLeft: 19 } }, '+ ' + (p.features.length - 4) + ' more')),
          manage && React.createElement('div', { className: 'row gap8 fw', style: { marginTop: 14 } },
            React.createElement(Btn, { variant: p.visibility === 'draft' ? 'primary' : 'default', size: 'sm', icon: p.visibility === 'draft' ? Icon.upload : Icon.eyeOff,
              onClick: () => { setPlans(ps => ps.map(x => x.id === p.id ? { ...x, visibility: x.visibility === 'published' ? 'draft' : 'published' } : x)); toast({ title: p.visibility === 'published' ? 'Plan unpublished' : 'Plan published', msg: p.name, kind: 'info' }); } },
              p.visibility === 'published' ? 'Unpublish' : 'Publish'),
            React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.edit, onClick: () => setEditing(p) }, 'Edit')))); })),

    editing && React.createElement(PlanEditModal, { plan: editing, onClose: () => setEditing(null), onSave: (np) => { setPlans(ps => ps.find(x=>x.id===np.id) ? ps.map(x=>x.id===np.id?np:x) : [...ps, { ...np, id: 'pl_' + Date.now(), active: true, color: 'var(--green)' }]); toast({ title: 'Plan saved', msg: np.name + (np.visibility === 'published' ? ' · published' : ' · draft') }); setEditing(null); } }));
}

function PlanEditModal({ plan, onClose, onSave }) {
  const { FEATURE_LABELS, FEATURE_TIER, FEATURE_NOTE, TIER_META, fmt, Icon } = window;
  const [p, setP] = React.useState({ ...plan, limits: { ...plan.limits }, features: [...plan.features], offer: plan.offer ? { ...plan.offer } : null, featureTiers: { ...(plan.featureTiers || {}) } });
  const toggleFeat = (f) => setP(s => ({ ...s, features: s.features.includes(f) ? s.features.filter(x => x !== f) : [...s.features, f] }));
  const set = (patch) => setP(s => ({ ...s, ...patch }));
  const getTier = (code) => (p.featureTiers && p.featureTiers[code]) || window.FEATURE_TIER_FALLBACK?.[code] || window.DB.FEATURE_TIER[code];
  const setFeatTier = (code, tier) => setP(s => {
    const inc = s.features.includes(code);
    const cur = (s.featureTiers && s.featureTiers[code]) || window.DB.FEATURE_TIER[code];
    const ft = { ...(s.featureTiers || {}) };
    if (inc && cur === tier) { delete ft[code]; return { ...s, features: s.features.filter(x => x !== code), featureTiers: ft }; }
    ft[code] = tier;
    return { ...s, features: inc ? s.features : [...s.features, code], featureTiers: ft };
  });
  const seg = (key, value, label) => React.createElement('button', { className: 'chip' + (p[key] === value ? ' active' : ''), style: { height: 34 }, onClick: () => set({ [key]: value }) }, label);
  const tierPill = (tier, extra) => React.createElement('span', { className: 'badge', style: Object.assign({ height: 18, padding: '0 7px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em', background: TIER_META[tier].color + '22', color: TIER_META[tier].color, flexShrink: 0 }, extra || {}) }, TIER_META[tier].label);
  return React.createElement(window.Modal, { open: true, onClose, size: 'lg' },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: 'var(--accent-ghost)', color: 'var(--accent)' } }, React.createElement(Icon.plans, { size: 19 })),
      React.createElement('div', { className: 'mh-text' }, React.createElement('h3', null, plan.id ? 'Edit plan' : 'New plan'), React.createElement('p', null, 'Pricing, offer, visibility & capabilities.'))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 } },
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Plan name'), React.createElement('input', { className: 'input', value: p.name, onChange: e => set({ name: e.target.value }) })),
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Size band'), React.createElement('input', { className: 'input', value: p.band, placeholder: 'e.g. Under 200', onChange: e => set({ band: e.target.value }) }))),

      React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', margin: '16px 0 8px' } }, 'Pricing model'),
      React.createElement('div', { className: 'row gap8', style: { marginBottom: 12 } }, seg('pricing', 'flat', 'Flat monthly'), seg('pricing', 'per_student', 'Per‑student')),
      p.pricing === 'flat'
        ? React.createElement('div', { className: 'field', style: { maxWidth: 220 } }, React.createElement('label', null, 'Price (₹/month)'), React.createElement('input', { className: 'input mono', type: 'number', value: p.price, onChange: e => set({ price: +e.target.value }) }))
        : React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 360 } },
            React.createElement('div', { className: 'field' }, React.createElement('label', null, '₹ / student / mo'), React.createElement('input', { className: 'input mono', type: 'number', value: p.perStudent, onChange: e => set({ perStudent: +e.target.value }) })),
            React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Min students'), React.createElement('input', { className: 'input mono', type: 'number', value: p.minStudents, onChange: e => set({ minStudents: +e.target.value }) }))),

      React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', margin: '16px 0 8px' } }, 'Promotional offer'),
      React.createElement('div', { className: 'row gap8' },
        React.createElement('button', { className: 'switch' + (p.offer ? ' on' : ''), onClick: () => set({ offer: p.offer ? null : { label: 'Launch offer', pct: 20 } }) }),
        React.createElement('span', { className: 'tiny muted' }, p.offer ? 'Offer attached' : 'No active offer')),
      p.offer && React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 10 } },
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Offer label'), React.createElement('input', { className: 'input', value: p.offer.label, onChange: e => set({ offer: { ...p.offer, label: e.target.value } }) })),
        React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Discount %'), React.createElement('input', { className: 'input mono', type: 'number', value: p.offer.pct, onChange: e => set({ offer: { ...p.offer, pct: +e.target.value } }) }))),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 16 } },
        React.createElement('div', null,
          React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 } }, 'Availability'),
          React.createElement('div', { className: 'row gap8 fw' }, seg('audience', 'all', 'Public'), seg('audience', 'new', 'New only'), seg('audience', 'exclusive', 'Exclusive'))),
        React.createElement('div', null,
          React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 } }, 'Visibility'),
          React.createElement('div', { className: 'row gap8' }, seg('visibility', 'published', 'Published'), seg('visibility', 'draft', 'Draft')))),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 16 } },
        ['students', 'staff', 'storage_gb'].map(k => React.createElement('div', { key: k, className: 'field' },
          React.createElement('label', null, k === 'storage_gb' ? 'Storage (GB)' : k[0].toUpperCase() + k.slice(1)),
          React.createElement('input', { className: 'input mono', type: 'number', value: p.limits[k], onChange: e => set({ limits: { ...p.limits, [k]: +e.target.value } }) })))),
      React.createElement('div', { className: 'row jb fw gap8', style: { margin: '18px 0 10px', alignItems: 'flex-end' } },
        React.createElement('div', null,
          React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block' } }, 'School modules'),
          React.createElement('span', { className: 'tiny muted' }, 'Add a module, then tap Silver / Gold / Platinum to set the tier it unlocks at.')),
        React.createElement('span', { className: 'badge badge-accent', style: { height: 20 } }, p.features.length + ' selected')),
      React.createElement('div', { className: 'row gap8 fw', style: { marginBottom: 6, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 9, alignItems: 'center' } },
        React.createElement('span', { className: 'tiny muted', style: { fontWeight: 600 } }, 'Add tier modules:'),
        window.DB.PLANS.filter(t => ['silver','gold','platinum'].includes(t.tier)).map(t =>
          React.createElement('button', { key: t.id, className: 'chip', style: { height: 30 },
            onClick: () => set({ features: Array.from(new Set([...p.features, ...t.features])) }) },
            React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: t.color } }), '+ ' + t.name)),
        React.createElement('button', { className: 'chip', style: { height: 30 }, onClick: () => set({ features: [] }) }, 'Clear')),
      React.createElement('div', { className: 'row gap12 fw', style: { marginBottom: 14, paddingLeft: 2 } },
        ['silver','gold','platinum'].map(t => React.createElement('span', { key: t, className: 'row gap5', style: { alignItems: 'center' } },
          React.createElement('span', { style: { width: 8, height: 8, borderRadius: 2, background: TIER_META[t].color } }),
          React.createElement('span', { className: 'tiny muted' }, 'Unlocks at ', React.createElement('b', { style: { color: 'var(--text-2)' } }, TIER_META[t].label))))),
      window.DB.FEATURE_GROUPS.map(grp => {
        const selCount = grp.codes.filter(c => p.features.includes(c)).length;
        return React.createElement('div', { key: grp.title, style: { marginBottom: 14 } },
        React.createElement('div', { className: 'row gap8', style: { margin: '4px 0 8px', alignItems: 'center' } },
          React.createElement('span', { className: 'tiny', style: { fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' } }, grp.title),
          React.createElement('span', { className: 'tiny muted' }, selCount + '/' + grp.codes.length),
          React.createElement('div', { className: 'divider f1' })),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 } },
          grp.codes.map(code => {
            const label = FEATURE_LABELS[code]; if (!label) return null;
            const on = p.features.includes(code);
            const curTier = getTier(code);
            return React.createElement('div', { key: code, className: 'row gap8', style: { padding: '9px 11px', borderRadius: 9, border: '1px solid ' + (on ? 'var(--accent-line)' : 'var(--border)'), background: on ? 'var(--accent-ghost)' : 'var(--surface-2)', alignItems: 'flex-start' } },
              React.createElement('button', { onClick: () => toggleFeat(code), title: on ? 'Remove module' : 'Add module', style: { width: 16, height: 16, borderRadius: 5, flexShrink: 0, marginTop: 1, display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--surface-3)', color: '#fff' } }, on && React.createElement(Icon.check, { size: 10 })),
              React.createElement('div', { style: { minWidth: 0, flex: 1 } },
                React.createElement('div', { style: { fontSize: 12.5, fontWeight: 600 } }, label),
                React.createElement('div', { className: 'tiny muted truncate', style: { marginTop: 1, marginBottom: 6 } }, FEATURE_NOTE[code]),
                React.createElement('div', { className: 'row', style: { gap: 3, border: '1px solid var(--border)', borderRadius: 7, padding: 2, width: 'fit-content', background: 'var(--surface)' } },
                  ['silver','gold','platinum'].map(t => {
                    const active = on && curTier === t;
                    return React.createElement('button', { key: t, title: 'Include in ' + TIER_META[t].label, onClick: () => setFeatTier(code, t),
                      style: { fontSize: 10, fontWeight: 700, letterSpacing: '.02em', padding: '3px 9px', borderRadius: 5, border: 'none', cursor: 'pointer', transition: 'all .12s',
                        background: active ? TIER_META[t].color : 'transparent', color: active ? '#fff' : 'var(--text-3)' } }, TIER_META[t].label); })))); }))); })),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', disabled: !p.name, onClick: () => onSave(p) }, 'Save plan')));
}

function SubscriptionsTab() {
  const { DB, fmt, Icon, Avatar, useCan } = window;
  const nav = window.useNav();
  const subs = DB.CLIENTS.filter(c => c.status === 'active' || c.status === 'trial' || c.status === 'suspended');
  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, 'Client'), React.createElement('th', null, 'Plan'), React.createElement('th', null, 'Status'),
        React.createElement('th', null, 'Current period'), React.createElement('th', { style: { textAlign: 'right' } }, 'Next charge'), React.createElement('th', null))),
      React.createElement('tbody', null, subs.map(c => {
        const plan = DB.PLANS.find(p => p.id === c.plan);
        return React.createElement('tr', { key: c.id, className: 'clickable', onClick: () => nav.go('client', { id: c.id }) },
          React.createElement('td', null, React.createElement('div', { className: 'row gap10' }, React.createElement(Avatar, { name: c.name, size: 28, square: true }), React.createElement('span', { style: { fontWeight: 600 } }, c.name))),
          React.createElement('td', null, React.createElement('span', { className: 'badge badge-' + (c.tier==='gold'?'amber':c.tier==='platinum'?'violet':'slate') }, c.planName)),
          React.createElement('td', null, React.createElement(window.StatusBadge, { status: c.status })),
          React.createElement('td', { className: 'tiny muted mono' }, 'Jun 1 – Jun 30'),
          React.createElement('td', { className: 'num' }, c.status === 'active' ? fmt.money(plan.price) : React.createElement('span', { className: 'muted' }, '—')),
          React.createElement('td', { style: { textAlign: 'right' } }, React.createElement(Icon.chevRight, { size: 15, style: { color: 'var(--text-faint)' } }))); })))));
}

function InvoicesTab() {
  const { DB, fmt, Icon, useCan } = window;
  const can = useCan();
  const toast = window.useToast();
  const nav = window.useNav();
  const [filter, setFilter] = React.useState('all');
  const [invoices, setInvoices] = React.useState(DB.INVOICES);
  const [refundTarget, setRefundTarget] = React.useState(null);
  const list = invoices.filter(i => filter === 'all' || i.status === filter);
  const counts = { all: invoices.length, paid: invoices.filter(i=>i.status==='paid').length, open: invoices.filter(i=>i.status==='open').length, past_due: invoices.filter(i=>i.status==='past_due').length };

  return React.createElement('div', null,
    React.createElement('div', { className: 'row gap8', style: { marginBottom: 14 } },
      [['all','All'],['paid','Paid'],['open','Open'],['past_due','Past due']].map(([k, l]) =>
        React.createElement('button', { key: k, className: 'chip' + (filter === k ? ' active' : ''), onClick: () => setFilter(k) }, l, React.createElement('span', { className: 'tiny', style: { opacity: 0.6 } }, counts[k])))),
    React.createElement('div', { className: 'card' }, React.createElement('div', { className: 'tbl-wrap' }, React.createElement('table', { className: 'tbl' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, 'Invoice'), React.createElement('th', null, 'Client'), React.createElement('th', null, 'Plan'),
        React.createElement('th', { style: { textAlign: 'right' } }, 'Amount'), React.createElement('th', null, 'Status'),
        React.createElement('th', null, 'Issued'), React.createElement('th', null, 'Due'), React.createElement('th', { style: { width: 40 } }))),
      React.createElement('tbody', null, list.map(inv =>
        React.createElement('tr', { key: inv.id },
          React.createElement('td', null, React.createElement('span', { className: 'mono', style: { fontWeight: 600 } }, inv.id)),
          React.createElement('td', null, inv.client),
          React.createElement('td', { className: 'muted' }, inv.plan),
          React.createElement('td', { className: 'num', style: { fontWeight: 600 } }, fmt.money(inv.amount)),
          React.createElement('td', null, React.createElement(window.StatusBadge, { status: inv.status })),
          React.createElement('td', { className: 'tiny muted mono' }, inv.issued),
          React.createElement('td', { className: 'tiny muted mono', style: { color: inv.status === 'past_due' ? 'var(--red)' : undefined } }, inv.due),
          React.createElement('td', { onClick: e => e.stopPropagation() }, React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.moreH }) },
            React.createElement(window.MenuItem, { icon: Icon.eye }, 'View invoice'),
            can('billing.manage_invoice') && inv.status !== 'paid' && React.createElement(window.MenuItem, { icon: Icon.check, onClick: () => { setInvoices(iv => iv.map(x => x.id === inv.id ? { ...x, status: 'paid', paidOn: '2026-06-08' } : x)); toast({ title: 'Invoice marked paid', msg: inv.id }); } }, 'Mark as paid'),
            can('billing.refund') && inv.status === 'paid' && React.createElement(window.MenuItem, { icon: Icon.refund, danger: true, onClick: () => setRefundTarget(inv) }, 'Refund'),
            React.createElement(window.MenuItem, { icon: Icon.download }, 'Download PDF'))))))))),
    refundTarget && React.createElement(window.ConfirmDialog, { open: true, onClose: () => setRefundTarget(null),
      onConfirm: () => { setInvoices(iv => iv.map(x => x.id === refundTarget.id ? { ...x, status: 'open' } : x)); toast({ title: 'Refund issued', msg: fmt.money(refundTarget.amount) + ' to ' + refundTarget.client, kind: 'info' }); },
      title: 'Refund this invoice?', message: 'A full refund of ' + fmt.money(refundTarget.amount) + ' will be issued to ' + refundTarget.client + '. This is logged.', confirmLabel: 'Issue refund', danger: true, icon: Icon.refund }));
}
window.BillingScreen = BillingScreen;
