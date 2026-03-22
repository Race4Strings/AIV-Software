import apiClient from "./client";
import axios from "axios";
import { toast } from "sonner";

export interface Certification {
  id: string;
  twin_id: string;
  version: string;
  hash: string;
  tx_hash?: string | null;
  block_number?: string | null;
  network?: string | null;
  consent_record?: Record<string, unknown>;
  created_at: string;
}

export async function fetchCertifications(twinId: string): Promise<Certification[]> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/certification`);
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchLatestCert(twinId: string): Promise<Certification | null> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/certification/latest`);
    return res.data;
  } catch {
    return null;
  }
}

export async function createCertification(twinId: string): Promise<Certification | null> {
  try {
    const res = await apiClient.post(`/twins/${twinId}/certification`);
    toast.success("Identity certified successfully");
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      toast.error("This identity is already certified. Certification is immutable.");
    } else {
      toast.error("Certification failed. Please try again.");
    }
    return null;
  }
}
