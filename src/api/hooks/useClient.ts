import { useQuery } from '@tanstack/react-query';
import { getClient } from '../clients';
import { qk } from '../queryKeys';

export function useClient(id: string) {
  return useQuery({ queryKey: qk.clients.detail(id), queryFn: () => getClient(id), enabled: !!id });
}
