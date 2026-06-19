import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient, setClientStatus, changeClientPlan } from '../clients';
import { qk } from '../queryKeys';
import type { CreateClientBody, ClientStatusAction } from '../types';

const LIST_KEY = ['clients', 'list'] as const;

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClientBody) => createClient(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST_KEY }); },
  });
}

export function useSetClientStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: ClientStatusAction) => setClientStatus(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.detail(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useChangeClientPlan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan_id: string) => changeClientPlan(id, plan_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.detail(id) });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}
