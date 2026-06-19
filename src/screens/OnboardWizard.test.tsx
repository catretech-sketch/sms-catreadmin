import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardWizard } from './OnboardWizard';
import { NavCtx, ToastCtx } from '../components';

const mutate = vi.fn();
vi.mock('../api/hooks/useClientMutations', () => ({ useCreateClient: () => ({ mutate, isPending: false }) }));
vi.mock('../api/hooks/usePlans', () => ({
  usePlans: () => ({ data: { data: [
    { id: 'pl_gold', name: 'Gold', price: 50000, color: '#caa', description: 'Best value', limits: { students: 1000, staff: 80, storage_gb: 50 } },
  ] } }),
}));

function renderWizard(go = vi.fn()) {
  return render(
    <NavCtx.Provider value={{ route: { name: 'onboard', params: {} }, go }}>
      <ToastCtx.Provider value={() => {}}><OnboardWizard /></ToastCtx.Provider>
    </NavCtx.Provider>,
  );
}

describe('OnboardWizard', () => {
  it('blocks Continue on step 0 until a school name is entered', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('School name is required')).toBeInTheDocument();
  });
});
