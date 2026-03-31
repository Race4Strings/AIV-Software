/**
 * Admin API client — access codes, waitlist management.
 * All endpoints require OWNER role on the backend.
 */

import { apiClient } from "./client";

export interface AccessCode {
  id: string;
  code: string;
  label: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  status: string;
  granted_at: string | null;
  access_code: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export const adminApi = {
  async getAccessCodes(): Promise<AccessCode[]> {
    const { data } = await apiClient.get("/auth/access-codes");
    return data;
  },

  async generateCodes(count: number, label: string = "Generated"): Promise<void> {
    await apiClient.post("/auth/generate-codes", { count, label });
  },

  async getWaitlist(): Promise<WaitlistEntry[]> {
    const { data } = await apiClient.get("/auth/waitlist");
    return data;
  },

  async grantAccess(waitlistId: string): Promise<void> {
    await apiClient.post("/auth/grant-access", { waitlist_id: waitlistId });
  },

  async removeFromWaitlist(entryId: string): Promise<void> {
    await apiClient.delete(`/auth/waitlist/${entryId}`);
  },
};
