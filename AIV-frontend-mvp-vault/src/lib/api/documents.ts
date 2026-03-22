import { apiClient } from "./client";

export interface Document {
    id: string;
    twin_id: string;
    title: string;
    doc_type: string;
    content: string;
    status: string;
    exportable: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface DocumentCreate {
    title: string;
    doc_type: string;
    content?: string;
    status?: string;
    exportable?: boolean;
}

export interface DocumentUpdate {
    title?: string;
    doc_type?: string;
    content?: string;
    status?: string;
    exportable?: boolean;
}

export const documentApi = {
    createDocument: async (twinId: string, data: DocumentCreate): Promise<Document> => {
        const response = await apiClient.post(`/twins/${twinId}/documents`, data);
        return response.data;
    },

    getDocuments: async (
        twinId: string,
        params?: { doc_type?: string; status?: string }
    ): Promise<Document[]> => {
        const response = await apiClient.get(`/twins/${twinId}/documents`, { params });
        return response.data;
    },

    getDocument: async (twinId: string, docId: string): Promise<Document> => {
        const response = await apiClient.get(`/twins/${twinId}/documents/${docId}`);
        return response.data;
    },

    updateDocument: async (
        twinId: string,
        docId: string,
        data: DocumentUpdate
    ): Promise<Document> => {
        const response = await apiClient.put(`/twins/${twinId}/documents/${docId}`, data);
        return response.data;
    },

    deleteDocument: async (twinId: string, docId: string): Promise<void> => {
        await apiClient.delete(`/twins/${twinId}/documents/${docId}`);
    },
};
