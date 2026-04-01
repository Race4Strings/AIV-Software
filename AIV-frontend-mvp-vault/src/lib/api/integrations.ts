/**
 * Integrations API client — unified content ingestion.
 */

import { apiClient } from "./client";

export const integrationsApi = {
  /** Unified content ingestion — auto-detects source from URL or content. */
  async ingest(twinId: string, payload: {
    content?: string;
    url?: string;
    title?: string;
  }) {
    const { data } = await apiClient.post("/integrations/ingest", {
      twin_id: twinId,
      ...payload,
    });
    return data;
  },

  /** Legacy: ingest a transcript with explicit source. */
  async ingestTranscript(twinId: string, payload: {
    transcript_text: string;
    source: string;
    title?: string;
  }) {
    const { data } = await apiClient.post("/integrations/transcript/ingest", {
      twin_id: twinId,
      ...payload,
    });
    return data;
  },

  /** Legacy: ingest a meeting recording/transcript. */
  async ingestMeeting(twinId: string, payload: {
    transcript_text?: string;
    recording_url?: string;
    meeting_title?: string;
  }) {
    const { data } = await apiClient.post("/integrations/meet/ingest", {
      twin_id: twinId,
      ...payload,
    });
    return data;
  },
};
