import { request, listRequest } from './client';
import type { Plan, ListEnvelope, CreatePlanBody, UpdatePlanBody } from './types';

export function listPlans(): Promise<ListEnvelope<Plan>> {
  return listRequest<ListEnvelope<Plan>>('/plans');
}

export function createPlan(body: CreatePlanBody): Promise<Plan> {
  return request<Plan>('/plans', { method: 'POST', body });
}

export function getPlan(id: string): Promise<Plan> {
  return request<Plan>(`/plans/${id}`);
}

export function updatePlan(id: string, body: UpdatePlanBody): Promise<Plan> {
  return request<Plan>(`/plans/${id}`, { method: 'PATCH', body });
}

export function publishPlan(id: string, publish: boolean): Promise<Plan> {
  return request<Plan>(`/plans/${id}/publish`, { method: 'POST', body: { publish } });
}
