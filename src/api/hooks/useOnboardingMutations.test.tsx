import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('../onboarding', () => ({
  advanceOnboarding: vi.fn().mockResolvedValue({ id: 'o1', stage: 'trial' }),
  patchChecklist: vi.fn().mockResolvedValue({ id: 'o1' }),
}));
import { useAdvanceOnboarding } from './useOnboardingMutations';
beforeEach(() => vi.clearAllMocks());
const wrapper = (qc: QueryClient) => ({ children }: { children: React.ReactNode }) =>
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
describe('useAdvanceOnboarding', () => {
  it('invalidates the onboarding list on success', async () => {
    const qc = new QueryClient(); const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useAdvanceOnboarding(), { wrapper: wrapper(qc) });
    result.current.mutate({ id: 'o1', stage: 'trial' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['onboarding', 'list'] });
  });
});
