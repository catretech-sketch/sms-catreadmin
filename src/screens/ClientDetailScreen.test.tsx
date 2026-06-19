import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientDetailScreen } from './ClientDetailScreen';
import { NavCtx, ToastCtx } from '../components';

vi.mock('../api/hooks/useClient', () => ({
  useClient: () => ({ isLoading: false, isError: false,
    data: { id: 'c1', name: 'Greenwood High', status: 'active', plan_name: 'Gold', mrr: 50000,
      tier: 'gold', country: 'Mumbai, MH', contact: 'a@b.c', csm: 'Ravi', health_score: 88, plan_id: 'pl_gold' } }),
}));
vi.mock('../api/hooks/useClients', () => ({
  useClientUsage: () => ({ isLoading: false, isError: false, data: { students_count: 400, staff_count: 30, storage_gb: 12, limits: { students: 1000 }, usage_series: [1,2], usage_pct: 40 } }),
  useClientActivity: () => ({ isLoading: false, isError: false, data: { data: [], next_cursor: null } }),
}));
vi.mock('../api/hooks/useClientMutations', () => ({
  useSetClientStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useChangeClientPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../api/hooks/usePlans', () => ({ usePlans: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('ClientDetailScreen', () => {
  it('renders the client name from detail data', () => {
    render(<NavCtx.Provider value={{ route: { name: 'client', params: { id: 'c1' } }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><ClientDetailScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Greenwood High')).toBeInTheDocument();
  });

  it('renders client lifecycle actions for an active client', () => {
    render(<NavCtx.Provider value={{ route: { name: 'client', params: { id: 'c1' } }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><ClientDetailScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Suspend')).toBeInTheDocument();
  });
});
