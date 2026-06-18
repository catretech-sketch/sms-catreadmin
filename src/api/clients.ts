import { request, listRequest } from './client';
import type { Client, ClientUsage, AuditLog, ListEnvelope } from './types';
import type { ClientsListParams } from './queryKeys';

export function listClients(params: ClientsListParams, cursor?: string): Promise<ListEnvelope<Client>> {
  return listRequest<ListEnvelope<Client>>('/clients', {
    query: { ...params, limit: params.limit ?? 50, cursor },
  });
}

export function getClient(id: string): Promise<Client> {
  return request<Client>(`/clients/${id}`);
}

export function getClientUsage(id: string): Promise<ClientUsage> {
  return request<ClientUsage>(`/clients/${id}/usage`);
}

export function getClientActivity(id: string, cursor?: string): Promise<ListEnvelope<AuditLog>> {
  return listRequest<ListEnvelope<AuditLog>>(`/clients/${id}/activity`, { query: { cursor } });
}
