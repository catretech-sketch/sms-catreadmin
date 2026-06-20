import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { ToastHost } from './components';
import { tokenStore } from './auth/tokenStore';
import * as authApi from './api/auth';

beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastHost><AuthProvider><App /></AuthProvider></ToastHost>
    </QueryClientProvider>
  );
}

describe('App shell', () => {
  it('shows the login screen when anon', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument());
  });

  it('renders nav gated by role and no role switcher when authed', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['analyst'] });
    wrap();
    // analyst sees Dashboard + Reports, never Team
    const nav = within(await screen.findByRole('navigation'));
    expect(nav.getByText('Dashboard')).toBeInTheDocument();
    expect(nav.getByText('Reports')).toBeInTheDocument();
    expect(nav.queryByText('Team')).not.toBeInTheDocument();
    // role switcher is gone
    expect(screen.queryByTitle(/switch role/i)).not.toBeInTheDocument();
  });

  it('gives Admin the full operational nav except Team/Settings', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['admin'] });
    wrap();
    const nav = within(await screen.findByRole('navigation'));
    // present for admin
    for (const label of ['Dashboard', 'Onboarding', 'Plans', 'Billing', 'Reports', 'Support', 'Identity & Access']) {
      expect(nav.getByText(label)).toBeInTheDocument();
    }
    // owner-only — hidden from admin
    expect(nav.queryByText('Team')).not.toBeInTheDocument();
    expect(nav.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('limits Sales to revenue/clients nav — no Support, Identity, Team, or Settings', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['sales'] });
    wrap();
    const nav = within(await screen.findByRole('navigation'));
    // present for sales
    for (const label of ['Dashboard', 'Onboarding', 'Plans', 'Billing', 'Reports']) {
      expect(nav.getByText(label)).toBeInTheDocument();
    }
    // not permitted for sales
    for (const label of ['Support', 'Identity & Access', 'Team', 'Settings']) {
      expect(nav.queryByText(label)).not.toBeInTheDocument();
    }
  });
});
