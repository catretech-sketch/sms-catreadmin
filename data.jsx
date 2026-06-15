/* ============================================================
   RBAC permissions + deterministic seed data
   window.RBAC, window.DB
   ============================================================ */

/* ---------------- RBAC ---------------- */
const ROLES = {
  owner:   { key: 'owner',   name: 'Owner',   color: 'var(--accent)',  desc: 'Full access — team, settings, lifecycle, billing.' },
  admin:   { key: 'admin',   name: 'Admin',   color: 'var(--blue)',    desc: 'Client lifecycle, billing, support, onboarding.' },
  support: { key: 'support', name: 'Support', color: 'var(--green)',   desc: 'View clients, read-only impersonate, full tickets.' },
  sales:   { key: 'sales',   name: 'Sales',   color: 'var(--violet)',  desc: 'Start trials, run onboarding, billing read-only.' },
  finance: { key: 'finance', name: 'Finance', color: 'var(--amber)',   desc: 'Plans, subscriptions, invoices, refunds.' },
  analyst: { key: 'analyst', name: 'Analyst', color: 'var(--slate)',   desc: 'Dashboards & reports only.' },
};

// permission matrix: actionKey -> set of roles allowed
const MATRIX = {
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
  'team.view':             ['owner'],
  'team.manage':           ['owner'],
  'settings.view':         ['owner'],
  'settings.manage':       ['owner'],
  'reports.view':          ['owner','admin','support','sales','finance','analyst'],
  'identity.view':         ['owner','admin'],
  'identity.manage':       ['owner','admin'],
};

const can = (role, action) => !!MATRIX[action] && MATRIX[action].includes(role);

// Human-readable metadata for every MATRIX permission key — drives the Identity & Access UI.
const PERMISSION_CATALOG = {
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

// Roles exposed for sign-in + the in-app switcher (this deployment runs Admin + Sales only)
const DEMO_ROLES = ['admin', 'sales'];

window.RBAC = { ROLES, MATRIX, can, DEMO_ROLES, PERMISSION_CATALOG };

/* ---------------- SEED ---------------- */
// deterministic PRNG
let _s = 1234567;
const rnd = () => { _s = (_s * 16807) % 2147483647; return (_s - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// Pricing model:
//  pricing: 'flat'  -> price = ₹/month
//  pricing: 'per_student' -> perStudent = ₹/student/month, billed on enrolled students (min applies)
//  offer:  { label, pct } optional promotional discount
//  visibility: 'published' | 'draft'  (Publish toggle — only published plans are offerable)
//  audience:  'all' | 'new' | 'exclusive'  (who can be put on this plan)
//  band:  human-readable size band this plan targets
const PLANS = [
  { id: 'pl_trial', name: 'Free Trial', tier: 'trial', pricing: 'flat', price: 0, period: '14 days', color: 'var(--green)',
    features: ['sis.students','sis.teachers','academics','attendance','exams','fees','communication','reports'],
    limits: { students: 200, staff: 20, storage_gb: 5 }, active: true,
    visibility: 'published', audience: 'new', band: 'Any size', offer: null,
    desc: '14-day full-feature trial — no card required.' },
  { id: 'pl_silver', name: 'Silver', tier: 'silver', pricing: 'flat', price: 4999, period: 'month', color: 'var(--slate)',
    features: ['sis.students','sis.teachers','sis.staff','sis.parents','academics','attendance','exams','fees','fees.online','communication','reports'],
    limits: { students: 300, staff: 30, storage_gb: 10 }, active: true,
    visibility: 'published', audience: 'all', band: 'Under 300 students', offer: null,
    desc: 'For small schools getting started with the essentials.' },
  { id: 'pl_gold', name: 'Gold', tier: 'gold', pricing: 'flat', price: 14999, period: 'month', color: 'var(--amber)',
    features: ['sis.students','sis.teachers','sis.staff','sis.parents','academics','attendance','exams','fees','fees.online','communication','ops.library','ops.transport','ops.hostel','ops.sports','reports','reports.advanced','identity'],
    limits: { students: 1200, staff: 120, storage_gb: 50 }, active: true, popular: true,
    visibility: 'published', audience: 'all', band: '300–1,200 students', offer: { label: 'Annual: 2 months free', pct: 16 },
    desc: 'Full operations for established K-12 schools.' },
  { id: 'pl_platinum', name: 'Platinum', tier: 'platinum', pricing: 'flat', price: 29999, period: 'month', color: 'var(--violet)',
    features: ['sis.students','sis.teachers','sis.staff','sis.parents','academics','attendance','attendance.geo','exams','fees','fees.online','communication','hr.payroll','ops.library','ops.transport','ops.hostel','ops.sports','transport.gps','reports','reports.advanced','identity','support.dedicated'],
    limits: { students: 5000, staff: 500, storage_gb: 250 }, active: true,
    visibility: 'published', audience: 'all', band: '1,200+ students', offer: null,
    desc: 'District-grade with API, SSO and a dedicated CSM.' },
  { id: 'pl_perstudent', name: 'Per‑Student', tier: 'metered', pricing: 'per_student', perStudent: 15, minStudents: 150, price: 0, period: 'month', color: 'var(--blue)',
    features: ['sis.students','attendance','academics','exams','fees','communication','reports'],
    limits: { students: 5000, staff: 500, storage_gb: 100 }, active: true,
    visibility: 'published', audience: 'all', band: 'Scales with enrolment', offer: null,
    desc: '₹15 per enrolled student / month — pay for what you use.' },
  { id: 'pl_startup', name: 'Startup School', tier: 'exclusive', pricing: 'flat', price: 2499, period: 'month', color: 'var(--accent)',
    features: ['sis.students','attendance','exams','communication','reports'],
    limits: { students: 200, staff: 20, storage_gb: 8 }, active: true,
    visibility: 'draft', audience: 'new', band: 'Under 200 students', offer: { label: 'Launch offer — 40% off 1st year', pct: 40 },
    desc: 'Exclusive new-school plan for small setups under 200 students.' },
];
/* Tier metadata — mirrors SchoolMate's Silver / Gold / Platinum gating.
   minTier = the lowest plan tier at which a school-admin module unlocks. */
const TIER_META = {
  silver:   { label: 'Silver',   rank: 1, color: 'var(--slate)' },
  gold:     { label: 'Gold',     rank: 2, color: 'var(--amber)' },
  platinum: { label: 'Platinum', rank: 3, color: 'var(--violet)' },
};

/* Catalog mirrors the SchoolMate **School Console** sidebar one-to-one.
   Each entry = a real module a school admin sees, with the tier it unlocks at,
   a short note, and the icon used in the school console.  Admins pick from
   exactly these when building a plan. */
const FEATURE_CATALOG = {
  // ── Academic ──────────────────────────────────────────────
  'sis.students':    { label: 'Students (SIS)',        section: 'Academic', tier: 'silver',   note: 'Student records, admissions & Student 360' },
  'sis.teachers':    { label: 'Teachers',              section: 'Academic', tier: 'silver',   note: 'Teacher directory & assignments' },
  'sis.staff':       { label: 'Staff & support',       section: 'Academic', tier: 'silver',   note: 'Non-teaching staff records' },
  'sis.parents':     { label: 'Parents',               section: 'Academic', tier: 'silver',   note: 'Guardian directory & linking' },
  'academics':       { label: 'Academics',             section: 'Academic', tier: 'silver',   note: 'Classes, subjects & timetable' },
  'attendance':      { label: 'Attendance',            section: 'Academic', tier: 'silver',   note: 'Daily roll-call & registers' },
  'attendance.geo':  { label: 'Geo-fenced attendance', section: 'Academic', tier: 'platinum', note: 'Location-verified check-in' },
  'exams':           { label: 'Exams & grading',       section: 'Academic', tier: 'silver',   note: 'Datesheets, marks & report cards' },
  // ── Operations ────────────────────────────────────────────
  'fees':            { label: 'Fees & payments',       section: 'Operations', tier: 'silver',   note: 'Fee structure, invoices & ledger' },
  'fees.online':     { label: 'Online fee payment',    section: 'Operations', tier: 'silver',   note: 'UPI / card collection for parents' },
  'communication':   { label: 'Communication',         section: 'Operations', tier: 'silver',   note: 'Announcements · SMS · WhatsApp · IVR' },
  'hr.payroll':      { label: 'HR & Payroll',          section: 'Operations', tier: 'platinum', note: 'Staff HR, salary & payslips' },
  'ops.library':     { label: 'Library',               section: 'Operations', tier: 'gold',     note: 'Catalogue, issue & fines' },
  'ops.transport':   { label: 'Transport',             section: 'Operations', tier: 'gold',     note: 'Routes, vehicles & stops' },
  'ops.hostel':      { label: 'Hostel',                section: 'Operations', tier: 'gold',     note: 'Blocks, rooms & residents' },
  'ops.sports':      { label: 'Sports',                section: 'Operations', tier: 'gold',     note: 'Teams, events & athletes' },
  'transport.gps':   { label: 'Live bus tracking',     section: 'Operations', tier: 'platinum', note: 'Real-time GPS map & parent ETAs' },
  // ── Administration ────────────────────────────────────────
  'reports':         { label: 'Reports',               section: 'Administration', tier: 'silver',   note: 'Standard school reports & exports' },
  'reports.advanced':{ label: 'Advanced analytics',    section: 'Administration', tier: 'gold',     note: 'Weak-student & cohort insights' },
  'identity':        { label: 'Identity & access',     section: 'Administration', tier: 'gold',     note: 'Roles, permissions & SSO' },
  'support.dedicated':{ label: 'Dedicated support',    section: 'Administration', tier: 'platinum', note: 'Named CSM & priority SLA' },
};

// flat code -> label (cards, client detail). Falls back to code if missing.
const FEATURE_LABELS = Object.fromEntries(Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.label]));
// code -> minimum tier (badge in plan editor)
const FEATURE_TIER = Object.fromEntries(Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.tier]));
// code -> one-line note (plan editor)
const FEATURE_NOTE = Object.fromEntries(Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.note]));

// All modules that a given tier (and below) unlock — used by the "copy from tier" shortcuts.
const featuresForTier = (tier) => Object.entries(FEATURE_CATALOG)
  .filter(([, m]) => TIER_META[m.tier].rank <= TIER_META[tier].rank)
  .map(([c]) => c);

// Grouped for the plan editor — mirrors the School Console sidebar sections.
const SECTIONS = ['Academic', 'Operations', 'Administration'];
const FEATURE_GROUPS = SECTIONS.map(title => ({
  title,
  codes: Object.entries(FEATURE_CATALOG).filter(([, m]) => m.section === title).map(([c]) => c),
}));

const SCHOOL_NAMES = [
  ['Greenwood High','greenwood'],['Silver Oaks Academy','silver-oaks'],['Sunrise International','sunrise-intl'],
  ['Gyan Bharati Vidyalaya','gyan-bharati'],['Orchid Public School','orchid'],['Vidya Mandir Senior','vidya-mandir'],
  ['Heritage Global School','heritage'],['Lotus Valley Academy','lotus-valley'],['Sankalp Vidyalaya','sankalp'],
  ['Indus World School','indus-world'],['Saraswati Vidya Mandir','saraswati'],['Tagore International','tagore-intl'],
  ['Nalanda Academy','nalanda'],['Ashoka Universal','ashoka'],['Maitri Public School','maitri'],
  ['Chinmaya Vidyapeeth','chinmaya'],['Pragati Senior Secondary','pragati'],['Sunbeam School','sunbeam'],
  ['Vasant Valley Academy','vasant-valley'],['Kshitij International','kshitij-intl'],['Bodhi Tree School','bodhi-tree'],
  ['Akshara Vidyalaya','akshara'],['Spring Dale School','spring-dale'],['Gokuldham High','gokuldham'],
  ['Vivekananda Academy','vivekananda'],['Shanti Niketan School','shanti-niketan'],['Prerana Vidya Bhavan','prerana'],
];
const COUNTRIES = ['Mumbai, MH','New Delhi, DL','Bengaluru, KA','Hyderabad, TS','Chennai, TN','Pune, MH','Kolkata, WB','Ahmedabad, GJ','Jaipur, RJ','Kochi, KL'];
const STATUSES = ['active','active','active','active','active','trial','trial','trial','suspended','cancelled'];
const FIRST = ['Aarav','Diya','Vihaan','Ananya','Arjun','Saanvi','Reyansh','Ishita','Aditya','Kavya','Rohan','Meera','Karthik','Priya','Aryan','Nisha','Vivaan','Riya','Siddharth','Anjali'];
const LAST = ['Sharma','Iyer','Reddy','Patel','Nair','Gupta','Menon','Rao','Desai','Khanna','Mehta','Joshi','Pillai','Verma','Kulkarni','Bose','Chauhan','Banerjee','Naidu','Kapoor'];

const fmtDate = (d) => d.toISOString().slice(0,10);
const daysAgo = (n) => { const d = new Date('2026-06-08T00:00:00Z'); d.setDate(d.getDate() - n); return d; };

const PAID_PLANS = PLANS.filter(p => ['silver','gold','platinum'].includes(p.tier) && p.active);
const CLIENTS = SCHOOL_NAMES.map(([name, slug], i) => {
  const status = i === 0 ? 'active' : STATUSES[i % STATUSES.length];
  const plan = status === 'trial' ? pick([PAID_PLANS[0], PAID_PLANS[1]]) : pick(PAID_PLANS);
  const students = between(Math.floor(plan.limits.students*0.25), Math.floor(plan.limits.students*0.99));
  const staff = between(Math.floor(plan.limits.staff*0.3), plan.limits.staff);
  const storage = +(rnd() * plan.limits.storage_gb).toFixed(1);
  const mrr = status === 'active' ? plan.price : (status === 'trial' ? 0 : (status==='suspended'? plan.price : 0));
  const created = between(8, 760);
  const lastActive = status === 'cancelled' ? between(40, 120) : (status==='suspended'? between(10,40) : between(0, 6));
  const owner = pick(['owner','admin','sales','finance']);
  return {
    id: 'tn_' + slug.replace(/-/g,'_'), name, slug, status, country: pick(COUNTRIES),
    plan: plan.id, planName: plan.name, tier: plan.tier, mrr,
    students, staff, storage, limits: plan.limits,
    created: fmtDate(daysAgo(created)), createdAgo: created,
    lastActive: lastActive === 0 ? 'today' : lastActive + 'd ago', lastActiveDays: lastActive,
    trialEnds: status === 'trial' ? between(-2, 12) : null,
    contact: { name: pick(FIRST) + ' ' + pick(LAST), email: 'admin@' + slug + '.edu.in', phone: '+91 ' + between(70,99) + String(between(100,999)) + ' ' + String(between(10000,99999)) },
    csm: pick(['Aanya Sharma','Rohan Mehta','Priya Nair','Karthik Reddy']),
    healthScore: between(38, 98),
    gateway: (() => {
      const provider = pick(['Razorpay','Razorpay','Razorpay','PayU','Cashfree']);
      const method = pick(['upi_autopay','upi_autopay','enach','card']);
      const mandate = status === 'active' ? pick(['active','active','active','pending']) : (status === 'trial' ? 'none' : (status === 'suspended' ? 'paused' : 'cancelled'));
      return {
        provider, method, mandate,
        vpa: method === 'upi_autopay' ? slug.replace(/-/g,'') + '@okhdfcbank' : null,
        card: method === 'card' ? 'HDFC ···· ' + between(1000,9999) : null,
        bank: method === 'enach' ? pick(['HDFC Bank','ICICI Bank','SBI','Axis Bank']) : null,
        maxAmount: between(5,30) * 1000,
        mandateId: provider.slice(0,3).toLowerCase() + '_mnd_' + Math.random().toString(36).slice(2,10),
      };
    })(),
    usageSeries: Array.from({length: 14}, () => between(Math.floor(students*0.6), students)),
  };
});

const TEAM = [
  { id:'u1', name:'Aanya Sharma', email:'aanya@catre.io', role:'owner', status:'active', lastLogin:'2h ago', joined:'2023-01-12' },
  { id:'u2', name:'Rohan Mehta', email:'rohan@catre.io', role:'admin', status:'active', lastLogin:'18m ago', joined:'2023-04-03' },
  { id:'u3', name:'Priya Nair', email:'priya@catre.io', role:'support', status:'active', lastLogin:'5m ago', joined:'2023-06-21' },
  { id:'u4', name:'Karthik Reddy', email:'karthik@catre.io', role:'sales', status:'active', lastLogin:'1h ago', joined:'2023-09-15' },
  { id:'u5', name:'Neha Gupta', email:'neha@catre.io', role:'finance', status:'active', lastLogin:'3h ago', joined:'2024-02-08' },
  { id:'u6', name:'Vivek Iyer', email:'vivek@catre.io', role:'analyst', status:'active', lastLogin:'yesterday', joined:'2024-05-30' },
  { id:'u7', name:'Sneha Rao', email:'sneha@catre.io', role:'support', status:'active', lastLogin:'42m ago', joined:'2024-08-19' },
  { id:'u8', name:'Aditya Verma', email:'aditya@catre.io', role:'sales', status:'invited', lastLogin:'—', joined:'2026-06-01' },
  { id:'u9', name:'Imran Khan', email:'imran@catre.io', role:'admin', status:'deactivated', lastLogin:'34d ago', joined:'2023-03-11' },
];

const TICKET_SUBJECTS = [
  'Attendance sync failing for Year 9','Cannot export grade report to PDF','Parent portal login loop',
  'Bulk student import rejected','SSO redirect error after upgrade','Invoice shows wrong currency',
  'Timetable clash detection wrong','API rate limit too low','Need data migration help',
  'Fee reminder emails not sending','Photo upload stuck at 90%','Request: add Hindi locale',
];
const TICKETS = TICKET_SUBJECTS.map((subj, i) => {
  const c = CLIENTS[between(0, CLIENTS.length-1)];
  const status = pick(['open','open','pending','pending','resolved','closed']);
  const pri = pick(['urgent','high','high','normal','normal','low']);
  return {
    id: 'TK-' + (2040 - i), subject: subj, client: c.name, clientId: c.id, status, priority: pri,
    assignee: pick([null,'Priya Nair','Sneha Rao','Rohan Mehta']),
    updated: between(0, 5) === 0 ? 'just now' : between(1,46) + 'h ago', created: fmtDate(daysAgo(between(0,20))),
    messages: between(2, 9),
  };
});

const INV_STATUS = ['paid','paid','paid','open','open','past_due'];
const INVOICES = Array.from({ length: 24 }, (_, i) => {
  const c = CLIENTS[i % CLIENTS.length];
  const pl = PLANS.find(p => p.id === c.plan) || PLANS[0];
  const status = c.status === 'active' ? INV_STATUS[i % INV_STATUS.length] : pick(['open','past_due','paid']);
  const amount = pl.price;
  const issued = between(2, 90);
  return {
    id: 'INV-' + (10480 - i), client: c.name, clientId: c.id, plan: pl.name,
    amount, status, issued: fmtDate(daysAgo(issued)),
    due: fmtDate(daysAgo(issued - 14)), paidOn: status === 'paid' ? fmtDate(daysAgo(issued - between(1,10))) : null,
  };
});

const ONBOARDING = (() => {
  const cols = { lead: [], trial: [], onboarding: [], active: [] };
  const checklist = ['Account created','Admin invited','Data imported','First login','Payment set up'];
  const trialClients = CLIENTS.filter(c => c.status === 'trial');
  const leads = [['Sunrise Montessori','sunrise-mont'],['Aatman Academy','aatman'],['Vidyaranya School','vidyaranya'],['Disha Public School','disha-public']];
  leads.forEach(([name, slug], i) => cols.lead.push({ id:'ob_l'+i, name, slug, owner: pick(['Karthik Reddy','Aditya Verma']), value: pick([4999,14999,29999]), done: between(0,1), checklist, age: between(1,9) }));
  trialClients.slice(0,4).forEach((c, i) => cols.trial.push({ id:'ob_t'+i, name:c.name, slug:c.slug, clientId:c.id, owner:'Karthik Reddy', value:PLANS.find(p=>p.id===c.plan).price, done: between(2,3), checklist, age: between(1,7) }));
  CLIENTS.filter(c=>c.status==='active').slice(0,3).forEach((c,i)=> cols.onboarding.push({ id:'ob_o'+i, name:c.name, slug:c.slug, clientId:c.id, owner:'Priya Nair', value:PLANS.find(p=>p.id===c.plan).price, done: between(3,4), checklist, age: between(1,5) }));
  CLIENTS.filter(c=>c.status==='active').slice(3,6).forEach((c,i)=> cols.active.push({ id:'ob_a'+i, name:c.name, slug:c.slug, clientId:c.id, owner:'Priya Nair', value:PLANS.find(p=>p.id===c.plan).price, done:5, checklist, age: between(1,12) }));
  return cols;
})();

const AUDIT = [
  { id:1, actor:'Aanya Sharma', role:'owner', action:'suspended client', target:'Sankalp Vidyalaya', time:'2h ago', kind:'suspend' },
  { id:2, actor:'Neha Gupta', role:'finance', action:'refunded invoice INV-10465', target:'Heritage Global School', time:'4h ago', kind:'refund' },
  { id:3, actor:'Karthik Reddy', role:'sales', action:'started trial', target:'Indus World School', time:'5h ago', kind:'trial' },
  { id:4, actor:'Priya Nair', role:'support', action:'impersonated', target:'Greenwood High', time:'6h ago', kind:'impersonate' },
  { id:5, actor:'Rohan Mehta', role:'admin', action:'changed plan to Platinum', target:'Sunrise International', time:'yesterday', kind:'plan' },
  { id:6, actor:'Aanya Sharma', role:'owner', action:'invited teammate', target:'aditya@catre.io', time:'yesterday', kind:'team' },
  { id:7, actor:'Neha Gupta', role:'finance', action:'marked invoice paid INV-10470', target:'Orchid Public School', time:'2d ago', kind:'invoice' },
  { id:8, actor:'Rohan Mehta', role:'admin', action:'activated client', target:'Chinmaya Vidyapeeth', time:'2d ago', kind:'activate' },
];

// dashboard aggregates
const counts = {
  total: CLIENTS.length,
  active: CLIENTS.filter(c=>c.status==='active').length,
  trial: CLIENTS.filter(c=>c.status==='trial').length,
  suspended: CLIENTS.filter(c=>c.status==='suspended').length,
  cancelled: CLIENTS.filter(c=>c.status==='cancelled').length,
};
const mrr = CLIENTS.reduce((s,c)=>s+c.mrr,0);
const trialsEnding = CLIENTS.filter(c=>c.status==='trial' && c.trialEnds!=null && c.trialEnds <= 7).length;

const MRR_SERIES = (() => { let v = 152000; return Array.from({length:12}, (_,i) => { v += between(-6000, 16000) + i*1400; return Math.max(120000, v); }); })();
const SIGNUP_SERIES = Array.from({length:12}, () => between(1, 6));
const MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];

const usageAlerts = CLIENTS.map(c => {
  const pct = Math.round(c.students / c.limits.students * 100);
  return { ...c, usagePct: pct };
}).filter(c => c.usagePct >= 80 && c.status !== 'cancelled').sort((a,b)=>b.usagePct-a.usagePct).slice(0,6);

const SYSTEM_HEALTH = [
  { name:'API Gateway', status:'operational', latency:'82ms', uptime:'99.98%' },
  { name:'Auth Service', status:'operational', latency:'41ms', uptime:'99.99%' },
  { name:'Billing (Razorpay)', status:'operational', latency:'120ms', uptime:'99.95%' },
  { name:'Email Delivery', status:'degraded', latency:'940ms', uptime:'99.21%' },
  { name:'File Storage', status:'operational', latency:'66ms', uptime:'99.97%' },
  { name:'Background Jobs', status:'operational', latency:'—', uptime:'99.90%' },
];

window.DB = {
  PLANS, FEATURE_LABELS, FEATURE_GROUPS, FEATURE_CATALOG, FEATURE_TIER, FEATURE_NOTE, TIER_META, featuresForTier,
  CLIENTS, TEAM, TICKETS, INVOICES, ONBOARDING, AUDIT,
  SYSTEM_HEALTH, usageAlerts,
  dash: { counts, mrr, trialsEnding, MRR_SERIES, SIGNUP_SERIES, MONTHS,
    planMix: [
      { label:'Gold', value: CLIENTS.filter(c=>c.tier==='gold').length, color:'var(--amber)' },
      { label:'Platinum', value: CLIENTS.filter(c=>c.tier==='platinum').length, color:'var(--violet)' },
      { label:'Silver', value: CLIENTS.filter(c=>c.tier==='silver').length, color:'var(--slate)' },
    ],
  },
};
