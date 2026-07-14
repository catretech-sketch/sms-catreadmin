import type { Role } from '../api/types';

export interface RoleMeta { key: Role; name: string; color: string; desc: string; }

export const ROLES: Record<Role, RoleMeta> = {
  owner:   { key: 'owner',   name: 'Owner',   color: 'var(--accent)', desc: 'Full access — team, settings, lifecycle, billing.' },
  admin:   { key: 'admin',   name: 'Admin',   color: 'var(--blue)',   desc: 'Client lifecycle, billing, support, onboarding.' },
  support: { key: 'support', name: 'Support', color: 'var(--green)',  desc: 'View clients, read-only impersonate, full tickets.' },
  sales:   { key: 'sales',   name: 'Sales',   color: 'var(--violet)', desc: 'Start trials, run onboarding, billing read-only.' },
  finance: { key: 'finance', name: 'Finance', color: 'var(--amber)',  desc: 'Plans, subscriptions, invoices, refunds.' },
  analyst: { key: 'analyst', name: 'Analyst', color: 'var(--slate)',  desc: 'Dashboards & reports only.' },
};

export const MATRIX: Record<string, Role[]> = {
  'dashboard.view':        ['owner','admin','support','sales','finance','analyst'],
  'clients.view':          ['owner','admin','support','sales','finance','analyst'],
  'clients.start_trial':   ['owner','admin','sales'],
  'clients.activate':      ['owner','admin','finance'],
  'clients.suspend':       ['owner','admin'],
  'clients.reinstate':     ['owner','admin','finance'],
  'clients.cancel':        ['owner','admin'],
  'clients.change_plan':   ['owner','admin','sales','finance'],
  'clients.delete':        ['owner'],
  'clients.impersonate':   ['owner','admin','support'],
  'clients.manage_people': ['owner','admin'],
  'usage.view':            ['owner','admin','support','sales','finance','analyst'],
  'onboarding.view':       ['owner','admin','support','sales'],
  'onboarding.manage':     ['owner','admin','sales'],
  'plans.view':            ['owner','admin','sales','finance'],
  'plans.manage':          ['owner','admin','finance'],
  'billing.view':          ['owner','admin','sales','finance'],
  'billing.manage_invoice':['owner','admin','finance'],
  'billing.refund':        ['owner','finance'],
  'support.view':          ['owner','admin','support'],
  'support.manage':        ['owner','admin','support'],
  'team.view':             ['owner','admin'],
  'team.manage':           ['owner','admin'],
  'settings.view':         ['owner'],
  'settings.manage':       ['owner'],
  'reports.view':          ['owner','admin','support','sales','finance','analyst'],
  'identity.view':         ['owner','admin'],
  'identity.manage':       ['owner','admin'],
};

export interface PermMeta { label: string; group: string; }
export const PERMISSION_CATALOG: Record<string, PermMeta> = {
  'dashboard.view':         { label: 'View dashboard',           group: 'Overview' },
  'clients.view':           { label: 'View clients',             group: 'Clients' },
  'clients.start_trial':    { label: 'Start trial',              group: 'Clients' },
  'clients.activate':       { label: 'Activate client',          group: 'Clients' },
  'clients.suspend':        { label: 'Suspend client',           group: 'Clients' },
  'clients.reinstate':      { label: 'Reinstate client',         group: 'Clients' },
  'clients.cancel':         { label: 'Cancel client',            group: 'Clients' },
  'clients.change_plan':    { label: 'Change plan',              group: 'Clients' },
  'clients.delete':         { label: 'Delete client',            group: 'Clients' },
  'clients.impersonate':    { label: 'Impersonate client',       group: 'Clients' },
  'clients.manage_people':  { label: 'Manage school people',     group: 'Clients' },
  'usage.view':             { label: 'View usage',               group: 'Clients' },
  'onboarding.view':        { label: 'View onboarding',          group: 'Onboarding' },
  'onboarding.manage':      { label: 'Manage onboarding',        group: 'Onboarding' },
  'plans.view':             { label: 'View plans',               group: 'Revenue' },
  'plans.manage':           { label: 'Manage plans',             group: 'Revenue' },
  'billing.view':           { label: 'View billing',             group: 'Revenue' },
  'billing.manage_invoice': { label: 'Manage invoices',          group: 'Revenue' },
  'billing.refund':         { label: 'Issue refunds',            group: 'Revenue' },
  'reports.view':           { label: 'View reports',             group: 'Revenue' },
  'support.view':           { label: 'View support',             group: 'Support' },
  'support.manage':         { label: 'Manage tickets',           group: 'Support' },
  'team.view':              { label: 'View team',                group: 'Admin' },
  'team.manage':            { label: 'Manage team',              group: 'Admin' },
  'settings.view':          { label: 'View settings',            group: 'Admin' },
  'settings.manage':        { label: 'Manage settings',          group: 'Admin' },
  'identity.view':          { label: 'View Identity & Access',   group: 'Admin' },
  'identity.manage':        { label: 'Manage Identity & Access', group: 'Admin' },
};

export const can = (role: Role, action: string): boolean =>
  !!MATRIX[action] && MATRIX[action].includes(role);
