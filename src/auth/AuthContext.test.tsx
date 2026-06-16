import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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
});
