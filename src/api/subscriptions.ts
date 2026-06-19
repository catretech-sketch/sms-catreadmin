import { listRequest } from './client';
import type { Subscription, ListEnvelope } from './types';

export function listSubscriptions(cursor?: string): Promise<ListEnvelope<Subscription>> {
  return listRequest<ListEnvelope<Subscription>>('/subscriptions', { query: { cursor } });
}
