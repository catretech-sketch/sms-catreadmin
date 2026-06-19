import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../tickets', () => ({
  patchTicket: vi.fn().mockResolvedValue({ id: 't1' }),
  postMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
}));

import { usePatchTicket } from './useTicketMutations';

beforeEach(() => vi.clearAllMocks());

const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe('usePatchTicket', () => {
  it('invalidates ticket detail + list on success', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => usePatchTicket('t1'), { wrapper: wrapper(qc) });
    result.current.mutate({ status: 'resolved' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tickets', 'detail', 't1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['tickets', 'list'] });
  });
});
