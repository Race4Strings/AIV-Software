import { apiClient } from "./client";

export interface Organization {
  id: string;
  name: string;
  type: string;
}

export interface OrgMember {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  role: string;
  permissions: Record<string, boolean>;
  accepted_at: string | null;
}

export const organizationsApi = {
  async getMyOrg(): Promise<Organization> {
    const { data } = await apiClient.get("/organizations/me");
    return data;
  },
  async get(orgId: string): Promise<Organization> {
    const { data } = await apiClient.get(`/organizations/${orgId}`);
    return data;
  },
  async update(orgId: string, name: string): Promise<Organization> {
    const { data } = await apiClient.put(`/organizations/${orgId}`, { name });
    return data;
  },
  async getMembers(orgId: string): Promise<OrgMember[]> {
    const { data } = await apiClient.get(`/organizations/${orgId}/members`);
    return data;
  },
  async invite(orgId: string, email: string, role: string, permissions: Record<string, boolean> = {}) {
    const { data } = await apiClient.post(`/organizations/${orgId}/invite`, { email, role, permissions });
    return data;
  },
  async updateMemberRole(orgId: string, userId: string, role: string) {
    const { data } = await apiClient.put(`/organizations/${orgId}/members/${userId}`, { role });
    return data;
  },
  async removeMember(orgId: string, userId: string) {
    await apiClient.delete(`/organizations/${orgId}/members/${userId}`);
  },
};
