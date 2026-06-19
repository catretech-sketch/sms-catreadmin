import { useInfiniteQuery } from '@tanstack/react-query';
import { listTickets } from '../tickets';
import { qk, type TicketsListParams } from '../queryKeys';

export function useTickets(params: TicketsListParams) {
  return useInfiniteQuery({
    queryKey: qk.tickets.list(params),
    queryFn: ({ pageParam }) => listTickets(params, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
