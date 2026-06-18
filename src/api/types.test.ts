import { describe, it, expect } from 'vitest';
import { CONTRACT_KEYS } from './types';

// Verifies CONTRACT_KEYS matches the canonical snake_case shape the backend exposes.
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
  DASHBOARD_OVERVIEW_KEYS: ['counts','mrr','trials_ending','churn_pct','months','mrr_series',
    'signup_series','plan_mix','usage_alerts','system_health','recent_activity'],
  REVENUE_REPORT_KEYS: ['arr','net_growth','gross_churn_pct','arpa','months','revenue_series',
    'revenue_by_plan','plan_performance'],
  AUDIT_LOG_KEYS: ['id','actor_id','actor_name','role','action','target','kind','time'],
  CLIENT_USAGE_KEYS: ['students_count','staff_count','storage_gb','limits','usage_series','usage_pct'],
};

describe('contract keys', () => {
  it('CONTRACT_KEYS matches the canonical snake_case shape', () => {
    expect(CONTRACT_KEYS).toEqual(EXPECTED);
  });
});
