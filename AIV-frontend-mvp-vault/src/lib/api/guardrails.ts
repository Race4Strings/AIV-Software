import { apiClient } from "./client";

export interface GuardrailConfig {
  id: string;
  twin_id: string;
  version: number;
  blocked_topics: string[];
  restricted_topics: Record<string, unknown>;
  language_restrictions: string[];
  min_formality: number;
  max_controversy: number;
  humor_permitted: boolean;
  humor_blacklist: string[];
  require_ai_disclosure: boolean;
  disclosure_text: string;
  is_active: boolean;
  created_at: string;
}

export const guardrailsApi = {
  async get(twinId: string): Promise<{ config: GuardrailConfig; history: GuardrailConfig[] }> {
    const { data } = await apiClient.get(`/twins/${twinId}/guardrails`);
    return data;
  },
  async update(twinId: string, config: Partial<GuardrailConfig>): Promise<GuardrailConfig> {
    const { data } = await apiClient.post(`/twins/${twinId}/guardrails`, config);
    return data;
  },
};
