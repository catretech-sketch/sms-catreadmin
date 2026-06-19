import { useQuery } from '@tanstack/react-query';
import { listPlans } from '../plans';
import { qk } from '../queryKeys';

export function usePlans() {
  return useQuery({ queryKey: qk.plans.list(), queryFn: listPlans });
}
