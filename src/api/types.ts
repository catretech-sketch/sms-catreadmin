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
  SUBSCRIPTION_KEYS: ['id','tenant_id','tenant_name','plan_id','plan_name','tier','status',
    'current_period_start','current_period_end','next_charge'],
  SUPPORT_TICKET_KEYS: ['id','subject','tenant_id','tenant_name','status','priority','assignee','created','updated','messages_count'],
  ROLE_KEYS: ['key','name','description','color'],
  PERMISSION_KEYS: ['key','label','group','roles'],
  DASHBOARD_OVERVIEW_KEYS: ['counts','mrr','trials_ending','churn_pct','months','mrr_series',
    'signup_series','plan_mix','usage_alerts','system_health','recent_activity'],
  REVENUE_REPORT_KEYS: ['arr','net_growth','gross_churn_pct','arpa','months','revenue_series',
    'revenue_by_plan','plan_performance'],
  AUDIT_LOG_KEYS: ['id','actor_id','actor_name','role','action','target','kind','time'],
  CLIENT_USAGE_KEYS: ['students_count','staff_count','storage_gb','limits','usage_series','usage_pct'],
  ONBOARDING_KEYS: ['id','name','value','owner','age','stage','checklist'],
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

export interface Client {
  id: string; name: string; slug: string; country: string; status: ClientStatus;
  plan_id: string; plan_name: string; tier: Tier; mrr: number;
  students_count: number; staff_count: number; storage_gb: number;
  limits: Record<string, number>; created: string; last_active_days: number;
  trial_ends_days: number | null; contact: string; csm: string;
  health_score: number; gateway: string; usage_series: number[];
}

export type ClientStatusAction = 'start_trial' | 'activate' | 'suspend' | 'reinstate' | 'cancel';

export interface Plan {
  id: string; name: string; tier: Tier; pricing: string; price: number;
  per_student: number; min_students: number; period: string;
  features: string[]; limits: Record<string, number>;
  visibility: string; audience: string; band: string; offer: { label: string; pct: number } | null;
  color: string; description: string;
}

export interface CreateClientBody {
  name: string; slug: string; country: string; size: string;
  admin_name: string; admin_email: string; admin_phone: string;
  plan_id: string; trial_days: number;
}

export type InvoiceStatus = 'paid' | 'open' | 'past_due';

export interface Invoice {
  id: string; tenant_id: string; tenant_name: string; plan_name: string;
  amount: number; status: InvoiceStatus; issued: string; due: string; paid_on: string | null;
}

export interface Subscription {
  id: string; tenant_id: string; tenant_name: string; plan_id: string; plan_name: string;
  tier: Tier; status: ClientStatus;
  current_period_start: string; current_period_end: string; next_charge: number | null;
}

export interface CreatePlanBody {
  name: string; band: string; pricing: 'flat' | 'per_student';
  price: number; per_student: number; min_students: number; period: string;
  limits: { students: number; staff: number; storage_gb: number };
  features: string[]; feature_tiers: Record<string, string>;
  visibility: 'published' | 'draft'; audience: 'all' | 'new' | 'exclusive';
  offer: { label: string; pct: number } | null;
}
export type UpdatePlanBody = CreatePlanBody;

export type OnboardingStage = 'lead' | 'trial' | 'onboarding' | 'active';
export interface ChecklistItem { label: string; done: boolean; }
export interface OnboardingCard {
  id: string; name: string; value: number; owner: string; age: number;
  stage: OnboardingStage; checklist: ChecklistItem[];
}
