import { describe, it, expect } from 'vitest';
import { can, MATRIX } from './rbac';

describe('rbac', () => {
  it('owner can delete clients, admin cannot', () => {
    expect(can('owner', 'clients.delete')).toBe(true);
    expect(can('admin', 'clients.delete')).toBe(false);
  });
  it('all roles can view the dashboard', () => {
    for (const r of MATRIX['dashboard.view']) expect(can(r, 'dashboard.view')).toBe(true);
  });
  it('unknown action denies everyone', () => {
    expect(can('owner', 'does.not.exist')).toBe(false);
  });
});
