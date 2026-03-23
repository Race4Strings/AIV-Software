import { apiClient } from "./client";

// ============================================
// Workspaces API Types
// ============================================

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    is_default: boolean;
    icon?: string;
    chat_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateWorkspaceData {
    name: string;
    description?: string;
    icon?: string;
}

export interface UpdateWorkspaceData {
    name?: string;
    description?: string;
    icon?: string;
}

// ============================================
// Workspaces API Methods
// ============================================

export const workspacesApi = {
    /**
     * List all workspaces for the user
     * Note: A default "General" workspace is auto-created for each user
     */
    list: async (): Promise<Workspace[]> => {
        const response = await apiClient.get('/workspaces');
        return response.data;
    },

    /**
     * Get a specific workspace
     */
    get: async (workspaceId: string): Promise<Workspace> => {
        const response = await apiClient.get(`/workspaces/${workspaceId}`);
        return response.data;
    },

    /**
     * Create a new workspace
     */
    create: async (data: CreateWorkspaceData): Promise<Workspace> => {
        const response = await apiClient.post('/workspaces', data);
        return response.data;
    },

    /**
     * Update a workspace
     */
    update: async (workspaceId: string, data: UpdateWorkspaceData): Promise<Workspace> => {
        const response = await apiClient.put(`/workspaces/${workspaceId}`, data);
        return response.data;
    },

    /**
     * Delete a workspace
     * Note: Cannot delete the default workspace
     */
    delete: async (workspaceId: string): Promise<void> => {
        await apiClient.delete(`/workspaces/${workspaceId}`);
    },
};

export default workspacesApi;
