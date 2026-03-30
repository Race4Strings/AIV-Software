import { apiClient } from "./client";

export interface UploadResponse {
    url: string;
    key: string;
    filename: string;
    content_type: string;
}

export const uploadApi = {
    /**
     * Upload a file to S3-compatible storage
     */
    uploadFile: async (file: File | Blob, folder: 'uploads' | 'voice' | 'images' | 'documents' | 'onboarding' = 'uploads'): Promise<UploadResponse> => {
        const formData = new FormData();

        // Handle both File and Blob
        if (file instanceof File) {
            formData.append('file', file, file.name);
        } else {
            // For Blobs (like audio recordings), generate a filename
            const extension = file.type.split('/')[1] || 'bin';
            formData.append('file', file, `recording.${extension}`);
        }

        const response = await apiClient.post(`/upload?folder=${folder}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    /**
     * Upload voice recording
     */
    uploadVoice: async (blob: Blob): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', blob, 'voice-recording.webm');

        const response = await apiClient.post('/upload/voice', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    /**
     * Upload image
     */
    uploadImage: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file, file.name);

        const response = await apiClient.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    /**
     * Upload document (PDF, etc.)
     */
    uploadDocument: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file, file.name);

        const response = await apiClient.post('/upload/document', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },
};

export default uploadApi;
