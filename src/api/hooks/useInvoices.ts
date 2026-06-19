import { useInfiniteQuery } from '@tanstack/react-query';
import { listInvoices } from '../invoices';
import type { InvoicesListParams } from '../queryKeys';
import { qk } from '../queryKeys';

export function useInvoices(params: InvoicesListParams) {
  return useInfiniteQuery({
    queryKey: qk.invoices.list(params),
    queryFn: ({ pageParam }) => listInvoices(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
