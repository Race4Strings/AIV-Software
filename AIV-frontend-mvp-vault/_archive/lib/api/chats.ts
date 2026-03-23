import { apiClient } from "./client";

// ============================================
// Chats API Types
// ============================================

export interface ChatParticipant {
    id: string;
    participant_type: 'clone' | 'user';
    role: 'owner' | 'member';
    joined_at: string;
    clone?: {
        id: string;
        name: string;
        avatar_icon_url?: string;
    };
    user?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'clone';
    sender_id: string;
    sender_name: string;
    sender_avatar?: string;
    content: string;
    created_at: string;
}

export interface ChatSummary {
    id: string;
    workspace_id: string;
    title: string;
    chat_type: 'direct' | 'group';
    participant_count: number;
    message_count: number;
    last_message?: ChatMessage;
    created_at: string;
    updated_at: string;
    participants?: ChatParticipant[];
}

export interface ChatDetails {
    id: string;
    workspace_id: string;
    title: string;
    chat_type: 'direct' | 'group';
    participants: ChatParticipant[];
    messages: ChatMessage[];
    message_count: number;
    created_at: string;
}

export interface CreateChatData {
    title?: string;
    participant_clone_ids: string[];
    participant_user_ids?: string[];
    initial_message?: string;
}

export interface SendMessageResponse {
    status: 'sent';
    user_message: ChatMessage;
    clone_responses: ChatMessage[];
}

// ============================================
// Chats API Methods
// ============================================

export const chatsApi = {
    /**
     * List all chats in a workspace
     */
    listInWorkspace: async (workspaceId: string): Promise<ChatSummary[]> => {
        const response = await apiClient.get(`/workspaces/${workspaceId}/chats`);
        return response.data;
    },

    /**
     * Create a new chat in a workspace
     * @param workspaceId - Workspace to create chat in
     * @param data - Chat creation data including participants and optional initial message
     */
    create: async (workspaceId: string, data: CreateChatData): Promise<ChatDetails> => {
        const response = await apiClient.post(`/workspaces/${workspaceId}/chats`, data);
        return response.data;
    },

    /**
     * Get chat details with messages
     */
    get: async (chatId: string, limit: number = 50, offset: number = 0): Promise<ChatDetails> => {
        const response = await apiClient.get(`/chats/${chatId}`, {
            params: { limit, offset }
        });
        return response.data;
    },

    /**
     * Get messages for a chat (paginated)
     */
    getMessages: async (
        chatId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<ChatMessage[]> => {
        const response = await apiClient.get(`/chats/${chatId}/messages`, {
            params: { limit, offset }
        });
        return response.data;
    },

    /**
     * Send a message to a chat
     * AI orchestration will pick the best clone to respond
     * Use @CloneName to mention a specific clone
     */
    sendMessage: async (chatId: string, content: string): Promise<SendMessageResponse> => {
        const response = await apiClient.post(`/chats/${chatId}/messages`, { content });
        return response.data;
    },

    /**
     * Add a participant to an existing chat
     */
    addParticipant: async (
        chatId: string,
        cloneId?: string,
        userId?: string
    ): Promise<ChatParticipant> => {
        const response = await apiClient.post(`/chats/${chatId}/participants`, {
            clone_id: cloneId,
            user_id: userId
        });
        return response.data;
    },

    /**
     * Remove a participant from a chat
     */
    removeParticipant: async (chatId: string, participantId: string): Promise<void> => {
        await apiClient.delete(`/chats/${chatId}/participants/${participantId}`);
    },
};

export default chatsApi;
