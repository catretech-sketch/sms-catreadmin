/* ============================================================
   Login screen — with demo logins for every role
   ============================================================ */
const { Btn: LBtn, Icon: LIcon, RBAC: LRBAC } = window;

function LoginScreen({ onLogin }) {
  const { ROLES, DEMO_ROLES } = window.RBAC;
  const [email, setEmail] = React.useState('rohan@catre.io');
  const [pw, setPw] = React.useState('••••••••••');
  const [showPw, setShowPw] = React.useState(false);
  const [role, setRole] = React.useState('admin');
  const [busy, setBusy] = React.useState(false);

  const demoUsers = {
    admin: 'rohan@catre.io', sales: 'karthik@catre.io',
  };
  const submit = (e) => {
    e && e.preventDefault();
    setBusy(true);
    setTimeout(() => { setBusy(false); onLogin(role); }, 620);
  };
  const quickLogin = (r) => { setRole(r); setEmail(demoUsers[r]); setTimeout(() => onLogin(r), 120); };

  return React.createElement('div', { style: { minHeight: '100%', display: 'grid', gridTemplateColumns: '1fr', placeItems: 'center', padding: 24, background: 'var(--bg-grad)' } },
    React.createElement('div', { style: { width: '100%', maxWidth: 880, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 0, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)' } },

      /* left: brand panel */
      React.createElement('div', { style: { padding: '40px 38px', background: 'linear-gradient(165deg, var(--surface-2), var(--surface))', borderRight: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column' } },
        React.createElement('div', { className: 'row gap10', style: { marginBottom: 'auto' } },
          React.createElement('div', { className: 'brand-mark', style: { width: 34, height: 34 } }, 'C'),
          React.createElement('div', null,
            React.createElement('div', { className: 'brand-name', style: { fontSize: 16 } }, 'Catre'),
            React.createElement('div', { className: 'brand-sub' }, 'Operator Control Plane'))),
        React.createElement('div', { style: { margin: '40px 0' } },
          React.createElement('h1', { style: { fontSize: 25, fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.15 } }, 'Run the business behind every school.'),
          React.createElement('p', { className: 'muted', style: { marginTop: 12, fontSize: 13.5, lineHeight: 1.6 } }, 'Manage client schools, onboarding, billing and support from one internal control plane.')),
        React.createElement('div', { className: 'row gap8', style: { marginTop: 'auto', fontSize: 12, color: 'var(--text-3)' } },
          React.createElement(window.Icon.shield, { size: 15 }),
          React.createElement('span', null, 'Platform-admin access · audited'))),

      /* right: form */
      React.createElement('div', { style: { padding: '40px 38px' } },
        React.createElement('h2', { style: { fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' } }, 'Sign in to your account'),
        React.createElement('p', { className: 'muted tiny', style: { marginTop: 4 } }, 'Platform administrators only.'),
        React.createElement('form', { onSubmit: submit, style: { marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 } },
          React.createElement('div', { className: 'field' },
            React.createElement('label', null, 'Email'),
            React.createElement('input', { className: 'input', type: 'email', value: email, onChange: e => setEmail(e.target.value), autoComplete: 'username' })),
          React.createElement('div', { className: 'field' },
            React.createElement('div', { className: 'row jb' },
              React.createElement('label', null, 'Password'),
              React.createElement('a', { href: '#', className: 'tiny', style: { color: 'var(--accent-text)' }, onClick: e => e.preventDefault() }, 'Forgot?')),
            React.createElement('div', { className: 'input-group', style: { height: 38 } },
              React.createElement(window.Icon.lock, { size: 15 }),
              React.createElement('input', { type: showPw ? 'text' : 'password', value: pw, onChange: e => setPw(e.target.value), autoComplete: 'current-password' }),
              React.createElement('button', { type: 'button', onClick: () => setShowPw(s => !s), style: { display: 'grid', placeItems: 'center', color: 'var(--text-3)' } },
                React.createElement(showPw ? window.Icon.eyeOff : window.Icon.eye, { size: 15 })))),
          React.createElement('button', { type: 'submit', className: 'btn btn-primary', style: { height: 40, marginTop: 4 }, disabled: busy },
            busy ? 'Signing in…' : 'Sign in', !busy && React.createElement(window.Icon.arrowRight, { size: 16 }))),

        React.createElement('div', { className: 'row gap10', style: { margin: '22px 0 14px' } },
          React.createElement('div', { className: 'divider f1' }),
          React.createElement('span', { className: 'tiny muted', style: { whiteSpace: 'nowrap' } }, 'Demo logins'),
          React.createElement('div', { className: 'divider f1' })),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 } },
          DEMO_ROLES.map(rk => ROLES[rk]).map(r =>
            React.createElement('button', { key: r.key, type: 'button', onClick: () => quickLogin(r.key),
              className: 'chip', style: { height: 'auto', padding: '8px 9px', flexDirection: 'column', alignItems: 'flex-start', gap: 2 } },
              React.createElement('span', { className: 'row gap6', style: { width: '100%' } },
                React.createElement('span', { style: { width: 7, height: 7, borderRadius: 2, background: r.color } }),
                React.createElement('span', { style: { fontWeight: 700, fontSize: 12.5, color: 'var(--text)' } }, r.name)),
              React.createElement('span', { className: 'tiny', style: { color: 'var(--text-faint)', fontSize: 10.5 } }, demoUsers[r.key].split('@')[0])))),
        React.createElement('p', { className: 'tiny muted', style: { marginTop: 14, lineHeight: 1.5 } }, 'Pick any role to explore how access changes across the panel.')
      )));
}
window.LoginScreen = LoginScreen;
