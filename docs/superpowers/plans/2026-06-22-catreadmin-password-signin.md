# catreadmin Password Sign-in + Unified Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace catreadmin's email-OTP-only sign-in with a password login, where OTP is used only for first-time password creation and forgot-password — matching the design prototype.

**Architecture:** Frontend-only change in `sms-catreadmin`. The backend already exposes `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, and `/auth/set-password`. A new `AuthScreen` container renders four views in the anonymous state (`login`, `recover-identify`, `recover-verify`, `recover-setpw`). The recovery flow runs entirely while anonymous and finalizes the session only after the password is set, so set-password stays mandatory. `AuthContext` gains `loginWithPassword` and `finalizeSession`; the old auto-authenticating `verifyOtp` is removed.

**Tech Stack:** React 18 + TypeScript, @tanstack/react-query (unaffected), Vitest + Testing Library + jsdom.

## Global Constraints

- Frontend-only. **No backend changes.** All four auth endpoints already exist.
- Recovery identifier is **email only** (phone deferred — backend SMS is a stub).
- Password rule (client-side): **minimum 8 characters**, and confirm must match.
- **Remove** the standalone OTP-login screen and all demo-role quick logins.
- Error copy (verbatim): login failure → `Incorrect email or password`; otp/request 404 → `That email isn't registered. Contact your administrator.`; otp/verify failure → `That code is incorrect or expired.`
- Follow existing test patterns (`vi.spyOn(authApi, …)`, render under `<ToastHost><AuthProvider>…`). Run a single test file with `npx vitest run <path>`; typecheck with `npm run typecheck`.

---

### Task 1: `login()` API function + `/auth/login` no-refresh guard

**Files:**
- Modify: `src/api/auth.ts` (add `login`)
- Modify: `src/api/client.ts:11` (add `/auth/login` to `NO_AUTH`)
- Test: `src/api/auth.test.ts` (add cases)

**Interfaces:**
- Produces: `login(email: string, password: string): Promise<AuthTokens>` — POSTs `/auth/login`, stores tokens via `tokenStore.set`, returns them.

- [ ] **Step 1: Write the failing test** — append to `src/api/auth.test.ts`, and add `login` to the import on line 3 (`import { otpRequest, otpVerify, login, me } from './auth';`):

```ts
  it('login posts credentials and stores the returned tokens', async () => {
    const spy = vi.spyOn(client, 'request').mockResolvedValue({ access_token: 'a2', refresh_token: 'r2' });
    await login('rohan@catre.io', 's3cret-pass');
    expect(spy).toHaveBeenCalledWith('/auth/login', { method: 'POST', body: { email: 'rohan@catre.io', password: 's3cret-pass' } });
    expect(tokenStore.getAccess()).toBe('a2');
    expect(tokenStore.getRefresh()).toBe('r2');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api/auth.test.ts`
Expected: FAIL — `login` is not exported (TypeScript/import error).

- [ ] **Step 3: Add the implementation** — in `src/api/auth.ts`, add after the `otpVerify` function:

```ts
export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await request<AuthTokens>('/auth/login', { method: 'POST', body: { email, password } });
  tokenStore.set(tokens);
  return tokens;
}
```

- [ ] **Step 4: Add the no-refresh guard** — in `src/api/client.ts`, line 11, add `/auth/login` to the set (login is a credential exchange; a 401 means bad/unset password, so it must NOT trigger a refresh-retry or attach a stale bearer):

```ts
const NO_AUTH = new Set(['/auth/login', '/auth/otp/request', '/auth/otp/verify', '/auth/refresh']);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/api/auth.test.ts src/api/client.test.ts`
Expected: PASS (new login test passes; existing client tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/api/auth.ts src/api/client.ts src/api/auth.test.ts
git commit -m "feat(catreadmin): add /auth/login api wrapper + no-refresh guard"
```

---

### Task 2: AuthContext `loginWithPassword` + `finalizeSession`

**Files:**
- Modify: `src/auth/AuthContext.tsx`
- Test: `src/auth/AuthContext.test.tsx` (add cases)

**Interfaces:**
- Consumes: `login` (Task 1), existing `me as fetchMe`.
- Produces (on the `useAuth()` value):
  - `loginWithPassword(email: string, password: string): Promise<void>` — `apiLogin` then `fetchMe` → `status='authed'`.
  - `finalizeSession(): Promise<void>` — `fetchMe` → `status='authed'` (used by recovery after set-password, when tokens already exist from `otpVerify`).
  - `requestOtp` stays. `verifyOtp` stays for now (removed in Task 4).

- [ ] **Step 1: Write the failing tests** — append to `src/auth/AuthContext.test.tsx`. Add `userEvent` to imports (`import userEvent from '@testing-library/user-event';`):

```tsx
  it('loginWithPassword authenticates via /auth/login then /auth/me', async () => {
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    function L() {
      const { status, loginWithPassword } = useAuth();
      return <><button onClick={() => loginWithPassword('rohan@catre.io', 'pw')}>go</button><span>status:{status}</span></>;
    }
    render(<AuthProvider><L /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/status:anon/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('go'));
    await waitFor(() => expect(screen.getByText(/status:authed/)).toBeInTheDocument());
    expect(loginSpy).toHaveBeenCalledWith('rohan@catre.io', 'pw');
  });

  it('finalizeSession flips status to authed', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['support'] });
    function F() {
      const { status, finalizeSession } = useAuth();
      return <><button onClick={() => finalizeSession()}>fin</button><span>s:{status}</span></>;
    }
    render(<AuthProvider><F /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/s:anon/)).toBeInTheDocument());
    await userEvent.click(screen.getByText('fin'));
    await waitFor(() => expect(screen.getByText(/s:authed/)).toBeInTheDocument());
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/auth/AuthContext.test.tsx`
Expected: FAIL — `loginWithPassword` / `finalizeSession` do not exist on the context value.

- [ ] **Step 3: Implement** — in `src/auth/AuthContext.tsx`:

(a) Update the import on line 2 to add `login as apiLogin`:

```tsx
import { otpRequest, otpVerify, login as apiLogin, me as fetchMe, logout as apiLogout } from '../api/auth';
```

(b) Add to the `AuthValue` interface (alongside the existing members):

```tsx
  loginWithPassword: (email: string, password: string) => Promise<void>;
  finalizeSession: () => Promise<void>;
```

(c) Add these callbacks inside `AuthProvider`, after the existing `verifyOtp`:

```tsx
  const finalizeSession = useCallback(async () => {
    const m = await fetchMe();
    setUser(m); setStatus('authed');
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await finalizeSession();
  }, [finalizeSession]);
```

(d) Add them to the `value` object:

```tsx
    requestOtp: otpRequest,
    verifyOtp,
    loginWithPassword,
    finalizeSession,
    signOut,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/auth/AuthContext.test.tsx`
Expected: PASS (both new tests + existing rehydrate/anon tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthContext.tsx src/auth/AuthContext.test.tsx
git commit -m "feat(catreadmin): AuthContext loginWithPassword + finalizeSession"
```

---

### Task 3: AuthScreen (password login + recovery flow), wire into App, remove LoginScreen

**Files:**
- Create: `src/screens/AuthScreen.tsx`
- Test: `src/screens/AuthScreen.test.tsx`
- Modify: `src/App.tsx:3` (import) and `src/App.tsx:83` (render)
- Delete: `src/screens/LoginScreen.tsx`, `src/screens/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `loginWithPassword`, `finalizeSession` (Task 2); api `otpRequest`, `otpVerify`, `setPassword as apiSetPassword` (existing); `Btn`, `useToast` from `../components`; `Icon` from `../lib/icons`; `ApiError` from `../api/client`.
- Produces: `export function AuthScreen(): React.ReactElement` — the anonymous-state screen rendered by `App`.

- [ ] **Step 1: Confirm no other importers of LoginScreen**

Run: `grep -rn "LoginScreen" src --include=*.tsx`
Expected: only `src/App.tsx`, `src/screens/LoginScreen.tsx`, `src/screens/LoginScreen.test.tsx`. (If anything else appears, update it to `AuthScreen` in this task.)

- [ ] **Step 2: Write the failing tests** — create `src/screens/AuthScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from './AuthScreen';
import { AuthProvider } from '../auth/AuthContext';
import { ToastHost } from '../components';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';

function wrap() {
  return render(<ToastHost><AuthProvider><AuthScreen /></AuthProvider></ToastHost>);
}

describe('AuthScreen', () => {
  it('renders the password login by default and no demo logins', () => {
    wrap();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/demo logins/i)).not.toBeInTheDocument();
  });

  it('signs in with email + password', async () => {
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    wrap();
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith('rohan@catre.io', 'supersecret'));
  });

  it('shows an error when password login fails', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError(401, 'invalid_credentials', 'bad email or password', null));
    wrap();
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('Incorrect email or password')).toBeInTheDocument());
  });

  it('shows a not-registered message and stays on the email step', async () => {
    vi.spyOn(authApi, 'otpRequest').mockRejectedValue(new ApiError(404, 'not_registered', 'Email is not registered.', null));
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'nobody@x.com');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await waitFor(() => expect(screen.getByText("That email isn't registered. Contact your administrator.")).toBeInTheDocument());
    expect(screen.queryByLabelText(/code/i)).not.toBeInTheDocument();
  });

  it('completes first-time setup: email → code → set password → finalize', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    vi.spyOn(authApi, 'otpVerify').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    const setPwSpy = vi.spyOn(authApi, 'setPassword').mockResolvedValue();
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await userEvent.type(await screen.findByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    await userEvent.type(await screen.findByLabelText(/new password/i), 'supersecret');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(setPwSpy).toHaveBeenCalledWith('supersecret'));
  });

  it('keeps "Set password" disabled until ≥8 chars and confirm matches', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    vi.spyOn(authApi, 'otpVerify').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await userEvent.type(await screen.findByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    const btn = await screen.findByRole('button', { name: /set password/i });
    await userEvent.type(screen.getByLabelText(/new password/i), 'short');
    expect(btn).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/new password/i), 'enough'); // now 'shortenough' ≥8
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'shortenough');
    expect(btn).toBeEnabled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/screens/AuthScreen.test.tsx`
Expected: FAIL — `./AuthScreen` cannot be resolved.

- [ ] **Step 4: Create the component** — write `src/screens/AuthScreen.tsx`:

```tsx
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
```

- [ ] **Step 5: Wire App to AuthScreen** — in `src/App.tsx`:

Line 3, replace the import:
```tsx
import { AuthScreen } from './screens/AuthScreen';
```
Line 83, replace the anon render:
```tsx
  if (status === 'anon' || !role) return <AuthScreen />;
```

- [ ] **Step 6: Delete the old login screen**

```bash
git rm src/screens/LoginScreen.tsx src/screens/LoginScreen.test.tsx
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/screens/AuthScreen.test.tsx src/App.test.tsx`
Expected: PASS (all AuthScreen cases; App still renders).

- [ ] **Step 8: Commit**

```bash
git add src/screens/AuthScreen.tsx src/screens/AuthScreen.test.tsx src/App.tsx
git commit -m "feat(catreadmin): AuthScreen password login + recovery; drop OTP login screen"
```

---

### Task 4: Remove the obsolete `verifyOtp` from AuthContext + final verification

**Files:**
- Modify: `src/auth/AuthContext.tsx`

**Interfaces:**
- Removes `verifyOtp` from the `useAuth()` value (now unused — the recovery flow calls the api layer + `finalizeSession`).

- [ ] **Step 1: Confirm `verifyOtp` has no remaining consumers**

Run: `grep -rn "verifyOtp" src`
Expected: only `src/auth/AuthContext.tsx` (definition/interface). If any component still references it, that's a bug — stop and reconcile.

- [ ] **Step 2: Remove it** — in `src/auth/AuthContext.tsx`:
  - Delete the `verifyOtp: (identifier: string, code: string) => Promise<void>;` line from the `AuthValue` interface.
  - Delete the `const verifyOtp = useCallback(async (identifier, code) => { … }, []);` block.
  - Remove `verifyOtp,` from the `value` object.
  - Remove `otpVerify` from the import on line 2 (now unused):

```tsx
import { otpRequest, login as apiLogin, me as fetchMe, logout as apiLogout } from '../api/auth';
```

- [ ] **Step 3: Typecheck + full suite**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean (no unused `otpVerify`, no missing `verifyOtp` references); all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/auth/AuthContext.tsx
git commit -m "refactor(catreadmin): drop unused verifyOtp from AuthContext"
```

---

## Self-Review

**Spec coverage:**
- Password login (flow A) → Task 1 (`login`), Task 2 (`loginWithPassword`), Task 3 (`login` view). ✓
- Unified recovery (flow B: identify→verify→setpw) → Task 3 (three recovery views) using existing `otpRequest`/`otpVerify`/`setPassword`. ✓
- "If in database" 404 handling → Task 3 not-registered test + `not_registered` branch. ✓
- Mandatory set-password before entering app (no auto-authed on otp/verify) → Task 2 (`finalizeSession` separate from verify) + Task 4 (remove auto-authed `verifyOtp`); recovery finalizes only after `setPassword`. ✓
- Remove standalone OTP login + demo logins → Task 3 deletes `LoginScreen`; AuthScreen has no demo logins (test asserts). ✓
- Email only → recovery views collect email only. ✓
- 8-char min + confirm match → `pwValid` + disabled-button test. ✓
- Error copy verbatim → Global Constraints + Task 3 code/tests. ✓
- Login 401 no refresh-retry → Task 1 `NO_AUTH` guard. ✓
- Tests for each view/flow + AuthContext → Tasks 2 & 3. ✓

**Placeholder scan:** none — every code/test step contains full content.

**Type consistency:** `login(email,password):Promise<AuthTokens>` (Task 1) consumed as `apiLogin` (Task 2); `loginWithPassword`/`finalizeSession` defined (Task 2) and consumed (Task 3); `setPassword` imported as `apiSetPassword` (Task 3) matches existing export; `ApiError.code` used (exists). ✓
