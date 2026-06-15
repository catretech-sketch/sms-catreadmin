// Pure adapters: data.jsx mock objects -> canonical snake_case DTOs.
// No browser/React dependency, so they run under Node and in the future API client.

function toTenantDTO(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    country: c.country,
    status: c.status,
    plan_id: c.plan,
    plan_name: c.planName,
    tier: c.tier,
    mrr: c.mrr,
    students_count: c.students,
    staff_count: c.staff,
    storage_gb: c.storage,
    limits: c.limits,
    created: c.created,
    last_active_days: c.lastActiveDays,
    trial_ends_days: c.trialEnds,
    contact: c.contact,
    csm: c.csm,
    health_score: c.healthScore,
    gateway: c.gateway
      ? {
          provider: c.gateway.provider,
          method: c.gateway.method,
          mandate: c.gateway.mandate,
          vpa: c.gateway.vpa,
          card: c.gateway.card,
          bank: c.gateway.bank,
          max_amount: c.gateway.maxAmount,
          mandate_id: c.gateway.mandateId,
        }
      : null,
    usage_series: c.usageSeries,
  };
}

function toPlanDTO(p) {
  return {
    id: p.id,
    name: p.name,
    tier: p.tier,
    pricing: p.pricing,
    price: p.price,
    per_student: p.perStudent == null ? null : p.perStudent,
    min_students: p.minStudents == null ? null : p.minStudents,
    period: p.period,
    features: p.features,
    limits: p.limits,
    visibility: p.visibility,
    audience: p.audience,
    band: p.band,
    offer: p.offer,
    color: p.color,
    description: p.desc,
  };
}

function toTeamMemberDTO(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    last_login: u.lastLogin,
    joined: u.joined,
  };
}

function toInvoiceDTO(inv) {
  return {
    id: inv.id,
    tenant_id: inv.clientId,
    tenant_name: inv.client,
    plan_name: inv.plan,
    amount: inv.amount,
    status: inv.status,
    issued: inv.issued,
    due: inv.due,
    paid_on: inv.paidOn,
  };
}

function toTicketDTO(t) {
  return {
    id: t.id,
    subject: t.subject,
    tenant_id: t.clientId,
    tenant_name: t.client,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee,
    created: t.created,
    updated: t.updated,
    messages_count: t.messages,
  };
}

function toRoleDTO(r) {
  return {
    key: r.key,
    name: r.name,
    description: r.desc,
    color: r.color,
  };
}

function toPermissionDTO(key, meta, matrix) {
  return {
    key,
    label: meta.label,
    group: meta.group,
    roles: matrix[key] || [],
  };
}

module.exports = { toTenantDTO, toPlanDTO, toTeamMemberDTO, toInvoiceDTO, toTicketDTO, toRoleDTO, toPermissionDTO };
