import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsScreen } from './ReportsScreen';

vi.mock('../api/hooks/useRevenueReport', () => ({
  useRevenueReport: () => ({ isLoading: false, isError: false,
    data: { arr: 3000000, net_growth: 12, gross_churn_pct: 1.8, arpa: 25000,
      months: ['Jan','Feb'], revenue_series: [0, 3000000],
      revenue_by_plan: [{ label: 'Gold', value: 9, color: '#f0b429' }],
      plan_performance: [{ plan_name: 'Gold', clients: 9, mrr: 250000, share_pct: 80 }] } }),
}));

describe('ReportsScreen', () => {
  it('renders ARR from revenue data', () => {
    render(<ReportsScreen />);
    expect(screen.getByText(/30,00,000/)).toBeInTheDocument();
  });
});
