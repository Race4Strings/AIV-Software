import { apiClient } from "./client";

export interface WorkspaceDocument {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  filename: string;
  content_type: string | null;
  file_size: number | null;
  storage_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const workspaceDocumentsApi = {
  list: async (workspaceId: string): Promise<WorkspaceDocument[]> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}/documents`);
    return response.data;
  },

  upload: async (
    workspaceId: string,
    file: File,
    description?: string
  ): Promise<WorkspaceDocument> => {
    const formData = new FormData();
    formData.append("file", file);
    if (description) formData.append("description", description);

    const response = await apiClient.post(
      `/workspaces/${workspaceId}/documents`,
      formData
    );
    return response.data;
  },

  get: async (workspaceId: string, documentId: string): Promise<WorkspaceDocument> => {
    const response = await apiClient.get(
      `/workspaces/${workspaceId}/documents/${documentId}`
    );
    return response.data;
  },

  update: async (
    workspaceId: string,
    documentId: string,
    data: { description?: string }
  ): Promise<WorkspaceDocument> => {
    const response = await apiClient.patch(
      `/workspaces/${workspaceId}/documents/${documentId}`,
      data
    );
    return response.data;
  },

  delete: async (workspaceId: string, documentId: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${workspaceId}/documents/${documentId}`);
  },
};
