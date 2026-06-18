import { useQuery } from '@tanstack/react-query';
import { getRevenue } from '../reports';
import { qk, type RevenueParams } from '../queryKeys';

export function useRevenueReport(params: RevenueParams = {}) {
  return useQuery({ queryKey: qk.reports.revenue(params), queryFn: () => getRevenue(params) });
}
