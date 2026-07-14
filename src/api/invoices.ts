import { request, listRequest } from './client';
import { config } from '../config';
import { tokenStore } from '../auth/tokenStore';
import { ApiError } from './ApiError';
import type { Invoice, ListEnvelope, ErrorBody } from './types';
import type { InvoicesListParams } from './queryKeys';

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

export function sendInvoiceEmail(id: string): Promise<void> {
  return request<void>(`/invoices/${id}/send`, { method: 'POST' });
}

/** Download Catre-branded invoice PDF for admin. */
export async function downloadInvoicePdf(id: string): Promise<void> {
  const url = `${config.apiBaseUrl}/invoices/${id}/pdf`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ''}` },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const json = await res.json() as { error?: ErrorBody };
      message = json.error?.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, 'internal_error', message, null);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
  const fileName = match ? decodeURIComponent(match[1].replace(/"/g, '')) : `Catre-Invoice-${id}.pdf`;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
