export type Role = 'owner' | 'admin' | 'support' | 'sales' | 'finance' | 'analyst';
export type ClientStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type Tier = 'trial' | 'silver' | 'gold' | 'platinum' | 'metered' | 'exclusive';

export interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]> | null;
}

export interface Envelope<T> { data: T; }
export interface ListEnvelope<T> { data: T[]; next_cursor: string | null; }

export interface AuthTokens { access_token: string; refresh_token: string; }
export interface Me { id: string; tenant_id: string | null; roles: Role[]; }

// Runtime mirror of api/contracts.js — guarded by types.test.ts.
export const CONTRACT_KEYS: Record<string, string[]> = {
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
