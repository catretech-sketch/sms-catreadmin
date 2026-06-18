import { request } from './client';
import { ApiError } from './ApiError';
import { config } from '../config';
import { tokenStore } from '../auth/tokenStore';
import type { RevenueReport } from './types';
import type { RevenueParams } from './queryKeys';

export function getRevenue(params: RevenueParams): Promise<RevenueReport> {
  return request<RevenueReport>('/reports/revenue', { query: { ...params } });
}

export async function downloadClientsCsv(): Promise<Blob> {
  const token = tokenStore.getAccess();
  const res = await fetch(config.apiBaseUrl + '/reports/clients.csv', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'internal_error', `CSV export failed (${res.status})`, null);
  }
  return res.blob();
}
