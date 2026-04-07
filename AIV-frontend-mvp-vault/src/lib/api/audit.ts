import apiClient from "./client";

export interface AuditLog {
  id: string;
  twin_id?: string;
  user_id: string;
  action: string;
  entity_type: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export async function fetchAuditLogs(twinId: string): Promise<AuditLog[]> {
  try {
    const res = await apiClient.get("/audit", { params: { twin_id: twinId } });
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchAllAuditLogs(): Promise<AuditLog[]> {
  try {
    const res = await apiClient.get("/audit");
    return res.data;
  } catch {
    return [];
  }
}
