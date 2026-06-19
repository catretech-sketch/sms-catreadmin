import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../clients', () => ({
  createClient: vi.fn().mockResolvedValue({ id: 'c9' }),
  setClientStatus: vi.fn().mockResolvedValue({ id: 'c1', status: 'suspended' }),
  changeClientPlan: vi.fn().mockResolvedValue({ id: 'c1', plan_id: 'pl_platinum' }),
}));

import { useSetClientStatus } from './useClientMutations';

beforeEach(() => vi.clearAllMocks());

function wrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useSetClientStatus', () => {
  it('invalidates the client detail and list keys on success', async () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useSetClientStatus('c1'), { wrapper: wrapper(qc) });
    result.current.mutate('suspend');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['clients', 'detail', 'c1'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['clients', 'list'] });
  });
});
