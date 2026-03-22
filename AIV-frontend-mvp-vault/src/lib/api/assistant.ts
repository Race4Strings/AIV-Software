/**
 * Assistant API client — "Your assistant (by AIV)"
 *
 * Replaces the old chats/workspaces API with a multi-mode assistant.
 * Modes: ASSISTANT | DIGITAL_SELF | TRAINING | REFINEMENT
 */

import { apiClient } from "./client";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface AgentSession {
  id: string;
  user_id: string;
  twin_id: string | null;
  current_mode: "ASSISTANT" | "DIGITAL_SELF" | "TRAINING" | "REFINEMENT";
  started_at: string;
  last_activity_at: string;
  auth_expires_at: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: "USER" | "AGENT" | "SYSTEM";
  mode_at_time: string;
  content: string;
  actions?: Array<{ type: string; endpoint?: string; latency_ms?: number }>;
  created_at: string;
}

// ------------------------------------------------------------------
// Session management
// ------------------------------------------------------------------

export const assistantApi = {
  /** Create a new assistant session. */
  async createSession(twinId?: string): Promise<AgentSession> {
    const { data } = await apiClient.post("/assistant/session", {
      twin_id: twinId || null,
    });
    return data;
  },

  /** List active sessions (last 10). */
  async listSessions(): Promise<AgentSession[]> {
    const { data } = await apiClient.get("/assistant/sessions");
    return data;
  },

  // ------------------------------------------------------------------
  // Messages (non-streaming)
  // ------------------------------------------------------------------

  /** Send a message and get the full response. */
  async sendMessage(
    sessionId: string,
    content: string
  ): Promise<AgentMessage> {
    const { data } = await apiClient.post(
      `/assistant/session/${sessionId}/message/sync`,
      { content }
    );
    return data;
  },

  /** Get message history for a session. */
  async getMessages(
    sessionId: string,
    limit = 50,
    offset = 0
  ): Promise<AgentMessage[]> {
    const { data } = await apiClient.get(
      `/assistant/session/${sessionId}/messages`,
      { params: { limit, offset } }
    );
    return data;
  },

  // ------------------------------------------------------------------
  // Mode switching
  // ------------------------------------------------------------------

  /** Switch the assistant's mode. */
  async switchMode(
    sessionId: string,
    mode: AgentSession["current_mode"]
  ): Promise<AgentSession> {
    const { data } = await apiClient.post(
      `/assistant/session/${sessionId}/mode`,
      { mode }
    );
    return data;
  },
};

// ------------------------------------------------------------------
// Streaming helper
// ------------------------------------------------------------------

/**
 * Send a message and stream the response via SSE.
 *
 * Usage:
 *   for await (const chunk of streamMessage(sessionId, "Hello")) {
 *     appendToUI(chunk);
 *   }
 */
export async function* streamMessage(
  sessionId: string,
  content: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(
    `/api/backend/assistant/session/${sessionId}/message`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Assistant stream failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) {
          yield `Error: ${parsed.error}`;
          return;
        }
        if (parsed.text) {
          yield parsed.text;
        }
      } catch {
        // Skip malformed SSE
      }
    }
  }
}
