import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoicesTab } from './InvoicesTab';
import { ToastCtx } from '../index';

vi.mock('../../api/hooks/useInvoices', () => ({ useInvoices: () => ({ isLoading: false, isError: false,
  hasNextPage: false, data: { pages: [{ data: [
    { id: 'INV-1', tenant_name: 'Greenwood', plan_name: 'Gold', amount: 50000, status: 'paid',
      issued: '2026-06-01', due: '2026-06-10', paid_on: '2026-06-05' },
  ], next_cursor: null }] } }) }));
vi.mock('../../api/hooks/useInvoiceMutations', () => ({
  useMarkInvoicePaid: () => ({ mutate: vi.fn(), isPending: false }),
  useRefundInvoice: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('InvoicesTab', () => {
  it('renders invoice rows and omits Download PDF', () => {
    render(<ToastCtx.Provider value={() => {}}><InvoicesTab /></ToastCtx.Provider>);
    expect(screen.getByText('INV-1')).toBeInTheDocument();
    expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
  });
});
