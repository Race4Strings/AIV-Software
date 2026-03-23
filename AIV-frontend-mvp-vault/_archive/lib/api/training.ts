import { apiClient } from "./client";

export interface TrainingMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface TrainingChatResponse {
    session_id: string;
    messages: TrainingMessage[];
    total_messages: number;
}

export interface SendMessageResponse {
    user_message: TrainingMessage;
    assistant_message: TrainingMessage;
    dimension_updated?: string; // e.g., "work", "mind", "heart", "ethics", etc.
}

export const trainingApi = {
    /**
     * Get training chat history for a clone
     * Creates a session automatically if none exists
     */
    getChat: async (
        cloneId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<TrainingChatResponse> => {
        const response = await apiClient.get(`/clones/${cloneId}/training/chat`, {
            params: { limit, offset }
        });
        return response.data;
    },

    /**
     * Send a message to the training chat and get AI response
     * May update clone dimensions based on the conversation
     */
    sendMessage: async (
        cloneId: string,
        content: string
    ): Promise<SendMessageResponse> => {
        const response = await apiClient.post(`/clones/${cloneId}/training/chat`, {
            content
        });
        return response.data;
    },

    /**
     * Get training statistics (optional, if backend supports)
     */
    getStats: async (cloneId: string): Promise<{
        total_messages: number;
        dimensions_updated: string[];
        last_trained_at?: string;
    }> => {
        const response = await apiClient.get(`/clones/${cloneId}/training/stats`);
        return response.data;
    },
};

export default trainingApi;
