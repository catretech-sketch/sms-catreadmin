import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOnboarding, advanceOnboarding, patchChecklist } from './onboarding';
function jsonResponse(b: unknown, s = 200): Response { return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } }); }
beforeEach(() => vi.restoreAllMocks());
describe('onboarding api', () => {
  it('getOnboarding GETs /onboarding', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: [{ id: 'o1' }], next_cursor: null })); vi.stubGlobal('fetch', f);
    const out = await getOnboarding(); expect(out).toEqual({ data: [{ id: 'o1' }], next_cursor: null });
    expect(String(f.mock.calls[0][0])).toContain('/onboarding');
  });
  it('advanceOnboarding POSTs /onboarding/{id}/advance with { stage }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'o1', stage: 'trial' } })); vi.stubGlobal('fetch', f);
    await advanceOnboarding('o1', 'trial'); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/onboarding/o1/advance'); expect(i.method).toBe('POST'); expect(JSON.parse(i.body)).toEqual({ stage: 'trial' });
  });
  it('patchChecklist PATCHes /onboarding/{id}/checklist with { index, done }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'o1' } })); vi.stubGlobal('fetch', f);
    await patchChecklist('o1', 2, true); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/onboarding/o1/checklist'); expect(i.method).toBe('PATCH'); expect(JSON.parse(i.body)).toEqual({ index: 2, done: true });
  });
});
