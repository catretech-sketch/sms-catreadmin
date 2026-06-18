import React, { useState } from 'react';
import { useRevenueReport } from '../api/hooks/useRevenueReport';
import { downloadClientsCsv } from '../api/reports';
import { QueryBoundary } from '../components/QueryBoundary';
import { Btn, fmt, useToast } from '../components';
import { Charts } from '../lib/charts';
import { Icon } from '../lib/icons';

const allZero = (s: number[]) => s.length === 0 || s.every(v => v === 0);

export function ReportsScreen(): React.ReactElement {
  const q = useRevenueReport();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const exportCsv = async () => {
    setBusy(true);
    try {
      const blob = await downloadClientsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'clients.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', kind: 'success' });
    } catch {
      toast({ title: 'Export failed', msg: 'Could not download the CSV.', kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="row jb">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reports</h1>
        <Btn variant="default" icon={Icon.download} disabled={busy} onClick={exportCsv}>
          {busy ? 'Exporting…' : 'Export clients CSV'}
        </Btn>
      </div>

      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}>
        {q.data && (
          <>
            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Stat label="ARR" value={fmt.money(q.data.arr)} />
              <Stat label="ARPA" value={fmt.money(q.data.arpa)} />
              <Stat label="Net growth" value={fmt.pct(q.data.net_growth)} />
              <Stat label="Gross churn" value={fmt.pct(q.data.gross_churn_pct)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Revenue</b>
              {allZero(q.data.revenue_series)
                ? <p className="muted" style={{ padding: '32px 0', textAlign: 'center' }}>Not enough history yet</p>
                : <Charts.Line data={q.data.revenue_series} labels={q.data.months} format={fmt.k} />}
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Revenue by plan</b>
              <Charts.Donut data={q.data.revenue_by_plan} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Plan performance</b>
              <table className="tbl" style={{ marginTop: 8 }}>
                <thead><tr><th>Plan</th><th>Clients</th><th>MRR</th><th>Share</th></tr></thead>
                <tbody>
                  {q.data.plan_performance.map(p => (
                    <tr key={p.plan_name}>
                      <td><b>{p.plan_name}</b></td>
                      <td>{fmt.num(p.clients)}</td>
                      <td className="mono">{fmt.money(p.mrr)}</td>
                      <td>{fmt.pct(p.share_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 750, marginTop: 6 }}>{value}</div>
    </div>
  );
}
