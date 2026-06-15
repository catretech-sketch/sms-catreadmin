/* ============================================================
   Client detail — overview / subscription / usage / activity / contacts
   ============================================================ */
function ClientDetail({ id }) {
  const { DB, fmt, Icon, StatusBadge, Avatar, useCan, Charts } = window;
  const nav = window.useNav();
  const can = useCan();
  const toast = window.useToast();
  const base = DB.CLIENTS.find(c => c.id === id) || DB.CLIENTS[0];
  const [client, setClient] = React.useState(base);
  React.useEffect(() => { setClient(DB.CLIENTS.find(c => c.id === id) || DB.CLIENTS[0]); }, [id]);
  const [tab, setTab] = React.useState('overview');
  const [dialog, setDialog] = React.useState(null); // action object
  const [planModal, setPlanModal] = React.useState(false);
  const plan = DB.PLANS.find(p => p.id === client.plan) || DB.PLANS[0];

  const runAction = (a) => {
    if (a.impersonate) { setDialog(null); nav.impersonate(client); return; }
    if (a.modal === 'change_plan' || a.id === 'change_plan') { setPlanModal(true); return; }
    // mutate local status
    const statusMap = { activate: 'active', start_trial: 'trial', suspend: 'suspended', reinstate: 'active', cancel: 'cancelled' };
    if (statusMap[a.id]) setClient(c => ({ ...c, status: statusMap[a.id], mrr: a.id === 'suspend' || a.id === 'cancel' ? c.mrr : plan.price }));
    if (a.id === 'delete') { toast(a.toast); nav.go('clients'); return; }
    toast(a.toast);
  };

  const actions = window.clientActionsFor(client.status).filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);
  const visibleActions = actions.filter(a => can(a.key));
  const barActions = visibleActions.filter(a => !a.menuOnly);
  const menuActions = visibleActions.filter(a => a.menuOnly);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'usage', label: 'Usage', perm: 'usage.view' },
    { key: 'activity', label: 'Activity' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'people', label: 'People' },
  ].filter(t => !t.perm || can(t.perm));

  const ActionBtn = (a) => React.createElement(Btn, {
    key: a.id, variant: a.variant, danger: a.danger,
    icon: a.icon, onClick: () => a.confirm ? setDialog(a) : runAction(a) }, a.label);

  return React.createElement('div', { className: 'page' },
    /* breadcrumb back */
    React.createElement('button', { className: 'row gap6 muted tiny', style: { marginBottom: 14, fontWeight: 600 }, onClick: () => nav.go('clients') },
      React.createElement(Icon.chevLeft, { size: 14 }), 'All clients'),

    /* header */
    React.createElement('div', { className: 'row jb fw gap16', style: { marginBottom: 18 } },
      React.createElement('div', { className: 'row gap14', style: { flex: '1 1 340px', minWidth: 0 } },
        React.createElement(Avatar, { name: client.name, size: 52, square: true }),
        React.createElement('div', { style: { minWidth: 0 } },
          React.createElement('div', { className: 'row gap10' },
            React.createElement('h1', { className: 'truncate', style: { fontSize: 22, fontWeight: 750, letterSpacing: '-0.02em' } }, client.name),
            React.createElement(StatusBadge, { status: client.status })),
          React.createElement('div', { className: 'row gap10 muted tiny fw', style: { marginTop: 5 } },
            React.createElement('span', { className: 'mono' }, client.slug + '.catre.app'),
            React.createElement('span', null, '·'),
            React.createElement('span', { className: 'row gap4' }, React.createElement(Icon.globe, { size: 12 }), client.country),
            React.createElement('span', null, '·'),
            React.createElement('span', null, 'CSM ' + client.csm)))),
      React.createElement('div', { className: 'row gap8 fw' },
        barActions.map(ActionBtn),
        menuActions.length > 0 && React.createElement(window.Menu, { trigger: React.createElement(Btn, { variant: 'default', icon: Icon.moreH }) },
          menuActions.map(a => React.createElement(window.MenuItem, { key: a.id, icon: a.icon, danger: a.danger, onClick: () => a.confirm ? setDialog(a) : runAction(a) }, a.label))))),

    /* quick stats strip */
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 } },
      [['MRR', client.mrr ? fmt.money(client.mrr) : '—', 'var(--accent)'],
       ['Plan', plan.name, plan.color],
       ['Students', fmt.num(client.students) + ' / ' + fmt.num(client.limits.students), 'var(--blue)'],
       ['Health', client.healthScore + '/100', client.healthScore >= 70 ? 'var(--green)' : client.healthScore >= 45 ? 'var(--amber)' : 'var(--red)']].map((s, i) =>
        React.createElement('div', { className: 'card card-pad', key: i, style: { padding: '13px 16px' } },
          React.createElement('div', { className: 'tiny muted', style: { fontWeight: 600 } }, s[0]),
          React.createElement('div', { className: 'mono', style: { fontSize: 18, fontWeight: 700, marginTop: 4, color: s[2] } }, s[1])))),

    /* tabs */
    React.createElement('div', { className: 'tabs', style: { marginBottom: 18 } }, tabs.map(t =>
      React.createElement('button', { key: t.key, className: 'tab' + (tab === t.key ? ' active' : ''), onClick: () => setTab(t.key) }, t.label))),

    tab === 'overview' && React.createElement(OverviewTab, { client, plan }),
    tab === 'subscription' && React.createElement(SubscriptionTab, { client, plan, canChange: can('clients.change_plan'), onChangePlan: () => setPlanModal(true) }),
    tab === 'usage' && React.createElement(UsageTab, { client, plan }),
    tab === 'activity' && React.createElement(ActivityTab, { client }),
    tab === 'contacts' && React.createElement(ContactsTab, { client }),
    tab === 'people' && React.createElement(PeopleTab, { client, canEdit: can('clients.manage_people') }),

    /* dialogs */
    dialog && React.createElement(window.ConfirmDialog, Object.assign({ open: true, onClose: () => setDialog(null), onConfirm: () => runAction(dialog) }, dialog.confirm, { icon: dialog.icon })),
    React.createElement(window.ChangePlanModal, { open: planModal, onClose: () => setPlanModal(false), client,
      onDone: (np) => { setClient(c => ({ ...c, plan: np.id, planName: np.name, tier: np.tier, limits: np.limits, mrr: c.status==='active'?np.price:c.mrr })); toast({ title: 'Plan changed', msg: 'Now on ' + np.name + '.' }); } }));
}

function OverviewTab({ client, plan }) {
  const { fmt, Icon, Charts, DB } = window;
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 } },
    React.createElement('div', { className: 'fc gap16' },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Active students (14 days)')),
        React.createElement('div', { className: 'card-pad' }, React.createElement(Charts.Line, { data: client.usageSeries, height: 180, color: 'var(--blue)', format: (v)=>v }))),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Onboarding checklist')),
        React.createElement('div', { style: { padding: '6px 0' } },
          ['Account created','Admin invited','Data imported','First login completed','Payment method set up'].map((s, i) => {
            const done = i < (client.status === 'active' ? 5 : client.status === 'trial' ? 3 : 2);
            return React.createElement('div', { key: i, className: 'row gap10', style: { padding: '9px 18px' } },
              React.createElement('span', { style: { width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center', background: done ? 'var(--green-bg)' : 'var(--surface-3)', color: done ? 'var(--green)' : 'var(--text-faint)' } },
                React.createElement(done ? Icon.check : Icon.clock, { size: 11 })),
              React.createElement('span', { style: { fontSize: 13, whiteSpace: 'nowrap', color: done ? 'var(--text)' : 'var(--text-3)' } }, s),
              done && React.createElement('span', { className: 'tiny muted', style: { marginLeft: 'auto' } }, 'done')); }))) ),
    React.createElement('div', { className: 'card card-pad' },
      React.createElement('h3', { style: { fontSize: 14, fontWeight: 650, marginBottom: 14 } }, 'Details'),
      React.createElement('dl', { className: 'dl' },
        React.createElement('dt', null, 'Tenant ID'), React.createElement('dd', { className: 'mono tiny' }, client.id),
        React.createElement('dt', null, 'Plan'), React.createElement('dd', null, plan.name + ' · ' + fmt.money(plan.price) + '/mo'),
        React.createElement('dt', null, 'Country'), React.createElement('dd', null, client.country),
        React.createElement('dt', null, 'Created'), React.createElement('dd', null, client.created),
        React.createElement('dt', null, 'Last active'), React.createElement('dd', null, client.lastActive),
        React.createElement('dt', null, 'Primary admin'), React.createElement('dd', null, client.contact.name),
        React.createElement('dt', null, 'Health score'), React.createElement('dd', { className: 'mono' }, client.healthScore + '/100'),
        client.trialEnds != null && React.createElement(React.Fragment, null,
          React.createElement('dt', null, 'Trial ends'), React.createElement('dd', { style: { color: client.trialEnds <= 3 ? 'var(--red)' : 'var(--amber)' } }, client.trialEnds < 0 ? Math.abs(client.trialEnds) + 'd overdue' : 'in ' + client.trialEnds + ' days')))));
}

function SubscriptionTab({ client, plan, canChange, onChangePlan }) {
  const { fmt, Icon, DB, FEATURE_LABELS } = window;
  const toast = window.useToast();
  const can = window.useCan();
  const [gw, setGw] = React.useState(client.gateway);
  const [mgr, setMgr] = React.useState(false);
  React.useEffect(() => { setGw(client.gateway); }, [client.id]);

  const METHOD_LABEL = { upi_autopay: 'UPI Autopay', enach: 'e‑NACH (e‑Mandate)', card: 'Card', none: '—' };
  const MANDATE = {
    active:   { cls: 'badge-green', dot: true, label: 'Mandate active' },
    pending:  { cls: 'badge-amber', dot: true, label: 'Awaiting approval' },
    paused:   { cls: 'badge-slate', dot: true, label: 'Paused' },
    cancelled:{ cls: 'badge-red',   dot: true, label: 'Cancelled' },
    none:     { cls: 'badge-slate', dot: true, label: 'Not attached' },
  };
  const m = MANDATE[gw.mandate] || MANDATE.none;
  const identifier = gw.method === 'upi_autopay' ? gw.vpa : gw.method === 'enach' ? gw.bank : gw.method === 'card' ? gw.card : '—';

  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
    React.createElement('div', { className: 'fc gap16' },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'Current subscription')),
          canChange && React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.plans, onClick: onChangePlan }, 'Change plan')),
        React.createElement('div', { className: 'card-pad' },
          React.createElement('div', { className: 'row gap12', style: { marginBottom: 16 } },
            React.createElement('span', { style: { width: 12, height: 12, borderRadius: 4, background: plan.color } }),
            React.createElement('span', { style: { fontSize: 20, fontWeight: 750 } }, plan.name),
            React.createElement('span', { className: 'mono muted' }, fmt.money(plan.price) + ' / month')),
          React.createElement('dl', { className: 'dl' },
            React.createElement('dt', null, 'Status'), React.createElement('dd', null, React.createElement(window.StatusBadge, { status: client.status })),
            React.createElement('dt', null, 'Billing period'), React.createElement('dd', null, 'Monthly · renews Jul 1'),
            React.createElement('dt', null, 'Next charge'), React.createElement('dd', { className: 'mono' }, client.status === 'active' ? fmt.money(plan.price) + ' on Jul 1' : '—')))),

      /* payment gateway card */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', { className: 'f1' }, React.createElement('h3', null, 'Payment gateway'),
            React.createElement('div', { className: 'sub' }, 'Auto‑collection mandate')),
          React.createElement('span', { className: 'badge ' + m.cls + ' badge-dot-' + m.cls.split('-')[1] }, React.createElement('span', { className: 'dot' }), m.label)),
        React.createElement('div', { className: 'card-pad' },
          React.createElement('div', { className: 'row gap12', style: { marginBottom: 14 } },
            React.createElement('span', { style: { width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', color: 'var(--blue)', fontWeight: 800, fontSize: 13 } }, gw.provider.slice(0,2).toUpperCase()),
            React.createElement('div', { style: { minWidth: 0 } },
              React.createElement('div', { style: { fontWeight: 650, fontSize: 14 } }, gw.provider),
              React.createElement('div', { className: 'tiny muted' }, METHOD_LABEL[gw.method] + (identifier && identifier !== '—' ? ' · ' + identifier : '')))),
          gw.mandate !== 'none' && React.createElement('dl', { className: 'dl', style: { gridTemplateColumns: '110px 1fr' } },
            React.createElement('dt', null, 'Method'), React.createElement('dd', null, METHOD_LABEL[gw.method]),
            React.createElement('dt', null, 'Max / cycle'), React.createElement('dd', { className: 'mono' }, fmt.money(gw.maxAmount)),
            React.createElement('dt', null, 'Mandate ID'), React.createElement('dd', { className: 'mono tiny' }, gw.mandateId)),
          can('billing.view') && React.createElement('div', { className: 'row gap8', style: { marginTop: 14 } },
            gw.mandate === 'none'
              ? React.createElement(Btn, { variant: 'primary', size: 'sm', icon: Icon.link, onClick: () => setMgr(true) }, 'Attach gateway')
              : React.createElement(Btn, { variant: 'default', size: 'sm', icon: Icon.sliders, onClick: () => setMgr(true) }, 'Manage'),
            gw.mandate === 'active' && React.createElement(Btn, { variant: 'ghost', size: 'sm', icon: Icon.pause, onClick: () => { setGw(g => ({ ...g, mandate: 'paused' })); toast({ title: 'Auto‑pay paused', msg: client.name, kind: 'info' }); } }, 'Pause auto‑pay'),
            gw.mandate === 'paused' && React.createElement(Btn, { variant: 'primary', size: 'sm', icon: Icon.play, onClick: () => { setGw(g => ({ ...g, mandate: 'active' })); toast({ title: 'Auto‑pay resumed', msg: client.name }); } }, 'Resume'))))),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-head' }, React.createElement('h3', null, 'Included features')),
      React.createElement('div', { style: { padding: '6px 0' } },
        plan.features.map(f => React.createElement('div', { key: f, className: 'row gap10', style: { padding: '8px 18px' } },
          React.createElement(Icon.check, { size: 14, style: { color: 'var(--green)', flexShrink: 0 } }),
          React.createElement('span', { style: { fontSize: 13, whiteSpace: 'nowrap' } }, FEATURE_LABELS[f] || f),
          React.createElement('code', { className: 'mono tiny muted', style: { marginLeft: 'auto' } }, f))))),
    mgr && React.createElement(GatewayModal, { client, gw, onClose: () => setMgr(false), onSave: (next) => { setGw(next); toast({ title: gw.mandate === 'none' ? 'Gateway attached' : 'Mandate updated', msg: next.provider + ' · ' + (next.method === 'upi_autopay' ? 'UPI Autopay' : next.method) }); setMgr(false); } }));
}

function GatewayModal({ client, gw, onClose, onSave }) {
  const { Icon, fmt } = window;
  const [provider, setProvider] = React.useState(gw.provider);
  const [method, setMethod] = React.useState(gw.method === 'none' ? 'upi_autopay' : gw.method);
  const [vpa, setVpa] = React.useState(gw.vpa || client.slug.replace(/-/g,'') + '@okhdfcbank');
  const [bank, setBank] = React.useState(gw.bank || 'HDFC Bank');
  const [maxAmount, setMaxAmount] = React.useState(gw.maxAmount || 15000);
  const providers = ['Razorpay', 'PayU', 'Cashfree'];
  const methods = [
    { key: 'upi_autopay', label: 'UPI Autopay', ic: Icon.zap, hint: 'e‑mandate over UPI' },
    { key: 'enach', label: 'e‑NACH', ic: Icon.database, hint: 'Bank e‑mandate' },
    { key: 'card', label: 'Card', ic: Icon.card, hint: 'Recurring card' },
  ];
  const save = () => onSave({
    ...gw, provider, method,
    mandate: gw.mandate === 'none' ? 'pending' : gw.mandate,
    vpa: method === 'upi_autopay' ? vpa : null,
    bank: method === 'enach' ? bank : null,
    card: method === 'card' ? (gw.card || 'HDFC ···· 4242') : null,
    maxAmount: +maxAmount,
    mandateId: gw.mandateId || provider.slice(0,3).toLowerCase() + '_mnd_' + Math.random().toString(36).slice(2,10),
  });
  return React.createElement(window.Modal, { open: true, onClose },
    React.createElement('div', { className: 'modal-head' },
      React.createElement('div', { className: 'mh-ic', style: { background: 'var(--blue-bg)', color: 'var(--blue)' } }, React.createElement(Icon.card, { size: 19 })),
      React.createElement('div', { className: 'mh-text' }, React.createElement('h3', null, gw.mandate === 'none' ? 'Attach payment gateway' : 'Manage gateway'),
        React.createElement('p', null, client.name))),
    React.createElement('div', { className: 'modal-body' },
      React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 } }, 'Gateway'),
      React.createElement('div', { className: 'row gap8', style: { marginBottom: 16 } }, providers.map(p =>
        React.createElement('button', { key: p, className: 'chip' + (provider === p ? ' active' : ''), style: { height: 36 }, onClick: () => setProvider(p) }, p))),
      React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 } }, 'Collection method'),
      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 } }, methods.map(mt =>
        React.createElement('button', { key: mt.key, onClick: () => setMethod(mt.key),
          style: { padding: '12px 10px', borderRadius: 11, border: '1.5px solid ' + (method === mt.key ? 'var(--accent)' : 'var(--border)'), background: method === mt.key ? 'var(--accent-ghost)' : 'var(--surface-2)', textAlign: 'left' } },
          React.createElement(mt.ic, { size: 16, style: { color: method === mt.key ? 'var(--accent)' : 'var(--text-3)' } }),
          React.createElement('div', { style: { fontWeight: 650, fontSize: 12.5, marginTop: 6 } }, mt.label),
          React.createElement('div', { className: 'tiny muted' }, mt.hint)))),
      method === 'upi_autopay' && React.createElement('div', { className: 'field' }, React.createElement('label', null, 'UPI VPA'), React.createElement('input', { className: 'input mono', value: vpa, onChange: e => setVpa(e.target.value) })),
      method === 'enach' && React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Bank'),
        React.createElement('select', { className: 'select', value: bank, onChange: e => setBank(e.target.value) }, ['HDFC Bank','ICICI Bank','SBI','Axis Bank','Kotak'].map(b => React.createElement('option', { key: b }, b)))),
      React.createElement('div', { className: 'field', style: { marginTop: 14 } }, React.createElement('label', null, 'Max amount per cycle'),
        React.createElement('div', { className: 'input-group', style: { height: 38 } }, React.createElement('span', { className: 'tiny muted' }, '₹'), React.createElement('input', { className: 'mono', type: 'number', value: maxAmount, onChange: e => setMaxAmount(e.target.value) }))),
      React.createElement('div', { className: 'row gap10', style: { marginTop: 14, padding: '10px 12px', background: 'var(--blue-bg)', borderRadius: 9, color: 'var(--blue)', fontSize: 12 } },
        React.createElement(Icon.info, { size: 15 }), 'The school approves the e‑mandate from their side; status moves to Active once authorized.')),
    React.createElement('div', { className: 'modal-foot' },
      React.createElement(Btn, { variant: 'ghost', onClick: onClose }, 'Cancel'),
      React.createElement(Btn, { variant: 'primary', icon: Icon.check, onClick: save }, gw.mandate === 'none' ? 'Send mandate request' : 'Save changes')));
}

function UsageTab({ client, plan }) {
  const { fmt, Icon } = window;
  const metrics = [
    { label: 'Students', value: client.students, limit: client.limits.students, icon: Icon.cap },
    { label: 'Staff accounts', value: client.staff, limit: client.limits.staff, icon: Icon.team },
    { label: 'Storage (GB)', value: client.storage, limit: client.limits.storage_gb, icon: Icon.database },
  ];
  return React.createElement('div', { className: 'card card-pad' },
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 } },
      metrics.map(m => {
        const pct = Math.round(m.value / m.limit * 100);
        return React.createElement('div', { key: m.label },
          React.createElement('div', { className: 'row gap8 muted', style: { fontSize: 12.5, fontWeight: 600, marginBottom: 10 } },
            React.createElement(m.icon, { size: 15 }), m.label),
          React.createElement('div', { className: 'row gap6', style: { alignItems: 'baseline', marginBottom: 10 } },
            React.createElement('span', { className: 'mono', style: { fontSize: 26, fontWeight: 750 } }, m.value),
            React.createElement('span', { className: 'mono muted tiny' }, '/ ' + fmt.num(m.limit))),
          React.createElement(window.UsageBar, { value: m.value, limit: m.limit, compact: true }),
          pct >= 80 && React.createElement('div', { className: 'tiny', style: { marginTop: 8, color: pct >= 95 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 } },
            React.createElement('span', { className: 'row gap4' }, React.createElement(Icon.warn, { size: 12 }), pct >= 95 ? 'At capacity' : 'Approaching limit'))); })),
    React.createElement('div', { className: 'divider', style: { margin: '20px 0' } }),
    React.createElement('p', { className: 'tiny muted' }, 'Plan limits derive from ', React.createElement('b', { style: { color: 'var(--text-2)' } }, plan.name), '. Upgrade to raise capacity.'));
}

function ActivityTab({ client }) {
  const { Icon, Avatar, DB } = window;
  const events = [
    { who: client.csm, what: 'logged a support note', when: '2h ago', ic: Icon.message },
    { who: 'System', what: 'sent monthly invoice', when: 'yesterday', ic: Icon.invoice },
    { who: client.contact.name, what: 'imported 142 student records', when: '3d ago', ic: Icon.upload },
    { who: 'Diego Reyes', what: 'changed plan to ' + client.planName, when: '6d ago', ic: Icon.plans },
    { who: client.contact.name, what: 'completed first login', when: '8d ago', ic: Icon.login },
  ];
  return React.createElement('div', { className: 'card' },
    React.createElement('div', { style: { padding: '4px 0' } }, events.map((e, i) =>
      React.createElement('div', { key: i, className: 'row gap12', style: { padding: '13px 18px', borderBottom: i < events.length-1 ? '1px solid var(--border-soft)' : 'none' } },
        React.createElement('span', { style: { width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', color: 'var(--text-3)' } }, React.createElement(e.ic, { size: 15 })),
        React.createElement('div', { className: 'f1', style: { fontSize: 13 } }, React.createElement('b', null, e.who), ' ', React.createElement('span', { className: 'muted' }, e.what)),
        React.createElement('span', { className: 'tiny muted' }, e.when)))));
}

function ContactsTab({ client }) {
  const { Icon, Avatar } = window;
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
    React.createElement('div', { className: 'card card-pad' },
      React.createElement('div', { className: 'tiny muted', style: { fontWeight: 600, marginBottom: 12 } }, 'PRIMARY ADMIN'),
      React.createElement('div', { className: 'row gap12' },
        React.createElement(Avatar, { name: client.contact.name, size: 44 }),
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 650, fontSize: 15 } }, client.contact.name),
          React.createElement('div', { className: 'tiny muted' }, 'School administrator'))),
      React.createElement('div', { className: 'fc gap8', style: { marginTop: 16 } },
        React.createElement('a', { className: 'row gap8 tiny', style: { color: 'var(--text-2)' }, href: '#', onClick: e=>e.preventDefault() }, React.createElement(Icon.mail, { size: 14 }), client.contact.email),
        React.createElement('span', { className: 'row gap8 tiny muted' }, React.createElement(Icon.phone, { size: 14 }), client.contact.phone))),
    React.createElement('div', { className: 'card card-pad' },
      React.createElement('div', { className: 'tiny muted', style: { fontWeight: 600, marginBottom: 12 } }, 'ASSIGNED CSM'),
      React.createElement('div', { className: 'row gap12' },
        React.createElement(Avatar, { name: client.csm, size: 44 }),
        React.createElement('div', null,
          React.createElement('div', { style: { fontWeight: 650, fontSize: 15 } }, client.csm),
          React.createElement('div', { className: 'tiny muted' }, 'Customer success manager')))));
}

window.ClientDetail = ClientDetail;

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
      React.createElement(window.Segmented, { value: kind, onChange: (v) => { setKind(v); setQuery(''); }, options: [
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
        ? React.createElement('tr', { key: '_empty' }, React.createElement('td', { colSpan: headers.length + (canEdit ? 1 : 0) }, React.createElement(window.Empty, { title: 'No ' + kind + ' found', icon: Icon.user })))
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
          })))),
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
