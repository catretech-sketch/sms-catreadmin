import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClientActions } from './ClientActions';
import { ToastCtx } from './index';
import type { Client } from '../api/types';

vi.mock('../api/hooks/useClientMutations', () => ({
  useSetClientStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeClientPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../api/hooks/usePlans', () => ({ usePlans: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

const client = { id: 'c1', status: 'active', plan_id: 'pl_gold', name: 'Greenwood' } as Client;

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastCtx.Provider value={() => {}}>{ui}</ToastCtx.Provider>);
}

describe('ClientActions', () => {
  it('shows the active-status action set (change plan, suspend, cancel) and hides delete', () => {
    renderWithToast(<ClientActions client={client} />);
    expect(screen.getByText('Change plan')).toBeInTheDocument();
    expect(screen.getByText('Suspend')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Impersonate')).not.toBeInTheDocument();
  });

  it('hides actions the role cannot perform', async () => {
    vi.resetModules();
    vi.doMock('../auth/AuthContext', () => ({ useAuth: () => ({ can: (p: string) => p !== 'clients.suspend' }) }));
    const { ClientActions: Gated } = await import('./ClientActions');
    renderWithToast(<Gated client={client} />);
    expect(screen.queryByText('Suspend')).not.toBeInTheDocument();
    expect(screen.getByText('Change plan')).toBeInTheDocument();
  });
});
