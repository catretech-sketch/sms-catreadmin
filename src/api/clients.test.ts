import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listClients, getClient } from './clients';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => vi.restoreAllMocks());

describe('listClients', () => {
  it('passes filter/sort/cursor as query params and returns the list envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'c1' }], next_cursor: 'n2' }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await listClients({ status: 'active', sort: '-mrr', limit: 50 }, 'cur1');
    expect(out).toEqual({ data: [{ id: 'c1' }], next_cursor: 'n2' });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('status=active');
    expect(url).toContain('sort=-mrr');
    expect(url).toContain('cursor=cur1');
  });
});

describe('getClient', () => {
  it('GETs /clients/{id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getClient('c1');
    expect(out).toEqual({ id: 'c1' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/clients/c1');
  });
});
