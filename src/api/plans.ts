import { listRequest } from './client';
import type { Plan, ListEnvelope } from './types';

export function listPlans(): Promise<ListEnvelope<Plan>> {
  return listRequest<ListEnvelope<Plan>>('/plans');
}
