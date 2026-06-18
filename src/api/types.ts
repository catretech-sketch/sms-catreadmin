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
  DASHBOARD_OVERVIEW_KEYS: ['counts','mrr','trials_ending','churn_pct','months','mrr_series',
    'signup_series','plan_mix','usage_alerts','system_health','recent_activity'],
  REVENUE_REPORT_KEYS: ['arr','net_growth','gross_churn_pct','arpa','months','revenue_series',
    'revenue_by_plan','plan_performance'],
  AUDIT_LOG_KEYS: ['id','actor_id','actor_name','role','action','target','kind','time'],
  CLIENT_USAGE_KEYS: ['students_count','staff_count','storage_gb','limits','usage_series','usage_pct'],
};

export type AuditKind = 'suspend' | 'refund' | 'trial' | 'impersonate' | 'plan' | 'team' | 'invoice' | 'activate';

export interface AuditLog {
  id: string; actor_id: string; actor_name: string; role: string;
  action: string; target: string; kind: AuditKind; time: string;
}

export interface ChartPoint { label: string; value: number; color: string; }

export interface SystemHealthItem {
  name: string; status: 'operational' | 'degraded' | 'down'; latency: string; uptime: string;
}

export interface UsageAlert {
  tenant_id: string; name: string; usage_pct: number; status: ClientStatus; csm: string;
}

export interface DashboardOverview {
  counts: { total: number; active: number; trial: number; suspended: number; cancelled: number };
  mrr: number; trials_ending: number; churn_pct: number;
  months: string[]; mrr_series: number[]; signup_series: number[];
  plan_mix: ChartPoint[]; usage_alerts: UsageAlert[];
  system_health: SystemHealthItem[]; recent_activity: AuditLog[];
}

export interface PlanPerformance { plan_name: string; clients: number; mrr: number; share_pct: number; }

export interface RevenueReport {
  arr: number; net_growth: number; gross_churn_pct: number; arpa: number;
  months: string[]; revenue_series: number[];
  revenue_by_plan: ChartPoint[]; plan_performance: PlanPerformance[];
}

export interface ClientUsage {
  students_count: number; staff_count: number; storage_gb: number;
  limits: Record<string, number>; usage_series: number[]; usage_pct: number;
}
