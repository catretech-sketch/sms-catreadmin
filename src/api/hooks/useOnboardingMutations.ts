import { useMutation, useQueryClient } from '@tanstack/react-query';
import { advanceOnboarding, patchChecklist } from '../onboarding';
import type { OnboardingStage } from '../types';

const LIST = ['onboarding', 'list'] as const;

export function useAdvanceOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OnboardingStage }) =>
      advanceOnboarding(id, stage),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); },
  });
}

export function usePatchChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label, done }: { id: string; label: string; done: boolean }) =>
      patchChecklist(id, label, done),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); },
  });
}
