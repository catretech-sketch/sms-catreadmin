import { useQuery } from '@tanstack/react-query';
import { getOnboarding } from '../onboarding';
import { qk } from '../queryKeys';

export function useOnboarding() {
  return useQuery({ queryKey: qk.onboarding.list(), queryFn: getOnboarding });
}
