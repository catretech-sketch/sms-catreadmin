import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlansTab } from './PlansTab';
import { ToastCtx } from '../index';

vi.mock('../../api/hooks/usePlans', () => ({ usePlans: () => ({ isLoading: false, isError: false, data: { data: [
  { id: 'pl_g', name: 'Gold', description: 'Best', price: 50000, per_student: 0, min_students: 0,
    pricing: 'flat', period: 'month', color: '#caa', band: 'Mid', visibility: 'published', audience: 'all',
    features: ['sis.students'], limits: { students: 1000, staff: 80, storage_gb: 50 }, offer: null, tier: 'gold' },
] } }) }));
vi.mock('../../api/hooks/usePlanMutations', () => ({
  useCreatePlan: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdatePlan: () => ({ mutate: vi.fn(), isPending: false }),
  usePublishPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('PlansTab', () => {
  it('renders plan cards and the New plan action for managers', () => {
    render(<ToastCtx.Provider value={() => {}}><PlansTab /></ToastCtx.Provider>);
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('New plan')).toBeInTheDocument();
  });
});
