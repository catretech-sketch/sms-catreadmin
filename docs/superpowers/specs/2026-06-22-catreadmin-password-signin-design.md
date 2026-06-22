# catreadmin password sign-in + unified recovery — design

Date: 2026-06-22
Status: approved (brainstorming) → ready for implementation plan
Scope: **sms-catreadmin frontend only.** No backend changes.

## Problem

The catreadmin sign-in screen today is **email-OTP only**: enter email → receive a
6-digit code → verify → in. The design prototype (`screen-login.jsx` in the "Catre
admin" Claude Design project) instead shows a **password login** — email + password,
a show/hide toggle, and a "Forgot?" link. The real app has drifted from the design and
has no password login, no way to create a password, and no forgot-password flow.

This spec brings the real sign-in in line with the design: **password is the primary
login**, and OTP is used only to **create** a password (first-time setup) or **reset**
it (forgot password).

## Backend (already supports everything — no changes)

All routes exist under `/v1/auth` (`sms-backend/.../AuthEndpoints.cs`):

| Step | Endpoint | Notes |
|---|---|---|
| Password login | `POST /auth/login {email, password}` | → `{access_token, refresh_token}`. **401 `invalid_credentials`** if password is wrong **OR not yet set** — the two are indistinguishable to the client. |
| Send OTP | `POST /auth/otp/request {identifier}` | Accepts email or phone. **404 `not_registered`** if the identifier is absent; otherwise `{sent:true}`. We use **email only**. |
| Verify OTP | `POST /auth/otp/verify {identifier, code}` | → `{access_token, refresh_token}` (authenticates the caller). **401 `invalid_code`** if wrong/expired. |
| Set password | `POST /auth/set-password {password}` | **Requires auth** (Bearer access token). → `204`. No server-side strength rule. |
| Session | `POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout` | unchanged |

Dev note: in `Development` the OTP code is logged to the backend console
(`[DEV OTP/email] …`); real SMTP delivers it otherwise. SMS (phone) is a console
stub, which is why recovery is **email only** for now.

## User flows

**A. Returning admin (has a password)**
1. Login screen → email + password → `POST /auth/login`.
2. Success → store tokens → `GET /auth/me` → enter app.
3. 401 → "Incorrect email or password" + nudge toward "Forgot password?".

**B. First-time admin (no password yet) OR forgot password** — one shared flow,
entered via the **"Forgot password?"** link:
1. `recover-identify`: enter email → `POST /auth/otp/request`.
   - 404 `not_registered` → "That email isn't registered. Contact your administrator."
   - `sent:true` → go to step 2.
2. `recover-verify`: enter 6-digit code → `POST /auth/otp/verify`.
   - 401 → "That code is incorrect or expired."
   - success → tokens stored (caller is now authenticated), go to step 3.
3. `recover-setpw`: new password + confirm → `POST /auth/set-password` → **finalize
   session** (`GET /auth/me` → `status = 'authed'`) → enter app.

First-time and forgot are identical because the client cannot detect "no password yet"
(step A's 401 is the same either way), and the backend mechanism is the same.

## Components / state

A single anonymous-state container, **`AuthScreen`**, replaces today's `LoginScreen`
as what `App` renders when `status === 'anon'`. It reuses the existing two-panel layout
and CSS (`login-card` / `login-brand` / `login-form`, `field`, `input-group`) and the
existing icons (`Icon.lock`, `Icon.eye`/`eyeOff`, `Icon.arrowRight`, `Icon.shield`).

View state machine (local `useState`): `'login' | 'recover-identify' | 'recover-verify'
| 'recover-setpw'`.

| View | Inputs | Action | Transitions |
|---|---|---|---|
| `login` | email, password (+show/hide) | `loginWithPassword` | success → app; "Forgot password?" → `recover-identify` |
| `recover-identify` | email | `otpRequest` | `sent` → `recover-verify`; "Back" → `login` |
| `recover-verify` | 6-digit code | `otpVerify` (stores tokens, **no** auto-authed) | success → `recover-setpw`; "Resend"/"Use another email" |
| `recover-setpw` | password, confirm | `setPassword` → finalize | success → app |

The standalone OTP-as-login screen and all demo-role quick logins are **removed**. OTP
now lives only inside recovery.

## Auth-state handling (the key nuance)

`otp/verify` returns real tokens, so naively the app would flip to `authed` right after
the code is verified — skipping the mandatory set-password step. To prevent that, the
recovery flow runs entirely while `status === 'anon'`:

- `recover-verify` calls the **api-layer** `otpVerify(identifier, code)` directly
  (which stores tokens via `tokenStore`) but does **not** touch AuthContext status.
- Only `recover-setpw`, after `setPassword` succeeds, calls an AuthContext
  **`finalizeSession()`** (`fetchMe()` → `setUser` → `setStatus('authed')`).

AuthContext changes:
- Add `loginWithPassword(email, password)`: calls api `login()`, then `fetchMe()`, then
  `setStatus('authed')`.
- Add `finalizeSession()`: `fetchMe()` → `authed` (used by recovery after set-password).
- Keep `requestOtp` (passthrough). The old `verifyOtp` that auto-authenticated is
  removed from the context surface; recovery uses the api layer + `finalizeSession()`.

api layer (`src/api/auth.ts`): add `login(email, password)` → `POST /auth/login`
returning `AuthTokens` and storing them via `tokenStore.set` (mirrors `otpVerify`).
`otpRequest`, `otpVerify`, `setPassword` already exist.

## Validation / error copy (defaults — adjustable)

- Password: **minimum 8 characters**; "confirm password" must match. Show/hide toggle.
  Submit disabled until both rules pass.
- Error copy as listed per step above. Errors surface inline (existing `err` pattern,
  `ApiError.message` for unexpected cases).

## Out of scope (noted follow-ups)

- Client-list "condition" column (e.g. per-client admin activation status).
- Client-detail "Connect" action to provision/invite a school admin.

Both are deferred to their own spec.

## Testing (TDD)

Following existing `src/**/*.test.tsx` patterns (Testing Library + jsdom, MSW-style or
mocked api fns):

- `AuthScreen`: renders `login` by default; "Forgot password?" advances through
  `recover-identify → recover-verify → recover-setpw`; "Back" returns to `login`.
- Validation: set-password submit disabled until ≥8 chars and confirm matches.
- Error states: login 401 message; otp/request 404 message; otp/verify 401 message.
- AuthContext: `loginWithPassword` success → `authed`; recovery does **not** flip to
  `authed` until `finalizeSession()` runs after set-password.
- api: `login()` posts to `/auth/login`, returns tokens, stores them.

## Acceptance

- Returning admin signs in with email + password.
- A seeded admin with no password set can click "Forgot password?", verify an emailed
  code, set a password, and land in the app — and thereafter sign in with that password.
- "Forgot password?" lets an existing admin reset and sign in.
- No standalone OTP login or demo logins remain.
- All new tests pass; `npm run typecheck` and `npm test` are green.
