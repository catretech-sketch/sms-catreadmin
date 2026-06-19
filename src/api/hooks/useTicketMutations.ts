import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchTicket, postMessage } from '../tickets';
import { qk } from '../queryKeys';
import type { PatchTicketBody } from '../types';

const LIST = ['tickets', 'list'] as const;

export function usePatchTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchTicketBody) => patchTicket(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tickets.detail(id) });
      qc.invalidateQueries({ queryKey: LIST });
    },
  });
}

export function usePostMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => postMessage(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tickets.detail(id) });
      qc.invalidateQueries({ queryKey: LIST });
    },
  });
}
