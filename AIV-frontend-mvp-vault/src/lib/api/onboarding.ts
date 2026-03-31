/**
 * Onboarding API client — import-first pipeline per spec Section 7.
 */

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
  /** Resume the most recent incomplete onboarding session. */
  getActiveSession: () =>
    apiClient.get<OnboardingSession>("/onboarding/sessions/active").then((r) => r.data),

  /** Start a new onboarding session — kicks off discovery. */
  start: (discoveryInput: string, onboardingPath: string = "HYBRID") =>
    apiClient.post<OnboardingSession>("/onboarding/start", {
      discovery_input: discoveryInput,
      onboarding_path: onboardingPath,
    }).then((r) => r.data),

  /** Poll session status. */
  get: (sessionId: string) =>
    apiClient.get<OnboardingSession>(`/onboarding/${sessionId}`).then((r) => r.data),

  /** Get discovery results (Wikipedia, Google CSE, Gemini, ALCM). */
  getDiscoveryResults: (sessionId: string) =>
    apiClient.get(`/onboarding/${sessionId}/discovery-results`).then((r) => r.data),

  /** Confirm which discovered profiles belong to the talent. */
  confirmProfiles: (sessionId: string, confirmedProfiles: string[]) =>
    apiClient.post(`/onboarding/${sessionId}/confirm-profiles`, {
      confirmed_profiles: confirmedProfiles,
    }).then((r) => r.data),

  /** Record file uploads for the session. */
  recordUpload: (sessionId: string) =>
    apiClient.post(`/onboarding/${sessionId}/upload`).then((r) => r.data),

  /** Submit rights agreement — identity category selection + successor + consents. */
  submitRights: (sessionId: string, data: {
    identity_category: string[];
    successor?: { name?: string; email?: string } | null;
    consents: string[];
  }) =>
    apiClient.post(`/onboarding/${sessionId}/rights`, data).then((r) => r.data),

  /** Gate 1: Manager operational approval. */
  approveGate1: (sessionId: string) =>
    apiClient.post(`/onboarding/${sessionId}/gate-1`, { approved: true }).then((r) => r.data),

  /** Gate 2: Talent personal authorization — opens Licensing Portal. */
  authorizeGate2: (sessionId: string, consents: string[]) =>
    apiClient.post(`/onboarding/${sessionId}/gate-2`, {
      approved: true,
      consents,
    }).then((r) => r.data),
};
