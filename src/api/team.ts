import { listRequest } from './client';
import type { TeamMember, ListEnvelope } from './types';

export function listTeam(): Promise<ListEnvelope<TeamMember>> {
  return listRequest<ListEnvelope<TeamMember>>('/team');
}
