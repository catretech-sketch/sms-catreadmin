import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTickets, getTicket, patchTicket, postMessage } from './tickets';
function jr(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('tickets api', () => {
  it('listTickets GETs /tickets with cursor', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: [{ id: 't1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    await listTickets({}, 'c1'); const u = String(f.mock.calls[0][0]); expect(u).toContain('/tickets'); expect(u).toContain('cursor=c1');
  });
  it('getTicket GETs /tickets/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 't1', messages: [] } })); vi.stubGlobal('fetch', f);
    await getTicket('t1'); expect(String(f.mock.calls[0][0])).toContain('/tickets/t1');
  });
  it('patchTicket PATCHes /tickets/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 't1' } })); vi.stubGlobal('fetch', f);
    await patchTicket('t1', { status: 'resolved' }); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/tickets/t1'); expect(i.method).toBe('PATCH'); expect(JSON.parse(i.body)).toEqual({ status: 'resolved' });
  });
  it('postMessage POSTs /tickets/{id}/messages with { text }', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: { id: 't1', messages: [] } }, 201)); vi.stubGlobal('fetch', f);
    await postMessage('t1', 'hello'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/tickets/t1/messages'); expect(i.method).toBe('POST'); expect(JSON.parse(i.body)).toEqual({ text: 'hello' });
  });
});
