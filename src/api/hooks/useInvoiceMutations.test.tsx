import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('../invoices', () => ({
  markInvoicePaid: vi.fn().mockResolvedValue({ id: 'in1', status: 'paid' }),
  refundInvoice: vi.fn().mockResolvedValue({ id: 'in1', status: 'open' }),
}));
import { useMarkInvoicePaid } from './useInvoiceMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
describe('useMarkInvoicePaid', () => {
  it('invalidates invoices list on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper: wrapper(qc) });
    result.current.mutate('in1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['invoices', 'list'] });
  });
});
