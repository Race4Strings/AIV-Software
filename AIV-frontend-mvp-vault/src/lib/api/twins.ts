import apiClient from "./client";

export interface Twin {
  id: string;
  user_id: string;
  name: string;
  public_name?: string;
  category?: string;
  bio?: string;
  alcm_data?: Record<string, unknown>;
  voice_status: string;
  voice_sample_url?: string;
  commercial_terms?: Record<string, unknown>;
  governance?: Record<string, unknown>;
  status: string;
  completeness_score: number;
  version: string;
  certified_at?: string;
  created_at: string;
  updated_at: string;
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


export async function updateTwin(
  id: string,
  data: Partial<Pick<Twin, "name" | "public_name" | "category" | "bio" | "alcm_data" | "commercial_terms" | "governance">>
): Promise<Twin | null> {
  try {
    const res = await apiClient.post(`/twins/${id}/update`, data);
    return res.data;
  } catch {
    return null;
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
