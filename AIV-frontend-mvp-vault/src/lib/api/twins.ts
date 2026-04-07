import apiClient from "./client";

export interface Twin {
  id: string;
  organization_id?: string;
  talent_user_id?: string;
  alcm_twin_id?: string;
  display_name?: string;
  public_name?: string;
  bio?: string;
  identity_category?: string[];
  clone_type?: string;
  status: string;
  health_status?: string;
  talent_authorization_at?: string;
  stage_1_completed_at?: string;
  fee_free_window_expires?: string;
  platform_fee_active?: boolean;
  certified_at?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields — kept for backward compat, may be undefined
  name?: string;
  category?: string;
  [key: string]: unknown;
}

export async function fetchTwins(): Promise<Twin[]> {
  try {
    const res = await apiClient.get("/twins");
    return res.data;
  } catch {
    return [];
  }
}

/** Pick the most complete twin from a list (has bio or category). Falls back to first. */
export function pickBestTwin(twins: Twin[]): Twin | undefined {
  if (twins.length === 0) return undefined;
  return twins.find((tw) => tw.bio || tw.category) || twins[0];
}

export async function fetchTwin(id: string): Promise<Twin | null> {
  try {
    const res = await apiClient.get(`/twins/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export interface TwinHealth {
  twin_id: string;
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

export async function fetchTwinHealth(id: string): Promise<TwinHealth | null> {
  try {
    const res = await apiClient.get(`/twins/${id}/health`);
    return res.data;
  } catch {
    return null;
  }
}

export async function updateTwin(
  id: string,
  data: Partial<Pick<Twin, "name" | "display_name" | "public_name" | "category" | "bio" | "identity_category" | "clone_type">>
): Promise<Twin | null> {
  try {
    const res = await apiClient.post(`/twins/${id}/update`, data);
    return res.data;
  } catch {
    return null;
  }
}

export async function lockTwin(id: string, password: string): Promise<boolean> {
  try {
    await apiClient.post(`/twins/${id}/lock`, { password });
    return true;
  } catch {
    return false;
  }
}

export async function unlockTwin(id: string, password: string): Promise<boolean> {
  try {
    await apiClient.post(`/twins/${id}/unlock`, { password });
    return true;
  } catch {
    return false;
  }
}

export async function archiveTwin(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/twins/${id}/archive`);
    return true;
  } catch {
    return false;
  }
}

export async function deleteTwin(id: string): Promise<boolean> {
  try {
    const res = await apiClient.post(`/twins/${id}/delete`);
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function textToSpeech(twinId: string, text: string): Promise<Blob | null> {
  try {
    const res = await apiClient.post(`/twins/${twinId}/voice/tts`, { text }, {
      responseType: "blob",
    });
    return res.data;
  } catch {
    return null;
  }
}
