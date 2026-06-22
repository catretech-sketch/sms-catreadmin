import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStore } from './tokenStore';
import * as authApi from '../api/auth';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

function Probe() {
  const { status, role, can } = useAuth();
  return <div>status:{status} role:{role ?? '-'} del:{String(can('clients.delete'))}</div>;
}

describe('AuthContext', () => {
  it('starts anon when there is no refresh token', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/status:anon/)).toBeInTheDocument());
  });

  it('rehydrates to authed via /auth/me when a refresh token exists', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText(/status:authed role:owner del:true/)).toBeInTheDocument());
  });

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
});
