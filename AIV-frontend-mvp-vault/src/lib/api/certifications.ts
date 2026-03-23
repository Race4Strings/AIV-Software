/**
 * Identity Package / Certification API client.
 *
 * Maps to the packages router: /twins/{id}/packages
 * The old /twins/{id}/certification endpoints no longer exist.
 * The frontend "certification" concept = identity package version with blockchain seal.
 */
import apiClient from "./client";
import axios from "axios";
import { toast } from "sonner";

export interface Certification {
  id: string;
  twin_id: string;
  version_number: number;
  version: string; // alias for version_number for backward compat
  alcm_snapshot_ref: string;
  change_summary?: string;
  change_categories?: string[];
  seal_id: string;
  seal_hash: string; // maps to old "hash" field
  hash: string; // alias
  seal_generated_at?: string;
  tx_hash?: string | null;
  block_number?: string | null;
  network?: string | null;
  is_current: boolean;
  cascaded_to_deals?: number;
  created_at: string;
}

function normalize(raw: Record<string, unknown>): Certification {
  return {
    ...raw,
    version: String(raw.version_number || raw.version || "1"),
    hash: (raw.seal_hash as string) || (raw.hash as string) || "",
    seal_hash: (raw.seal_hash as string) || (raw.hash as string) || "",
  } as Certification;
}

export async function fetchCertifications(twinId: string): Promise<Certification[]> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/packages`);
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(normalize);
  } catch {
    return [];
  }
}

export async function fetchLatestCert(twinId: string): Promise<Certification | null> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/packages/current`);
    return normalize(res.data);
  } catch {
    return null;
  }
}

export async function createCertification(twinId: string): Promise<Certification | null> {
  try {
    const res = await apiClient.post(`/twins/${twinId}/packages/snapshot`);
    toast.success("Identity package sealed and blockchain-anchored");
    return normalize(res.data);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400) {
      toast.error(err.response.data?.detail || "Cannot create snapshot — no ALCM identity linked.");
    } else {
      toast.error("Certification failed. Please try again.");
    }
    return null;
  }
}
