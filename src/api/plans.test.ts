import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listPlans, createPlan, getPlan, updatePlan, publishPlan } from './plans';

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

const body = { name: 'X', band: '', tier: 'silver', pricing: 'flat' as const, price: 1000, per_student: 0,
  min_students: 0, period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 },
  features: [], feature_tiers: {}, visibility: 'draft' as const, audience: 'all' as const, offer: null };

describe('plan writes', () => {
  it('createPlan POSTs /plans', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await createPlan(body);
    const [u, i] = f.mock.calls[0]; expect(String(u)).toContain('/plans'); expect(i.method).toBe('POST');
    expect(JSON.parse(i.body)).toEqual(body);
  });
  it('getPlan GETs /plans/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await getPlan('pl_1'); expect(String(f.mock.calls[0][0])).toContain('/plans/pl_1');
  });
  it('updatePlan PATCHes /plans/{id}', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await updatePlan('pl_1', body); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/plans/pl_1'); expect(i.method).toBe('PATCH');
    expect(JSON.parse(i.body)).toEqual(body);
  });
  it('publishPlan POSTs /plans/{id}/publish with { visibility }', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await publishPlan('pl_1', true); const [u, i] = f.mock.calls[0];
    expect(String(u)).toContain('/plans/pl_1/publish'); expect(JSON.parse(i.body)).toEqual({ visibility: 'published' });
  });
  it('publishPlan with publish=false sends visibility draft', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'pl_1' } })); vi.stubGlobal('fetch', f);
    await publishPlan('pl_1', false);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ visibility: 'draft' });
  });
});
