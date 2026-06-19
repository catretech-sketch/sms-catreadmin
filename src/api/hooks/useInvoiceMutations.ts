import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markInvoicePaid, refundInvoice } from '../invoices';

const LIST = ['invoices', 'list'] as const;

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markInvoicePaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); },
  });
}

export function useRefundInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refundInvoice(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: LIST }); },
  });
}
