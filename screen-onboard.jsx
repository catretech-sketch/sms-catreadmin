/* ============================================================
   Onboard new client — multi-step wizard
   ============================================================ */
function OnboardWizard() {
  const { DB, fmt, Icon } = window;
  const nav = window.useNav();
  const toast = window.useToast();
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    name: '', slug: '', country: 'Mumbai, MH', size: '',
    adminName: '', adminEmail: '', adminPhone: '',
    plan: 'pl_gold', trial: 14,
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v, ...(k === 'name' ? { slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}) }));
  const [errors, setErrors] = React.useState({});

  const steps = [
    { title: 'School details', desc: 'Tell us about the school' },
    { title: 'Admin contact', desc: 'Who will administer the account' },
    { title: 'Plan & tier', desc: 'Choose a subscription plan' },
    { title: 'Trial length', desc: 'Set the evaluation period' },
    { title: 'Review', desc: 'Confirm and create' },
  ];

  const validate = () => {
    const e = {};
    if (step === 0) { if (!data.name.trim()) e.name = 'School name is required'; if (!data.slug.trim()) e.slug = 'Slug is required'; }
    if (step === 1) {
      if (!data.adminName.trim()) e.adminName = 'Admin name is required';
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(data.adminEmail)) e.adminEmail = 'Valid email required';
    }
    setErrors(e); return Object.keys(e).length === 0;
  };
  const next = () => { if (validate()) setStep(s => Math.min(s + 1, steps.length - 1)); };
  const back = () => setStep(s => Math.max(s - 1, 0));
  const create = () => { toast({ title: 'Client created', msg: data.name + ' is now in trial.' }); nav.go('clients'); };

  const plan = DB.PLANS.find(p => p.id === data.plan);

  const Field = ({ label, k, placeholder, type = 'text', prefix, hint }) =>
    React.createElement('div', { className: 'field' },
      React.createElement('label', null, label),
      prefix
        ? React.createElement('div', { className: 'input-group', style: { height: 38 } }, React.createElement('span', { className: 'tiny muted' }, prefix),
            React.createElement('input', { value: data[k], onChange: e => set(k, e.target.value), placeholder }))
        : React.createElement('input', { className: 'input', type, value: data[k], onChange: e => set(k, e.target.value), placeholder }),
      hint && !errors[k] && React.createElement('span', { className: 'hint' }, hint),
      errors[k] && React.createElement('span', { className: 'err' }, errors[k]));

  return React.createElement('div', { className: 'page', style: { maxWidth: 880 } },
    React.createElement('button', { className: 'row gap6 muted tiny', style: { marginBottom: 14, fontWeight: 600 }, onClick: () => nav.go('clients') },
      React.createElement(Icon.chevLeft, { size: 14 }), 'Cancel'),
    React.createElement('h1', { className: 'page-title', style: { marginBottom: 22 } }, 'Onboard a new client'),

    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '210px 1fr', gap: 28, alignItems: 'start' } },
      /* stepper */
      React.createElement('div', { className: 'fc gap2' }, steps.map((s, i) =>
        React.createElement('button', { key: i, onClick: () => i < step && setStep(i), className: 'row gap10', style: { padding: '9px 10px', borderRadius: 9, textAlign: 'left', cursor: i < step ? 'pointer' : 'default', background: i === step ? 'var(--surface-2)' : 'transparent' } },
          React.createElement('span', { style: { width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700,
            background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface-3)', color: i <= step ? '#fff' : 'var(--text-3)' } },
            i < step ? React.createElement(Icon.check, { size: 13 }) : i + 1),
          React.createElement('div', { style: { minWidth: 0 } },
            React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: i === step ? 'var(--text)' : 'var(--text-3)' } }, s.title))))),

      /* panel */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-head' },
          React.createElement('div', null, React.createElement('h3', null, steps[step].title), React.createElement('div', { className: 'sub' }, steps[step].desc))),
        React.createElement('div', { className: 'card-pad', style: { minHeight: 260 } },
          step === 0 && React.createElement('div', { className: 'fc gap16' },
            Field({ label: 'School name', k: 'name', placeholder: 'e.g. Greenwood High' }),
            Field({ label: 'Workspace slug', k: 'slug', prefix: 'catre.app/', hint: 'Auto-generated from the name; editable.' }),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
              React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Country'),
                React.createElement('select', { className: 'select', value: data.country, onChange: e => set('country', e.target.value) },
                  ['Mumbai, MH','New Delhi, DL','Bengaluru, KA','Hyderabad, TS','Chennai, TN','Pune, MH','Kolkata, WB','Ahmedabad, GJ'].map(c => React.createElement('option', { key: c }, c)))),
              React.createElement('div', { className: 'field' }, React.createElement('label', null, 'Approx. size'),
                React.createElement('select', { className: 'select', value: data.size, onChange: e => set('size', e.target.value) },
                  React.createElement('option', { value: '' }, 'Select…'),
                  ['Under 200','200–500','500–1,200','1,200–5,000','5,000+'].map(c => React.createElement('option', { key: c }, c)))))),

          step === 1 && React.createElement('div', { className: 'fc gap16' },
            Field({ label: 'Admin full name', k: 'adminName', placeholder: 'e.g. Priya Sharma' }),
            Field({ label: 'Admin email', k: 'adminEmail', type: 'email', placeholder: 'admin@school.edu', hint: 'They’ll receive an invite to set up the account.' }),
            Field({ label: 'Phone (optional)', k: 'adminPhone', placeholder: '+1 (555) 000-0000' })),

          step === 2 && React.createElement('div', { className: 'fc gap10' },
            DB.PLANS.filter(p => p.active).map(p =>
              React.createElement('button', { key: p.id, onClick: () => set('plan', p.id),
                style: { textAlign: 'left', padding: '14px 16px', borderRadius: 12, border: '1.5px solid ' + (data.plan === p.id ? 'var(--accent)' : 'var(--border)'), background: data.plan === p.id ? 'var(--accent-ghost)' : 'var(--surface-2)', cursor: 'pointer' } },
                React.createElement('div', { className: 'row jb' },
                  React.createElement('div', { className: 'row gap10' },
                    React.createElement('span', { style: { width: 11, height: 11, borderRadius: 3, background: p.color } }),
                    React.createElement('span', { style: { fontWeight: 700, fontSize: 15 } }, p.name),
                    p.popular && React.createElement('span', { className: 'badge badge-accent' }, 'Popular')),
                  React.createElement('span', { className: 'mono', style: { fontWeight: 700 } }, fmt.money(p.price), React.createElement('span', { className: 'tiny muted' }, '/mo'))),
                React.createElement('div', { className: 'tiny muted', style: { marginTop: 6 } }, p.desc),
                React.createElement('div', { className: 'tiny muted mono', style: { marginTop: 8 } }, fmt.num(p.limits.students) + ' students · ' + fmt.num(p.limits.staff) + ' staff · ' + p.limits.storage_gb + ' GB')))),

          step === 3 && React.createElement('div', null,
            React.createElement('label', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' } }, 'Trial length'),
            React.createElement('div', { className: 'row gap8 fw', style: { marginTop: 12 } },
              [7, 14, 30, 60].map(d => React.createElement('button', { key: d, onClick: () => set('trial', d),
                className: 'chip' + (data.trial === d ? ' active' : ''), style: { height: 'auto', padding: '14px 20px', flexDirection: 'column' } },
                React.createElement('span', { className: 'mono', style: { fontSize: 22, fontWeight: 750, color: data.trial===d?'var(--accent-text)':'var(--text)' } }, d),
                React.createElement('span', { className: 'tiny' }, 'days')))),
            React.createElement('p', { className: 'tiny muted', style: { marginTop: 16 } }, 'The trial begins immediately. The client can be activated any time before it ends.')),

          step === 4 && React.createElement('div', { className: 'fc gap16' },
            React.createElement('div', { className: 'row gap12', style: { padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border-soft)' } },
              React.createElement(window.Avatar, { name: data.name || 'New School', size: 44, square: true }),
              React.createElement('div', null,
                React.createElement('div', { style: { fontWeight: 700, fontSize: 16 } }, data.name || 'Untitled School'),
                React.createElement('div', { className: 'tiny muted mono' }, 'catre.app/' + (data.slug || 'slug')))),
            React.createElement('dl', { className: 'dl' },
              React.createElement('dt', null, 'Country'), React.createElement('dd', null, data.country),
              React.createElement('dt', null, 'Admin'), React.createElement('dd', null, data.adminName || '—', ' · ', data.adminEmail || '—'),
              React.createElement('dt', null, 'Plan'), React.createElement('dd', null, plan.name + ' · ' + fmt.money(plan.price) + '/mo'),
              React.createElement('dt', null, 'Trial'), React.createElement('dd', null, data.trial + ' days'),
              React.createElement('dt', null, 'First charge'), React.createElement('dd', null, 'After trial ends')),
            React.createElement('div', { className: 'row gap10', style: { padding: '11px 14px', background: 'var(--accent-ghost)', borderRadius: 10, color: 'var(--accent-text)', fontSize: 12.5 } },
              React.createElement(Icon.info, { size: 15 }), 'An invite email will be sent to the admin to complete setup.'))),

        React.createElement('div', { className: 'modal-foot between', style: { borderTop: '1px solid var(--border-soft)' } },
          React.createElement('div', null, step > 0 && React.createElement(Btn, { variant: 'ghost', icon: Icon.chevLeft, onClick: back }, 'Back')),
          step < steps.length - 1
            ? React.createElement(Btn, { variant: 'primary', onClick: next }, 'Continue', React.createElement(Icon.arrowRight, { size: 16 }))
            : React.createElement(Btn, { variant: 'primary', icon: Icon.rocket, onClick: create }, 'Create client')))));
}
window.OnboardWizard = OnboardWizard;
