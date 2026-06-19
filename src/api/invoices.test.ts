import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listInvoices, getInvoice, markInvoicePaid, refundInvoice } from './invoices';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('invoices api', () => {
  it('listInvoices passes status + cursor', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'in1' }], next_cursor: 'n' })); vi.stubGlobal('fetch', f);
    await listInvoices({ status: 'past_due' }, 'c1'); const u = String(f.mock.calls[0][0]);
    expect(u).toContain('/invoices'); expect(u).toContain('status=past_due'); expect(u).toContain('cursor=c1');
  });
  it('getInvoice GETs /invoices/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1' } })); vi.stubGlobal('fetch', f);
    await getInvoice('in1'); expect(String(f.mock.calls[0][0])).toContain('/invoices/in1');
  });
  it('markInvoicePaid POSTs /invoices/{id}/mark-paid', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1', status: 'paid' } })); vi.stubGlobal('fetch', f);
    await markInvoicePaid('in1'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/invoices/in1/mark-paid'); expect(i.method).toBe('POST');
  });
  it('refundInvoice POSTs /invoices/{id}/refund', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'in1', status: 'open' } })); vi.stubGlobal('fetch', f);
    await refundInvoice('in1'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/invoices/in1/refund'); expect(i.method).toBe('POST');
  });
});
