import React, { useState, useMemo, useEffect } from 'react';
import { useClients } from '../api/hooks/useClients';
import {
  Btn, StatusBadge, Avatar, UsageBar, Pagination, SkeletonRows, Empty, Menu, MenuItem, fmt, useNav,
} from '../components';
import { Icon } from '../lib/icons';
import { useAuth } from '../auth/AuthContext';
import type { Client } from '../api/types';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PER_PAGE = 12;

type SortKey = 'name' | 'status' | 'plan_name' | 'mrr' | 'created' | 'last_active_days';

const tierBadgeCls = (tier: string) =>
  'badge badge-' + (tier === 'gold' ? 'amber' : tier === 'platinum' ? 'violet' : 'slate');

const fmtDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const lastActiveColor = (days: number) =>
  days <= 2 ? 'var(--green)' : days > 30 ? 'var(--text-faint)' : 'var(--text-2)';

export function ClientsScreen(): React.ReactElement {
  const { go } = useNav();
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [planF, setPlanF] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'mrr', dir: 'desc' });
  const [page, setPage] = useState(1);

  // The API returns clients in a single page (next_cursor is null), so we load all and do
  // filter / count / sort / paginate client-side — matching the design prototype.
  const query = useClients({ sort: '-mrr' });
  const all: Client[] = query.data?.pages.flatMap(p => p.data) ?? [];

  const statusCounts: Record<string, number> = { all: all.length };
  for (const s of ['active', 'trial', 'suspended', 'cancelled']) {
    statusCounts[s] = all.filter(c => c.status === s).length;
  }

  // Plan filter options, derived from the loaded clients (value = tier).
  const planOptions = useMemo(() => {
    const seen = new Map<string, string>();
    all.forEach(c => { if (c.tier && !seen.has(c.tier)) seen.set(c.tier, c.plan_name || c.tier); });
    return [...seen.entries()];
  }, [all]);

  const filtered = useMemo(() => all.filter(c =>
    (statusF === 'all' || c.status === statusF) &&
    (planF === 'all' || c.tier === planF) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.slug ?? '').toLowerCase().includes(q.toLowerCase()))
  ), [all, statusF, planF, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = (a[sort.key] as string | number) ?? 0;
      let bv: string | number = (b[sort.key] as string | number) ?? 0;
      if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv).toLowerCase(); }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1);
    });
    return arr;
  }, [filtered, sort]);

  useEffect(() => setPage(1), [q, statusF, planF]);
  const pages = Math.ceil(sorted.length / PER_PAGE);
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });

  const Th = ({ k, children, num }: { k: SortKey; children: React.ReactNode; num?: boolean }) => (
    <th className={'sortable' + (num ? ' num' : '')} style={num ? { textAlign: 'right' } : undefined} onClick={() => toggleSort(k)}>
      {children}{sort.key === k && <span className="sort-ar">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
    </th>
  );

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">Clients</h1>
          <p className="page-desc">{fmt.num(all.length)} client schools across all statuses</p>
        </div>
        <div className="page-actions">
          {can('clients.start_trial') && (
            <Btn variant="primary" icon={Icon.plus} onClick={() => go('onboard')}>Onboard client</Btn>
          )}
        </div>
      </div>

      {/* filter bar: status chips (with counts) + search + plan filter */}
      <div className="row jb fw gap12" style={{ marginBottom: 14 }}>
        <div className="row gap8 fw">
          {STATUS_FILTERS.map(s => (
            <button key={s.value} className={'chip' + (statusF === s.value ? ' active' : '')} onClick={() => setStatusF(s.value)}>
              {s.label}<span className="tiny" style={{ opacity: 0.6 }}>{statusCounts[s.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="row gap8">
          <div className="input-group" style={{ width: 220 }}>
            <Icon.search />
            <input placeholder="Search clients…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 130, height: 36 }} value={planF} onChange={e => setPlanF(e.target.value)}>
            <option value="all">All plans</option>
            {planOptions.map(([tier, name]) => <option key={tier} value={tier}>{name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <Th k="name">Client</Th>
                <Th k="status">Status</Th>
                <Th k="plan_name">Plan</Th>
                <Th k="mrr" num>MRR</Th>
                <th>Usage</th>
                <Th k="created" num>Created</Th>
                <Th k="last_active_days">Last active</Th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            {query.isLoading
              ? <SkeletonRows cols={8} rows={8} />
              : (
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr><td colSpan={8}><Empty icon={Icon.building} title="No clients match">Try clearing filters or a different search.</Empty></td></tr>
                  ) : pageItems.map(c => {
                    const limitStudents = c.limits?.students ?? 0;
                    return (
                      <tr key={c.id} className="clickable" onClick={() => go('client', { id: c.id })}>
                        <td>
                          <div className="row gap10" style={{ minWidth: 180 }}>
                            <Avatar name={c.name} size={30} square />
                            <div style={{ minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600 }}>{c.name}</div>
                              {c.slug && <div className="tiny muted mono truncate">{c.slug}</div>}
                            </div>
                          </div>
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td><span className={tierBadgeCls(c.tier)}>{c.plan_name}</span></td>
                        <td className="num">{c.mrr ? fmt.money(c.mrr) : <span className="muted">—</span>}</td>
                        <td style={{ width: 150 }}>
                          <div style={{ width: 130 }}>
                            {limitStudents > 0
                              ? <UsageBar value={c.students_count ?? 0} limit={limitStudents} label="Students" />
                              : <span className="muted tiny">—</span>}
                          </div>
                        </td>
                        <td className="num muted tiny">{fmtDate(c.created)}</td>
                        <td className="tiny">
                          <span style={{ color: lastActiveColor(c.last_active_days) }}>{c.last_active_days}d ago</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <Menu trigger={<Btn variant="ghost" size="sm" icon={Icon.moreH} />}>
                            <MenuItem icon={Icon.eye} onClick={() => go('client', { id: c.id })}>View details</MenuItem>
                            {can('clients.impersonate') && <MenuItem icon={Icon.login}>Impersonate</MenuItem>}
                            {can('billing.view') && <MenuItem icon={Icon.invoice} onClick={() => go('billing')}>View invoices</MenuItem>}
                          </Menu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
          </table>
        </div>
        <Pagination page={page} pages={pages} total={sorted.length} onPage={setPage} />
      </div>
    </div>
  );
}
