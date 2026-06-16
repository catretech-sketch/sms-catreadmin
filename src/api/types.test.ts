import { describe, it, expect } from 'vitest';
import { CONTRACT_KEYS } from './types';

// Mirrors api/contracts.js — the canonical snake_case keys the backend exposes.
// This test fails if the two drift, catching contract regressions.
const EXPECTED: Record<string, string[]> = {
  TENANT_KEYS: ['id','name','slug','country','status','plan_id','plan_name','tier','mrr',
    'students_count','staff_count','storage_gb','limits','created','last_active_days',
    'trial_ends_days','contact','csm','health_score','gateway','usage_series'],
  PLAN_KEYS: ['id','name','tier','pricing','price','per_student','min_students','period',
    'features','limits','visibility','audience','band','offer','color','description'],
  TEAM_MEMBER_KEYS: ['id','name','email','phone','role','status','last_login','joined'],
  INVOICE_KEYS: ['id','tenant_id','tenant_name','plan_name','amount','status','issued','due','paid_on'],
  SUPPORT_TICKET_KEYS: ['id','subject','tenant_id','tenant_name','status','priority','assignee','created','updated','messages_count'],
  ROLE_KEYS: ['key','name','description','color'],
  PERMISSION_KEYS: ['key','label','group','roles'],
};

describe('contract keys', () => {
  it('match api/contracts.js exactly', () => {
    expect(CONTRACT_KEYS).toEqual(EXPECTED);
  });
});
