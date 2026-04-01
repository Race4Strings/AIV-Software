/**
 * Integrations API client — cross-platform content ingestion.
 */

import { apiClient } from "./client";

export interface IntegrationSource {
  id: string;
  name: string;
  status: string;
  description: string;
  supports: string[];
}

export const integrationsApi = {
  async getSources(): Promise<{ sources: IntegrationSource[] }> {
    const { data } = await apiClient.get("/integrations/sources");
    return data;
  },

  async ingestTranscript(twinId: string, payload: {
    transcript_text: string;
    source: string;
    title?: string;
    date?: string;
  }) {
    const { data } = await apiClient.post("/integrations/transcript/ingest", {
      twin_id: twinId,
      ...payload,
    });
    return data;
  },

  async ingestMeeting(twinId: string, payload: {
    transcript_text?: string;
    recording_url?: string;
    meeting_title?: string;
    meeting_date?: string;
  }) {
    const { data } = await apiClient.post("/integrations/meet/ingest", {
      twin_id: twinId,
      ...payload,
    });
    return data;
  },
};
