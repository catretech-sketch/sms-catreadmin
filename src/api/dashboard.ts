import { request } from './client';
import type { DashboardOverview } from './types';

export function getOverview(): Promise<DashboardOverview> {
  return request<DashboardOverview>('/dashboard/overview');
}
