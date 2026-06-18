import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOverview } from './dashboard';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => vi.restoreAllMocks());

describe('getOverview', () => {
  it('GETs /dashboard/overview and unwraps data', async () => {
    const overview = { counts: { total: 3, active: 2, trial: 1, suspended: 0, cancelled: 0 }, mrr: 100 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: overview }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await getOverview();
    expect(out).toMatchObject({ mrr: 100 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/dashboard/overview');
  });
});
