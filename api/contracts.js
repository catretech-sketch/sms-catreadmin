// Canonical Catre super-admin contract — the snake_case keys each DTO must expose.
// These mirror §3B of the backend API design. The future API response shape must match.

const TENANT_KEYS = [
  'id', 'name', 'slug', 'country', 'status', 'plan_id', 'plan_name', 'tier', 'mrr',
  'students_count', 'staff_count', 'storage_gb', 'limits', 'created', 'last_active_days',
  'trial_ends_days', 'contact', 'csm', 'health_score', 'gateway', 'usage_series',
];

const PLAN_KEYS = [
  'id', 'name', 'tier', 'pricing', 'price', 'per_student', 'min_students', 'period',
  'features', 'limits', 'visibility', 'audience', 'band', 'offer', 'color', 'description',
];

const TEAM_MEMBER_KEYS = ['id', 'name', 'email', 'role', 'status', 'last_login', 'joined'];

const INVOICE_KEYS = ['id', 'tenant_id', 'tenant_name', 'plan_name', 'amount', 'status', 'issued', 'due', 'paid_on'];

const SUPPORT_TICKET_KEYS = ['id', 'subject', 'tenant_id', 'tenant_name', 'status', 'priority', 'assignee', 'created', 'updated', 'messages_count'];

module.exports = { TENANT_KEYS, PLAN_KEYS, TEAM_MEMBER_KEYS, INVOICE_KEYS, SUPPORT_TICKET_KEYS };
