import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRevenue, downloadClientsCsv } from './reports';
import { tokenStore } from '../auth/tokenStore';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => { localStorage.clear(); tokenStore.clear(); vi.restoreAllMocks(); });

describe('getRevenue', () => {
  it('GETs /reports/revenue and unwraps data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { arr: 5 } }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getRevenue({});
    expect(out).toMatchObject({ arr: 5 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/reports/revenue');
  });
});

describe('downloadClientsCsv', () => {
  it('requests the CSV blob with the bearer token attached', async () => {
    tokenStore.set({ access_token: 'a1', refresh_token: 'r1' });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('id,name\n1,x', { status: 200, headers: { 'Content-Type': 'text/csv' } }));
    vi.stubGlobal('fetch', fetchMock);
    const blob = await downloadClientsCsv();
    expect(blob).toBeInstanceOf(Blob);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/reports/clients.csv');
  });

  it('throws ApiError on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    await expect(downloadClientsCsv()).rejects.toMatchObject({ status: 403 });
  });
});
