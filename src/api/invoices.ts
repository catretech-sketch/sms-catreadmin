import { request, listRequest } from './client';
import type { Invoice, ListEnvelope } from './types';

export interface InvoicesListParams { status?: string; limit?: number; }

export function listInvoices(params: InvoicesListParams, cursor?: string): Promise<ListEnvelope<Invoice>> {
  return listRequest<ListEnvelope<Invoice>>('/invoices', { query: { ...params, limit: params.limit ?? 50, cursor } });
}
export function getInvoice(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}`);
}
export function markInvoicePaid(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}/mark-paid`, { method: 'POST' });
}
export function refundInvoice(id: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${id}/refund`, { method: 'POST' });
}
