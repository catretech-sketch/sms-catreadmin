export interface ClientsListParams {
  status?: string; tier?: string; q?: string; sort?: string; limit?: number;
}
export interface RevenueParams { months?: number; }

export const qk = {
  dashboard: () => ['dashboard', 'overview'] as const,
  clients: {
    list: (params: ClientsListParams) => ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
    usage: (id: string) => ['clients', 'usage', id] as const,
    activity: (id: string) => ['clients', 'activity', id] as const,
  },
  reports: {
    revenue: (params: RevenueParams) => ['reports', 'revenue', params] as const,
  },
  plans: {
    list: () => ['plans', 'list'] as const,
  },
};
