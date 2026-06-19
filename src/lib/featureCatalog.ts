/**
 * Static feature catalog for pricing tiers
 * Mirrors the SchoolMate School Console sidebar one-to-one.
 * Each entry = a real module a school admin sees, with the tier it unlocks at,
 * a short note, and used for plan building.
 */

export type FeatureTier = 'silver' | 'gold' | 'platinum';

export const TIER_META: Record<FeatureTier, { label: string; rank: number; color: string }> = {
  silver:   { label: 'Silver',   rank: 1, color: 'var(--slate)' },
  gold:     { label: 'Gold',     rank: 2, color: 'var(--amber)' },
  platinum: { label: 'Platinum', rank: 3, color: 'var(--violet)' },
};

export const FEATURE_CATALOG: Record<string, { label: string; section: string; tier: FeatureTier; note: string }> = {
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
export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.label])
);

// code -> minimum tier (badge in plan editor)
export const FEATURE_TIER: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.tier])
);

// code -> one-line note (plan editor)
export const FEATURE_NOTE: Record<string, string> = Object.fromEntries(
  Object.entries(FEATURE_CATALOG).map(([c, m]) => [c, m.note])
);

// All modules that a given tier (and below) unlock — used by the "copy from tier" shortcuts.
export const featuresForTier = (tier: FeatureTier): string[] =>
  Object.entries(FEATURE_CATALOG)
    .filter(([, m]) => TIER_META[m.tier].rank <= TIER_META[tier].rank)
    .map(([c]) => c);

// Grouped for the plan editor — mirrors the School Console sidebar sections.
const SECTIONS = ['Academic', 'Operations', 'Administration'] as const;

export const FEATURE_GROUPS: { title: string; codes: string[] }[] = SECTIONS.map(title => ({
  title,
  codes: Object.entries(FEATURE_CATALOG)
    .filter(([, m]) => m.section === title)
    .map(([c]) => c),
}));
