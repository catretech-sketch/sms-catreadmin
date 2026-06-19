import { useQuery } from '@tanstack/react-query';
import { getTicket } from '../tickets';
import { qk } from '../queryKeys';

export function useTicket(id: string) {
  return useQuery({ queryKey: qk.tickets.detail(id), queryFn: () => getTicket(id), enabled: !!id });
}
