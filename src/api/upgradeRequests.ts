import { listRequest, request } from './client';

export type UpgradeMode = 'online' | 'offline';
export type UpgradeStatus =
  | 'pending_payment'
  | 'pending_offline'
  | 'paid_pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface PlanUpgradeRequest {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  from_plan_id: string | null;
  from_plan_name: string | null;
  from_tier: string | null;
  to_plan_id: string;
  to_plan_name: string | null;
  to_tier: string | null;
  amount: number;
  currency: string;
  mode: UpgradeMode;
  status: UpgradeStatus;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RazorpayOrderPayload {
  key_id: string;
  order_id: string;
  amount_paise: number;
  currency: string;
  name: string;
  upgrade_request_id: string;
}

export function listUpgradeRequests(status?: string): Promise<{ data: PlanUpgradeRequest[] }> {
  return listRequest<{ data: PlanUpgradeRequest[] }>('/upgrade-requests', {
    query: status ? { status } : undefined,
  });
}

export function approveUpgradeRequest(id: string): Promise<PlanUpgradeRequest> {
  return request<PlanUpgradeRequest>(`/upgrade-requests/${id}/approve`, { method: 'POST' });
}

export function rejectUpgradeRequest(id: string, notes?: string): Promise<PlanUpgradeRequest> {
  return request<PlanUpgradeRequest>(`/upgrade-requests/${id}/reject`, {
    method: 'POST',
    body: { notes: notes ?? null },
  });
}

export function createClientPlanPayment(
  tenantId: string,
  planId: string,
  mode: UpgradeMode,
): Promise<PlanUpgradeRequest> {
  return request<PlanUpgradeRequest>(`/clients/${tenantId}/plan-payments`, {
    method: 'POST',
    body: { plan_id: planId, mode },
  });
}

export function createUpgradeRazorpayOrder(requestId: string): Promise<RazorpayOrderPayload> {
  return request<RazorpayOrderPayload>(`/upgrade-requests/${requestId}/razorpay-order`, { method: 'POST' });
}

export function confirmUpgradePayment(
  requestId: string,
  body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
): Promise<PlanUpgradeRequest> {
  return request<PlanUpgradeRequest>(`/upgrade-requests/${requestId}/confirm-payment`, {
    method: 'POST',
    body,
  });
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
