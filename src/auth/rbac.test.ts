import { describe, it, expect } from 'vitest';
import { can, MATRIX } from './rbac';

describe('rbac', () => {
  it('owner can delete clients, admin cannot', () => {
    expect(can('owner', 'clients.delete')).toBe(true);
    expect(can('admin', 'clients.delete')).toBe(false);
  });
  it('admin can manage team and identity', () => {
    expect(can('admin', 'team.view')).toBe(true);
    expect(can('admin', 'team.manage')).toBe(true);
    expect(can('admin', 'identity.manage')).toBe(true);
    expect(can('sales', 'team.view')).toBe(false);
    expect(can('support', 'identity.view')).toBe(false);
  });
  it('all roles can view the dashboard', () => {
    for (const r of MATRIX['dashboard.view']) expect(can(r, 'dashboard.view')).toBe(true);
  });
  it('unknown action denies everyone', () => {
    expect(can('owner', 'does.not.exist')).toBe(false);
  });
});
