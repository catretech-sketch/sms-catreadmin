import { describe, it, expect } from 'vitest';
import { qk } from './queryKeys';

describe('qk', () => {
  it('builds stable keys', () => {
    expect(qk.dashboard()).toEqual(['dashboard', 'overview']);
    expect(qk.clients.detail('c1')).toEqual(['clients', 'detail', 'c1']);
    expect(qk.clients.usage('c1')).toEqual(['clients', 'usage', 'c1']);
    expect(qk.clients.activity('c1')).toEqual(['clients', 'activity', 'c1']);
  });

  it('includes list params so changing a filter is a distinct key', () => {
    expect(qk.clients.list({ status: 'active', sort: '-mrr' }))
      .toEqual(['clients', 'list', { status: 'active', sort: '-mrr' }]);
    expect(qk.reports.revenue({ months: 12 })).toEqual(['reports', 'revenue', { months: 12 }]);
  });
});
