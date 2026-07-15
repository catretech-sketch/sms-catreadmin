import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveUpgradeRequest,
  listUpgradeRequests,
  rejectUpgradeRequest,
} from '../upgradeRequests';
import { qk } from '../queryKeys';

export function useUpgradeRequests(status?: string) {
  return useQuery({
    queryKey: qk.upgradeRequests.list(status),
    queryFn: async () => (await listUpgradeRequests(status)).data,
  });
}

export function useApproveUpgradeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveUpgradeRequest(id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['upgradeRequests'] }),
        qc.invalidateQueries({ queryKey: ['clients'] }),
        qc.invalidateQueries({ queryKey: ['subscriptions'] }),
        qc.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
    },
  });
}

export function useRejectUpgradeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => rejectUpgradeRequest(id, notes),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['upgradeRequests'] });
    },
  });
}
