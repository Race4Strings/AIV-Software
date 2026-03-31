import { apiClient } from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

export const notificationsApi = {
  async list(unread = false): Promise<Notification[]> {
    const { data } = await apiClient.get("/notifications", { params: { unread } });
    return data;
  },
  async markRead(id: string) {
    return apiClient.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    return apiClient.post("/notifications/read-all");
  },
  async getPreferences(): Promise<Record<string, boolean>> {
    const { data } = await apiClient.get("/notifications/preferences");
    return data;
  },
  async updatePreferences(prefs: Record<string, boolean>): Promise<void> {
    await apiClient.post("/notifications/preferences", prefs);
  },
};
