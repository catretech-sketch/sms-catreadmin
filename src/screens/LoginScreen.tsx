import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Btn, useToast } from '../components';
import { Icon } from '../lib/icons';
import { ApiError } from '../api/client';

export function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<'identify' | 'verify'>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await requestOtp(identifier.trim());
      setStep('verify');
      toast({ title: 'Code sent', msg: 'Check your email for the 6-digit code.', kind: 'info' });
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not send the code. Try again.');
    } finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await verifyOtp(identifier.trim(), code.trim());
      // success: AuthProvider flips status → App renders the shell
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Incorrect or expired code.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg-grad)' }}>
      <div style={{ width: '100%', maxWidth: 440, borderRadius: 18, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', background: 'var(--surface)', padding: '40px 38px' }}>
        <div className="row gap10" style={{ marginBottom: 22 }}>
          <div className="brand-mark" style={{ width: 34, height: 34 }}>C</div>
          <div>
            <div className="brand-name" style={{ fontSize: 16 }}>Catre</div>
            <div className="brand-sub">Operator Control Plane</div>
          </div>
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Sign in to your account</h2>
        <p className="muted tiny" style={{ marginTop: 4 }}>Platform administrators only.</p>

        {step === 'identify' ? (
          <form onSubmit={send} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="username"
                value={identifier} onChange={(e) => { setIdentifier(e.target.value); setErr(''); }}
                placeholder="you@catre.io" />
            </div>
            {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
            <Btn variant="primary" type="submit" disabled={busy || !identifier.trim()}>
              <Icon.lock size={15} />{busy ? 'Sending…' : 'Send OTP'}
            </Btn>
          </form>
        ) : (
          <form onSubmit={verify} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="code">Enter 6-digit code</label>
              <input id="code" className="input mono" inputMode="numeric" maxLength={6}
                value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
                placeholder="••••••" style={{ letterSpacing: '4px', fontSize: 16 }} />
            </div>
            {err && <div className="tiny" style={{ color: 'var(--red)' }}>{err}</div>}
            <Btn variant="primary" type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify & sign in'}<Icon.arrowRight size={16} />
            </Btn>
            <div className="row jb tiny">
              <a href="#" style={{ color: 'var(--accent-text)' }} onClick={(e) => { e.preventDefault(); send(e); }}>Resend code</a>
              <a href="#" className="muted" onClick={(e) => { e.preventDefault(); setStep('identify'); setCode(''); setErr(''); }}>Use a different email</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
