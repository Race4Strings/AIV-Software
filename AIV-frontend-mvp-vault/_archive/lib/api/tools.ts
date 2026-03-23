import { apiClient } from "./client";

// Types
export interface ToolCapability {
    name: string;
    requires_confirmation: boolean;
}

export interface Tool {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon_url: string;
    provider: string;
    capabilities: ToolCapability[];
    is_connected: boolean;
}

export interface ToolConnection {
    id: string;
    tool_id: string;
    tool_name: string;
    tool_slug: string;
    tool_icon: string;
    account_email: string;
    account_name?: string;
    connected_at: string;
    last_synced_at?: string;
    is_active: boolean;
}

export interface ChatTool {
    id: string;
    tool_name: string;
    tool_slug: string;
    tool_icon: string;
    account_email: string;
    settings: Record<string, unknown>;
    added_at: string;
}

export interface OAuthStartResponse {
    auth_url: string;
    state: string;
}

// API Client
export const toolsApi = {
    /**
     * List all available tools with connection status
     */
    async list(): Promise<Tool[]> {
        const response = await apiClient.get<Tool[]>("/tools");
        return response.data;
    },

    /**
     * Get user's connected tool accounts
     */
    async getConnections(): Promise<ToolConnection[]> {
        const response = await apiClient.get<ToolConnection[]>("/tools/connections");
        return response.data;
    },

    /**
     * Start OAuth flow for a tool
     * Returns the auth URL to redirect the user to
     */
    async startAuth(slug: string): Promise<OAuthStartResponse> {
        const response = await apiClient.get<OAuthStartResponse>(`/tools/${slug}/auth`);
        return response.data;
    },

    /**
     * Disconnect a tool from user's account
     */
    async disconnect(connectionId: string): Promise<{ status: string }> {
        const response = await apiClient.delete<{ status: string }>(
            `/tools/connections/${connectionId}`
        );
        return response.data;
    },

    /**
     * Get tools enabled in a specific chat
     */
    async getChatTools(chatId: string): Promise<ChatTool[]> {
        const response = await apiClient.get<ChatTool[]>(`/tools/chat/${chatId}`);
        return response.data;
    },

    /**
     * Add a tool to a chat
     */
    async addToChat(
        chatId: string,
        toolConnectionId: string,
        settings: Record<string, unknown> = {}
    ): Promise<ChatTool> {
        const response = await apiClient.post<ChatTool>(`/tools/chat/${chatId}`, {
            tool_connection_id: toolConnectionId,
            settings,
        });
        return response.data;
    },

    /**
     * Remove a tool from a chat
     */
    async removeFromChat(
        chatId: string,
        chatToolId: string
    ): Promise<{ status: string }> {
        const response = await apiClient.delete<{ status: string }>(
            `/tools/chat/${chatId}/${chatToolId}`
        );
        return response.data;
    },
};
