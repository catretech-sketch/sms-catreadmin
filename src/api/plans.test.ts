import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listPlans } from './plans';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
beforeEach(() => vi.restoreAllMocks());

describe('listPlans', () => {
  it('GETs /plans and returns the list envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'pl_gold' }], next_cursor: null }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await listPlans();
    expect(out).toEqual({ data: [{ id: 'pl_gold' }], next_cursor: null });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/plans');
  });
});
