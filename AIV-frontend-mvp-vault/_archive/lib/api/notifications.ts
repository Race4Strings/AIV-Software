import { apiClient } from "./client";

// ============================================
// Notifications API Types
// ============================================

export type NotificationType = 'mention' | 'message' | 'chat_invite';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    chat_id?: string;
    created_at: string;
}

export interface UnreadCountResponse {
    unread_count: number;
}

// ============================================
// Notifications API Methods
// ============================================

export const notificationsApi = {
    /**
     * List notifications
     * @param unreadOnly - Only show unread notifications
     * @param limit - Max number to return
     */
    list: async (unreadOnly: boolean = false, limit: number = 50): Promise<Notification[]> => {
        const response = await apiClient.get('/notifications', {
            params: { unread_only: unreadOnly, limit }
        });
        return response.data;
    },

    /**
     * Get unread notification count
     * Use for notification badge
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data.unread_count;
    },

    /**
     * Mark a single notification as read
     */
    markRead: async (notificationId: string): Promise<void> => {
        await apiClient.put(`/notifications/${notificationId}/read`);
    },

    /**
     * Mark all notifications as read
     */
    markAllRead: async (): Promise<void> => {
        await apiClient.put('/notifications/read-all');
    },
};

export default notificationsApi;
