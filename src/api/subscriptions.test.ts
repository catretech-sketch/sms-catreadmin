import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listSubscriptions } from './subscriptions';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('listSubscriptions', () => {
  it('GETs /subscriptions returning the envelope', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 's1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await listSubscriptions(); expect(out).toEqual({ data: [{ id: 's1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/subscriptions');
  });
});
