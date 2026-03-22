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

  submitStep: (sessionId: string, step: number, response: Record<string, unknown>, voiceSampleUrl?: string) =>
    apiClient
      .put<OnboardingSession>(`/onboarding/${sessionId}/step`, {
        step,
        response,
        voice_sample_url: voiceSampleUrl,
      })
      .then((r) => r.data),

  triggerResearch: (sessionId: string) =>
    apiClient.post(`/onboarding/${sessionId}/research`).then((r) => r.data),

  getResearch: (sessionId: string) =>
    apiClient.get<{ status: string; data: Record<string, unknown> }>(`/onboarding/${sessionId}/research`).then((r) => r.data),

  submitVoice: (sessionId: string, videoBlob: Blob, filename: string = "recording.webm") => {
    const formData = new FormData();
    formData.append("video", videoBlob, filename);
    // Do NOT set Content-Type — axios auto-sets it with the correct multipart boundary
    return apiClient
      .post(`/onboarding/${sessionId}/voice`, formData, {
        headers: { "Content-Type": undefined as unknown as string },
        timeout: 120000,
      })
      .then((r) => r.data);
  },

  complete: (sessionId: string) =>
    apiClient.post<OnboardingSession>(`/onboarding/${sessionId}/complete`).then((r) => r.data),
};
