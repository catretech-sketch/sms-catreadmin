import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPlan, updatePlan, publishPlan } from '../plans';
import { qk } from '../queryKeys';
import type { CreatePlanBody, UpdatePlanBody } from '../types';

const LIST = ['plans', 'list'] as const;

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: CreatePlanBody) => createPlan(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); } });
}
export function useUpdatePlan(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (b: UpdatePlanBody) => updatePlan(id, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); qc.invalidateQueries({ queryKey: qk.plans.detail(id) }); } });
}
export function usePublishPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (publish: boolean) => publishPlan(id, publish),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); qc.invalidateQueries({ queryKey: qk.plans.detail(id) }); } });
}
