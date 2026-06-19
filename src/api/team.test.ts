import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTeam } from './team';
function jr(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('listTeam', () => {
  it('GETs /team', async () => {
    const f = vi.fn().mockResolvedValue(jr({ data: [{ id: 'u1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await listTeam(); expect(out).toEqual({ data: [{ id: 'u1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/team');
  });
});
