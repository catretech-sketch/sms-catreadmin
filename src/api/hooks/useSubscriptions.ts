import { useInfiniteQuery } from '@tanstack/react-query';
import { listSubscriptions } from '../subscriptions';
import { qk } from '../queryKeys';

export function useSubscriptions() {
  return useInfiniteQuery({
    queryKey: qk.subscriptions.list(),
    queryFn: ({ pageParam }) => listSubscriptions(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
