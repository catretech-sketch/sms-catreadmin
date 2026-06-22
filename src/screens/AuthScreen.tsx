import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { otpRequest, otpVerify, setPassword as apiSetPassword } from '../api/auth';
import { Btn, useToast } from '../components';
import { Icon } from '../lib/icons';
import { ApiError } from '../api/client';

type View = 'login' | 'recover-identify' | 'recover-verify' | 'recover-setpw';
const MIN_PW = 8;

export function AuthScreen(): React.ReactElement {
  const { loginWithPassword, finalizeSession } = useAuth();
  const toast = useToast();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const goView = (v: View) => { setView(v); setErr(''); };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await loginWithPassword(email.trim(), pw); }
    catch (x) { setErr(x instanceof ApiError ? 'Incorrect email or password' : 'Could not sign in. Try again.'); }
    finally { setBusy(false); }
  };

  const doRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await otpRequest(email.trim());
      goView('recover-verify');
      toast({ title: 'Code sent', msg: 'Check your email for the 6-digit code.', kind: 'info' });
    } catch (x) {
      if (x instanceof ApiError && x.code === 'not_registered') setErr("That email isn't registered. Contact your administrator.");
      else setErr(x instanceof ApiError ? x.message : 'Could not send the code. Try again.');
    } finally { setBusy(false); }
  };

  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await otpVerify(email.trim(), code.trim()); goView('recover-setpw'); }
    catch (x) { setErr(x instanceof ApiError ? 'That code is incorrect or expired.' : 'Could not verify the code. Try again.'); }
    finally { setBusy(false); }
  };

  const pwValid = newPw.length >= MIN_PW && newPw === confirmPw;
  const doSetPw = async (e: React.FormEvent) => {
    e.preventDefault(); if (!pwValid) return; setBusy(true); setErr('');
    try { await apiSetPassword(newPw); await finalizeSession(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not set the password. Try again.'); }
    finally { setBusy(false); }
  };

  const PwToggle = (
    <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
      style={{ display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
      {React.createElement(showPw ? Icon.eyeOff : Icon.eye, { size: 15 })}
    </button>
  );

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-grad)' }}>
      <div className="login-card">
        {/* left: brand panel */}
        <div className="login-brand">
          <div className="row gap10" style={{ marginBottom: 'auto' }}>
            <div className="brand-mark" style={{ width: 34, height: 34 }}>C</div>
            <div>
              <div className="brand-name" style={{ fontSize: 16 }}>Catre</div>
              <div className="brand-sub">Operator Control Plane</div>
            </div>
          </div>
          <div style={{ margin: '40px 0' }}>
            <h1 style={{ fontSize: 25, fontWeight: 750, letterSpacing: '-0.03em', lineHeight: 1.15 }}>Run the business behind every school.</h1>
            <p className="muted" style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.6 }}>
              Manage client schools, onboarding, billing and support from one internal control plane.
            </p>
          </div>
          <div className="row gap8" style={{ marginTop: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
            <Icon.shield size={15} />
            <span>Platform-admin access · audited</span>
          </div>
        </div>

        {/* right: form */}
        <div className="login-form">
          {view === 'login' && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Sign in to your account</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>Platform administrators only.</p>
              <form onSubmit={doLogin} style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" className="input" type="email" autoComplete="username"
                    value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="you@catre.io" />
                </div>
                <div className="field">
                  <div className="row jb">
                    <label htmlFor="password">Password</label>
                    <button type="button" className="tiny" style={{ color: 'var(--accent-text)' }} onClick={() => goView('recover-identify')}>Forgot password?</button>
                  </div>
                  <div className="input-group" style={{ height: 38 }}>
                    <Icon.lock size={15} />
                    <input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password"
                      value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} />
                    {PwToggle}
                  </div>
                </div>
                {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
                <Btn variant="primary" type="submit" disabled={busy || !email.trim() || !pw}>
                  {busy ? 'Signing in…' : 'Sign in'}{!busy && <Icon.arrowRight size={16} />}
                </Btn>
              </form>
            </>
          )}

          {view === 'recover-identify' && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Reset your password</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>First time signing in? Use this too — we'll email you a code.</p>
              <form onSubmit={doRequest} style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" className="input" type="email" autoComplete="username"
                    value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="you@catre.io" />
                </div>
                {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
                <Btn variant="primary" type="submit" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send code'}</Btn>
                <button type="button" className="muted tiny" onClick={() => goView('login')}>Back to sign in</button>
              </form>
            </>
          )}

          {view === 'recover-verify' && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Enter the code</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>We sent a 6-digit code to {email}.</p>
              <form onSubmit={doVerify} style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="code">Enter 6-digit code</label>
                  <input id="code" className="input mono" inputMode="numeric" maxLength={6}
                    value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
                    placeholder="••••••" style={{ letterSpacing: '4px', fontSize: 16 }} />
                </div>
                {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
                <Btn variant="primary" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify code'}</Btn>
                <button type="button" className="muted tiny" onClick={() => goView('recover-identify')}>Use a different email</button>
              </form>
            </>
          )}

          {view === 'recover-setpw' && (
            <>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Create a password</h2>
              <p className="muted tiny" style={{ marginTop: 4 }}>At least {MIN_PW} characters.</p>
              <form onSubmit={doSetPw} style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="newpw">New password</label>
                  <div className="input-group" style={{ height: 38 }}>
                    <Icon.lock size={15} />
                    <input id="newpw" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                      value={newPw} onChange={e => { setNewPw(e.target.value); setErr(''); }} />
                    {PwToggle}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="confirmpw">Confirm password</label>
                  <input id="confirmpw" className="input" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                    value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setErr(''); }} />
                </div>
                {confirmPw.length > 0 && newPw !== confirmPw && <div className="tiny muted">Passwords don't match yet.</div>}
                {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
                <Btn variant="primary" type="submit" disabled={busy || !pwValid}>{busy ? 'Saving…' : 'Set password & sign in'}</Btn>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
