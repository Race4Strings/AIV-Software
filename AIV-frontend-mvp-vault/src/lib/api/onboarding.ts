import { apiClient } from "./client";

export interface OnboardingSession {
  id: string;
  user_id: string;
  status: string;
  current_step: number;
  research_data: Record<string, unknown>;
  user_responses: Record<string, unknown>;
  voice_sample_urls: string[];
  twin_id?: string;
  started_at: string;
  completed_at?: string;
}

export const onboardingApi = {
  start: () =>
    apiClient.post<OnboardingSession>("/onboarding/start").then((r) => r.data),

  get: (sessionId: string) =>
    apiClient.get<OnboardingSession>(`/onboarding/${sessionId}`).then((r) => r.data),

  triggerResearch: (sessionId: string) =>
    apiClient.post(`/onboarding/${sessionId}/research`).then((r) => r.data),

  getResearch: (sessionId: string) =>
    apiClient.get<{ status: string; data: Record<string, unknown> }>(`/onboarding/${sessionId}/research`).then((r) => r.data),

  complete: (sessionId: string) =>
    apiClient.post<OnboardingSession>(`/onboarding/${sessionId}/complete`).then((r) => r.data),
};
