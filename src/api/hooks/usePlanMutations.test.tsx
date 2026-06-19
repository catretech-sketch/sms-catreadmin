import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../plans', () => ({
  createPlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
  updatePlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
  publishPlan: vi.fn().mockResolvedValue({ id: 'pl_1' }),
}));
import { usePublishPlan } from './usePlanMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe('usePublishPlan', () => {
  it('invalidates plans list + detail on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => usePublishPlan('pl_1'), { wrapper: wrapper(qc) });
    result.current.mutate(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['plans', 'list'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['plans', 'detail', 'pl_1'] });
  });
});
