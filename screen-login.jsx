/* ============================================================
   Login screen — password OR email/mobile OTP, plus demo logins.
   OTP only goes to a contact that already exists in DB.TEAM
   (active accounts). No real SMS/email backend, so the generated
   code is shown in a demo banner.
   ============================================================ */
const { Btn: LBtn, Icon: LIcon, RBAC: LRBAC } = window;

function LoginScreen({ onLogin }) {
  const { ROLES, DEMO_ROLES } = window.RBAC;
  const toast = window.useToast();

  const [mode, setMode] = React.useState('password'); // 'password' | 'otp'

  // password mode
  const [email, setEmail] = React.useState('rohan@catre.io');
  const [pw, setPw] = React.useState('••••••••••');
  const [showPw, setShowPw] = React.useState(false);
  const [role, setRole] = React.useState('admin');
  const [busy, setBusy] = React.useState(false);

  // otp mode
  const [otpStep, setOtpStep] = React.useState('identify'); // 'identify' | 'verify'
  const [contact, setContact] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sentOtp, setSentOtp] = React.useState('');
  const [otpUser, setOtpUser] = React.useState(null);
  const [err, setErr] = React.useState('');

  const demoUsers = { admin: 'rohan@catre.io', sales: 'karthik@catre.io' };
  const submit = (e) => { e && e.preventDefault(); setBusy(true); setTimeout(() => { setBusy(false); onLogin(role); }, 620); };
  const quickLogin = (r) => { setRole(r); setEmail(demoUsers[r]); setTimeout(() => onLogin(r), 120); };

  // match input (email or mobile) against an ACTIVE team member already in the database
  const findUser = (input) => {
    const v = (input || '').trim().toLowerCase();
    if (!v) return null;
    const digits = v.replace(/\D/g, '');
    return window.DB.TEAM.find(u => u.status === 'active' && (
      u.email.toLowerCase() === v ||
      (u.phone && digits.length >= 10 && u.phone.replace(/\D/g, '').endsWith(digits.slice(-10)))
    )) || null;
  };
  const maskEmail = (e) => { const i = e.indexOf('@'); return i < 0 ? e : e.slice(0, Math.min(2, i)) + '•••' + e.slice(i); };
  const maskPhone = (p) => { const d = (p || '').replace(/\D/g, ''); return '•••• ••• ' + d.slice(-4); };

  const sendOtp = (e) => {
    e && e.preventDefault();
    const u = findUser(contact);
    if (!u) { setErr('No account found for that email or mobile number.'); return; }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setSentOtp(otp); setOtpUser(u); setCode(''); setErr(''); setOtpStep('verify');
    toast({ title: 'OTP sent', msg: 'Code sent to ' + maskEmail(u.email), kind: 'info' });
  };
  const verifyOtp = (e) => {
    e && e.preventDefault();
    if (code.trim() === sentOtp && otpUser) onLogin(otpUser.role);
    else setErr('Incorrect code. Please try again.');
  };
  const resetOtp = () => { setOtpStep('identify'); setSentOtp(''); setOtpUser(null); setCode(''); setErr(''); };

  /* ---- password panel ---- */
  const passwordPanel = React.createElement('form', { onSubmit: submit, style: { marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
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
      busy ? 'Signing in…' : 'Sign in', !busy && React.createElement(window.Icon.arrowRight, { size: 16 })));

  /* ---- otp: identify panel ---- */
  const otpIdentify = React.createElement('form', { onSubmit: sendOtp, style: { marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
    React.createElement('div', { className: 'field' },
      React.createElement('label', null, 'Email or mobile number'),
      React.createElement('input', { className: 'input', value: contact, onChange: e => { setContact(e.target.value); setErr(''); }, placeholder: 'you@catre.io  or  +91 98xxx xxxxx', autoComplete: 'username' })),
    err && React.createElement('div', { className: 'tiny', style: { color: 'var(--red)' } }, err),
    React.createElement('button', { type: 'submit', className: 'btn btn-primary', style: { height: 40, marginTop: 4 } },
      React.createElement(window.Icon.lock, { size: 15 }), 'Send OTP'),
    React.createElement('p', { className: 'tiny muted', style: { lineHeight: 1.5 } }, 'We’ll send a one-time code to the email / mobile number already on file for your account.'));

  /* ---- otp: verify panel ---- */
  const otpVerify = otpUser && React.createElement('form', { onSubmit: verifyOtp, style: { marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
    React.createElement('div', { style: { padding: '11px 13px', borderRadius: 10, background: 'var(--accent-ghost)', border: '1px solid var(--accent-line)' } },
      React.createElement('div', { className: 'tiny', style: { color: 'var(--accent-text)', fontWeight: 600 } }, 'Code sent to ' + maskEmail(otpUser.email) + ' · ' + maskPhone(otpUser.phone)),
      React.createElement('div', { className: 'tiny muted', style: { marginTop: 4 } }, 'Demo mode — no real SMS/email is sent. Your code is ',
        React.createElement('b', { className: 'mono', style: { color: 'var(--text)', letterSpacing: '1px' } }, sentOtp), '.')),
    React.createElement('div', { className: 'field' },
      React.createElement('label', null, 'Enter 6-digit code'),
      React.createElement('input', { className: 'input mono', value: code, onChange: e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }, inputMode: 'numeric', maxLength: 6, placeholder: '••••••', style: { letterSpacing: '4px', fontSize: 16 } })),
    err && React.createElement('div', { className: 'tiny', style: { color: 'var(--red)' } }, err),
    React.createElement('button', { type: 'submit', className: 'btn btn-primary', style: { height: 40, marginTop: 4 }, disabled: code.length !== 6 },
      'Verify & sign in', React.createElement(window.Icon.arrowRight, { size: 16 })),
    React.createElement('div', { className: 'row jb tiny' },
      React.createElement('a', { href: '#', style: { color: 'var(--accent-text)' }, onClick: e => { e.preventDefault(); sendOtp(); } }, 'Resend code'),
      React.createElement('a', { href: '#', className: 'muted', onClick: e => { e.preventDefault(); resetOtp(); } }, 'Use a different email / number')));

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

        React.createElement('div', { style: { marginTop: 18 } },
          React.createElement(window.Segmented, { value: mode, onChange: (m) => { setMode(m); setErr(''); }, options: [
            { value: 'password', label: 'Password' },
            { value: 'otp', label: 'Email / Mobile OTP' }] })),

        mode === 'password' ? passwordPanel : (otpStep === 'identify' ? otpIdentify : otpVerify),

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
        React.createElement('p', { className: 'tiny muted', style: { marginTop: 14, lineHeight: 1.5 } }, 'Tip: try OTP with ', React.createElement('b', null, 'rohan@catre.io'), ' or ', React.createElement('b', null, '+91 98202 10022'), '.')
      )));
}
window.LoginScreen = LoginScreen;
