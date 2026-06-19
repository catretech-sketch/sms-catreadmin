import { request, listRequest } from './client';
import type { Ticket, TicketDetail, TicketMessage, PatchTicketBody, ListEnvelope } from './types';
import type { TicketsListParams } from './queryKeys';

export function listTickets(params: TicketsListParams, cursor?: string): Promise<ListEnvelope<Ticket>> {
  return listRequest<ListEnvelope<Ticket>>('/tickets', { query: { ...params, cursor } });
}
export function getTicket(id: string): Promise<TicketDetail> {
  return request<TicketDetail>(`/tickets/${id}`);
}
export function patchTicket(id: string, body: PatchTicketBody): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`, { method: 'PATCH', body });
}
export function postMessage(id: string, body: string): Promise<TicketMessage> {
  return request<TicketMessage>(`/tickets/${id}/messages`, { method: 'POST', body: { body } });
}
