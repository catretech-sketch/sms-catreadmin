import { useQuery } from '@tanstack/react-query';
import { listTeam } from '../team';
import { qk } from '../queryKeys';

export function useTeam() {
  return useQuery({ queryKey: qk.team.list(), queryFn: listTeam });
}
