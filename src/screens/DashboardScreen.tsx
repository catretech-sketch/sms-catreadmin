import React from 'react';
import { useDashboardOverview } from '../api/hooks/useDashboardOverview';
import { QueryBoundary } from '../components/QueryBoundary';
import { Charts } from '../lib/charts';
import { StatusBadge, fmt } from '../components';
import { Icon } from '../lib/icons';

// True when every value in a numeric series is zero — "not enough history yet" (handoff §8.2).
const allZero = (s: number[]) => s.length === 0 || s.every(v => v === 0);

export function DashboardScreen(): React.ReactElement {
  const q = useDashboardOverview();
  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}
        skeleton={<div className="muted" style={{ padding: 24 }}>Loading dashboard…</div>}>
        {q.data && (
          <>
            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Kpi label="MRR" value={fmt.money(q.data.mrr)} />
              <Kpi label="Active clients" value={fmt.num(q.data.counts.active)} />
              <Kpi label="Trials" value={fmt.num(q.data.counts.trial)} />
              <Kpi label="Trials ending" value={fmt.num(q.data.trials_ending)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <div className="row jb"><b>Recurring revenue</b><span className="muted tiny">{fmt.pct(q.data.churn_pct)} churn</span></div>
              {allZero(q.data.mrr_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Line data={q.data.mrr_series} labels={q.data.months} format={fmt.k} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Plan mix</b>
              <Charts.Donut data={q.data.plan_mix} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Signups</b>
              {allZero(q.data.signup_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Bars data={q.data.signup_series} labels={q.data.months} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Usage alerts</b>
              {q.data.usage_alerts.length === 0
                ? <p className="muted tiny" style={{ marginTop: 8 }}>No tenants over 80% usage.</p>
                : q.data.usage_alerts.map(a => (
                    <div key={a.tenant_id} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{a.name}</span>
                      <span className="row gap8"><StatusBadge status={a.status} /><b className="mono">{a.usage_pct}%</b></span>
                    </div>
                  ))}
            </div>

            <HealthPanel items={q.data.system_health} />
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 24, fontWeight: 750, marginTop: 6 }}>{value}</div>
    </div>
  );
}

export function HealthPanel({ items }: { items: { name: string; status: string; latency: string; uptime: string }[] }) {
  return (
    <div className="card" style={{ marginTop: 16, padding: 16 }}>
      <div className="row gap8"><Icon.activity size={16} /><b>System health</b></div>
      {items.length === 0
        ? <p className="muted tiny" style={{ marginTop: 8 }}>No health data.</p>
        : items.map(h => (
            <div key={h.name} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{h.name}</span>
              <span className="row gap10"><span className="tiny muted mono">{h.latency} · {h.uptime}</span><StatusBadge status={h.status} /></span>
            </div>
          ))}
    </div>
  );
}
