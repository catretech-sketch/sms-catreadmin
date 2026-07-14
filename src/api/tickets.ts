import { request, listRequest } from './client';
import type { Ticket, TicketDetail, TicketMessage, PatchTicketBody, ListEnvelope } from './types';
import type { TicketsListParams } from './queryKeys';

type RawMessage = {
  id: string;
  author?: string;
  who?: string;
  role: string;
  body?: string;
  text?: string;
  created?: string;
  when?: string;
};

type RawTicketDetail = Omit<TicketDetail, 'messages'> & { messages?: RawMessage[] };

function mapMessage(m: RawMessage): TicketMessage {
  return {
    id: m.id,
    author: m.author ?? m.who ?? 'Unknown',
    role: m.role === 'agent' ? 'agent' : 'client',
    body: m.body ?? m.text ?? '',
    created: m.created ?? m.when ?? '',
  };
}

export function listTickets(params: TicketsListParams, cursor?: string): Promise<ListEnvelope<Ticket>> {
  return listRequest<ListEnvelope<Ticket>>('/tickets', { query: { ...params, cursor } });
}

export async function getTicket(id: string): Promise<TicketDetail> {
  const raw = await request<RawTicketDetail>(`/tickets/${id}`);
  return { ...raw, messages: (raw.messages ?? []).map(mapMessage) };
}

export function patchTicket(id: string, body: PatchTicketBody): Promise<Ticket> {
  return request<Ticket>(`/tickets/${id}`, { method: 'PATCH', body });
}

/** Backend AddMessageRequest uses `text`; response is the full ticket detail — we only need success. */
export async function postMessage(id: string, body: string): Promise<void> {
  await request(`/tickets/${id}/messages`, { method: 'POST', body: { text: body } });
}
