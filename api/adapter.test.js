const assert = require('assert');
const C = require('./contracts');
const A = require('./adapter');

function sameKeys(obj, expected, label) {
  assert.deepStrictEqual(Object.keys(obj).sort(), [...expected].sort(), `${label} keys mismatch`);
}

// ── Tenant (from a CLIENTS entry) ──
const client = {
  id: 'tn_greenwood', name: 'Greenwood High', slug: 'greenwood', status: 'active',
  country: 'Mumbai, MH', plan: 'pl_gold', planName: 'Gold', tier: 'gold', mrr: 14999,
  students: 900, staff: 80, storage: 22.5, limits: { students: 1200, staff: 120, storage_gb: 50 },
  created: '2025-01-10', createdAgo: 500, lastActive: 'today', lastActiveDays: 0, trialEnds: null,
  contact: { name: 'Aarav Sharma', email: 'admin@greenwood.edu.in', phone: '+91 98765 43210' },
  csm: 'Priya Nair', healthScore: 88,
  gateway: { provider: 'Razorpay', method: 'upi_autopay', mandate: 'active', vpa: 'greenwood@okhdfcbank', card: null, bank: null, maxAmount: 20000, mandateId: 'raz_mnd_abcd1234' },
  usageSeries: [800, 810, 820],
};
const tenant = A.toTenantDTO(client);
sameKeys(tenant, C.TENANT_KEYS, 'Tenant');
assert.strictEqual(tenant.plan_name, 'Gold');
assert.strictEqual(tenant.health_score, 88);
assert.strictEqual(tenant.gateway.max_amount, 20000);
assert.strictEqual(tenant.usage_series.length, 3);

// ── Plan ──
const plan = {
  id: 'pl_gold', name: 'Gold', tier: 'gold', pricing: 'flat', price: 14999, perStudent: undefined,
  minStudents: undefined, period: 'month', features: ['sis.students'], limits: { students: 1200, staff: 120, storage_gb: 50 },
  visibility: 'published', audience: 'all', band: '300–1,200 students', offer: { label: 'Annual', pct: 16 },
  color: 'var(--amber)', desc: 'Full operations.',
};
const planDTO = A.toPlanDTO(plan);
sameKeys(planDTO, C.PLAN_KEYS, 'Plan');
assert.strictEqual(planDTO.per_student, null);
assert.strictEqual(planDTO.description, 'Full operations.');

// ── TeamMember ──
const member = { id: 'u1', name: 'Aanya Sharma', email: 'aanya@catre.io', role: 'owner', status: 'active', lastLogin: '2h ago', joined: '2023-01-12' };
const memberDTO = A.toTeamMemberDTO(member);
sameKeys(memberDTO, C.TEAM_MEMBER_KEYS, 'TeamMember');
assert.strictEqual(memberDTO.last_login, '2h ago');

// ── Invoice ──
const invoice = { id: 'INV-10480', client: 'Greenwood High', clientId: 'tn_greenwood', plan: 'Gold', amount: 14999, status: 'paid', issued: '2026-05-01', due: '2026-05-15', paidOn: '2026-05-03' };
const invoiceDTO = A.toInvoiceDTO(invoice);
sameKeys(invoiceDTO, C.INVOICE_KEYS, 'Invoice');
assert.strictEqual(invoiceDTO.tenant_id, 'tn_greenwood');
assert.strictEqual(invoiceDTO.paid_on, '2026-05-03');

// ── SupportTicket ──
const ticket = { id: 'TK-2040', subject: 'Import failing', client: 'Greenwood High', clientId: 'tn_greenwood', status: 'open', priority: 'high', assignee: 'Priya Nair', created: '2026-06-01', updated: '2026-06-02', messages: 4 };
const ticketDTO = A.toTicketDTO(ticket);
sameKeys(ticketDTO, C.SUPPORT_TICKET_KEYS, 'SupportTicket');
assert.strictEqual(ticketDTO.messages_count, 4);

console.log('OK: all canonical adapter contracts pass');
