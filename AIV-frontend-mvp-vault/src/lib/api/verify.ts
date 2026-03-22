import apiClient from "./client";

export interface PublicCertification {
  hash: string;
  tx_hash?: string;
  block_number?: string;
  network?: string;
  version: string;
  certified_at: string;
  twin_name: string;
  twin_public_name?: string;
  twin_category?: string;
  algorithm: string;
  covered_assets: string[];
}

export async function verifyCertification(hash: string): Promise<PublicCertification | null> {
  try {
    const res = await apiClient.get(`/verify/${hash}`);
    return res.data;
  } catch {
    return null;
  }
}
