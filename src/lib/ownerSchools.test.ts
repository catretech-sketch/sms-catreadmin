import { describe, it, expect } from 'vitest';
import { ownerEmailKey, schoolCountByOwner, schoolsForOwner, groupClientsByOwner } from './ownerSchools';
import type { Client } from '../api/types';

const c = (partial: Partial<Client> & Pick<Client, 'id' | 'name' | 'contact_email'>): Client => ({
  slug: '', country: '', status: 'active', plan_id: '', plan_name: '', tier: 'gold', mrr: 0,
  students_count: 0, staff_count: 0, storage_gb: 0, limits: {}, created: '', last_active_days: 0,
  trial_ends_days: null, contact: '', csm: '', health_score: 0, gateway: '', usage_series: [],
  contact_name: null, contact_phone: null, address: null,
  ...partial,
});

describe('ownerSchools', () => {
  it('normalizes owner email', () => {
    expect(ownerEmailKey('  A@B.C ')).toBe('a@b.c');
    expect(ownerEmailKey('')).toBeNull();
    expect(ownerEmailKey(null)).toBeNull();
  });

  it('counts schools per owner email', () => {
    const map = schoolCountByOwner([
      c({ id: '1', name: 'A', contact_email: 'o@x.com' }),
      c({ id: '2', name: 'B', contact_email: 'O@X.com' }),
      c({ id: '3', name: 'C', contact_email: 'other@x.com' }),
    ]);
    expect(map.get('o@x.com')).toBe(2);
    expect(map.get('other@x.com')).toBe(1);
  });

  it('lists sibling schools with current first', () => {
    const list = schoolsForOwner([
      c({ id: '1', name: 'A', contact_email: 'o@x.com' }),
      c({ id: '2', name: 'B', contact_email: 'o@x.com' }),
    ], 'o@x.com', '2');
    expect(list.map(s => s.id)).toEqual(['2', '1']);
  });

  it('groups multiple schools into one owner row', () => {
    const groups = groupClientsByOwner([
      c({ id: '1', name: 'itm', contact_email: 'vitmadmin@yopmail.com', contact_name: 'Akahs Dubey', mrr: 5000 }),
      c({ id: '2', name: 'ssc', contact_email: 'vitmadmin@yopmail.com', contact_name: 'vitmadmin', mrr: 1000 }),
      c({ id: '3', name: 'solo', contact_email: null, contact_name: 'Other', mrr: 100 }),
    ]);
    expect(groups).toHaveLength(2);
    const portfolio = groups.find(g => g.email === 'vitmadmin@yopmail.com')!;
    expect(portfolio.schools).toHaveLength(2);
    expect(portfolio.ownerName).toBe('Akahs Dubey');
    expect(portfolio.mrr).toBe(6000);
  });
});
