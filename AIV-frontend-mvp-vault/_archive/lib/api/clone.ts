import { apiClient } from "./client";

export interface CloneStatus {
    has_clone: boolean;
    clone_id: string | null;
    status: string | null;
    is_portal_complete: boolean;
    voice_complete?: boolean;
    personality_complete?: boolean;
    knowledge_complete?: boolean;
    visual_complete?: boolean;
    rights_complete?: boolean;
    activated?: boolean;
    // New onboard status
    onboard_status?: 'pending' | 'processing' | 'complete' | 'failed';
}

// NEW: Onboard processing status interface
export interface OnboardStatus {
    overall_status: 'pending' | 'processing' | 'complete' | 'failed';
    video_saved: boolean;
    frames_extracted: boolean;
    audio_extracted: boolean;
    transcription_complete: boolean;
    dimensions_extracted: boolean;
    voice_cloned: boolean;
    avatar_generated: boolean;
    personality_synthesized: boolean;
    // Available when processing completes
    transcription?: string;
    dimensions?: Record<string, unknown>;
    voice_id?: string;
    avatar_url?: string;
    error?: string;
}

export interface CloneData {
    id: string;
    name: string;
    description?: string;
    status: string;
    voice_data?: {
        sampleUrl: string;
        duration: number;
    };
    narrative_data?: Record<string, string>;
    knowledge_files?: Array<{ name: string; url: string; size: number }>;
    image_data?: {
        frontal: string | null;
        profile: string | null;
        body: string | null;
    };
    is_public?: boolean;
    elevenlabs_voice_id?: string;
    intro_audio_url?: string;
    avatar_profile_url?: string;
    avatar_icon_url?: string;
    // AI-synthesized personality data
    system_prompt?: string;
    personality?: {
        traits?: string[];
        speaking_style?: string;
        quirks?: string[];
        knowledge_areas?: string[];
        values?: string[];
    };
    background?: string;
    // Onboard transcription from video
    onboard_transcription?: string;
    // 10 dimensions from onboard
    dimensions?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateCloneData {
    name: string;
    description?: string;
}

export const cloneApi = {
    // Get clone status (for routing)
    getStatus: async (): Promise<CloneStatus> => {
        const response = await apiClient.get("/clone/status");
        return response.data;
    },

    // Create a new draft clone
    create: async (data: CreateCloneData): Promise<CloneData> => {
        const response = await apiClient.post("/clone", data);
        return response.data;
    },

    // Get clone details
    getClone: async (cloneId: string): Promise<CloneData> => {
        const response = await apiClient.get(`/clone/${cloneId}`);
        return response.data;
    },

    // ============================================
    // NEW: Video-based Onboard APIs
    // ============================================

    // Submit video onboard (multipart/form-data)
    submitOnboard: async (cloneId: string, formData: FormData): Promise<{ status: string; clone_id: string }> => {
        const response = await apiClient.post(`/clone/${cloneId}/onboard`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Get onboard processing status (poll every 2 seconds)
    getOnboardStatus: async (cloneId: string): Promise<OnboardStatus> => {
        const response = await apiClient.get(`/clone/${cloneId}/onboard/status`);
        return response.data;
    },

    // ============================================
    // Enhancement APIs (Post-Onboarding)
    // ============================================

    // Upload photos to enhance avatar (max 3 photos)
    enhancePhotos: async (cloneId: string, photos: File[]): Promise<{
        status: string;
        avatar_url?: string;
        message?: string;
    }> => {
        const formData = new FormData();
        photos.forEach((photo) => {
            formData.append('photos', photo);
        });
        const response = await apiClient.post(`/clone/${cloneId}/enhance/photos`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Upload knowledge documents to enhance clone
    enhanceKnowledge: async (cloneId: string, files: File[]): Promise<{
        status: string;
        files_uploaded: number;
        total_files: number;
    }> => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('files', file);
        });
        const response = await apiClient.post(`/clone/${cloneId}/enhance/knowledge`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // ============================================
    // Legacy APIs (kept for backward compatibility)
    // ============================================

    // Update voice data (Step 1)
    updateVoice: async (cloneId: string, data: { sample_url: string; duration: number }): Promise<void> => {
        await apiClient.put(`/clone/${cloneId}/voice`, data);
    },

    // Update personality/narrative data (Step 2)
    updatePersonality: async (cloneId: string, data: Record<string, string>): Promise<void> => {
        await apiClient.put(`/clone/${cloneId}/personality`, { answers: data });
    },

    // Update knowledge files (Step 3)
    updateKnowledge: async (cloneId: string, files: Array<{ name: string; url: string; size: number }>): Promise<void> => {
        await apiClient.put(`/clone/${cloneId}/knowledge`, { files });
    },

    // Update visual/images (Step 4)
    updateVisual: async (cloneId: string, data: { frontal: string | null; profile: string | null; body: string | null }): Promise<void> => {
        await apiClient.put(`/clone/${cloneId}/visual`, data);
    },

    // Update rights/privacy (Step 5)
    updateRights: async (cloneId: string, data: { is_public: boolean; allow_training: boolean }): Promise<void> => {
        await apiClient.put(`/clone/${cloneId}/rights`, data);
    },

    // Activate clone (Step 6) - starts async processing
    activate: async (cloneId: string): Promise<{ state: string; message: string }> => {
        const response = await apiClient.post(`/clone/${cloneId}/activate`);
        return response.data;
    },
};

export default cloneApi;


