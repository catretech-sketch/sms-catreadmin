import { request, listRequest } from './client';
import type { OnboardingCard, OnboardingStage, ListEnvelope } from './types';

export function getOnboarding(): Promise<ListEnvelope<OnboardingCard>> {
  return listRequest<ListEnvelope<OnboardingCard>>('/onboarding');
}
export function advanceOnboarding(id: string, stage: OnboardingStage): Promise<OnboardingCard> {
  return request<OnboardingCard>(`/onboarding/${id}/advance`, { method: 'POST', body: { stage } });
}
/** Backend keys checklist items by label, not index. */
export function patchChecklist(id: string, label: string, done: boolean): Promise<OnboardingCard> {
  return request<OnboardingCard>(`/onboarding/${id}/checklist`, { method: 'PATCH', body: { label, done } });
}
