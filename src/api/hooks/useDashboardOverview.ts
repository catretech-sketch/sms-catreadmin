import { useQuery } from '@tanstack/react-query';
import { getOverview } from '../dashboard';
import { qk } from '../queryKeys';

export function useDashboardOverview() {
  return useQuery({ queryKey: qk.dashboard(), queryFn: getOverview });
}
