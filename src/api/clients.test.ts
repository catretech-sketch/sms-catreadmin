import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listClients, getClient, createClient, setClientStatus, changeClientPlan } from './clients';

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

describe('createClient', () => {
  it('POSTs /clients with the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c9' } }));
    vi.stubGlobal('fetch', fetchMock);
    const body = { name: 'New', slug: 'new', country: 'Mumbai, MH', size: '',
      admin_name: 'A', admin_email: 'a@b.c', admin_phone: '', plan_id: 'pl_gold', trial_days: 14 };
    const out = await createClient(body);
    expect(out).toEqual({ id: 'c9' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(body);
  });
});

describe('setClientStatus', () => {
  it('POSTs /clients/{id}/status with { action }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1', status: 'suspended' } }));
    vi.stubGlobal('fetch', fetchMock);
    await setClientStatus('c1', 'suspend');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients/c1/status');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ action: 'suspend' });
  });
});

describe('changeClientPlan', () => {
  it('POSTs /clients/{id}/change-plan with { plan_id }', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1', plan_id: 'pl_platinum' } }));
    vi.stubGlobal('fetch', fetchMock);
    await changeClientPlan('c1', 'pl_platinum');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/clients/c1/change-plan');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ plan_id: 'pl_platinum' });
  });
});
