import { apiClient } from "./client";

// ============================================
// Contacts API Types
// ============================================

export interface Contact {
    id: string;
    contact_type: 'clone' | 'user';
    nickname?: string;
    is_favorite: boolean;
    created_at: string;
    clone?: {
        id: string;
        name: string;
        description?: string;
        avatar_icon_url?: string;
        owner_id: string;
    };
    user?: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
}

export interface ContactSearchResult {
    id: string;
    name: string;
    type: string;
    user_name?: string;
    description?: string;
    avatar_profile_url?: string;
    avatar_icon_url?: string;
    owner_name?: string;
}

// ============================================
// Contacts API Methods
// ============================================

export const contactsApi = {
    /**
     * List user's contacts
     */
    list: async (): Promise<Contact[]> => {
        const response = await apiClient.get('/contacts');
        return response.data;
    },

    /**
     * List all public clones with pagination
     */
    listPublic: async (offset: number = 0, limit: number = 20): Promise<ContactSearchResult[]> => {
        const response = await apiClient.get('/contacts/public', {
            params: { offset, limit }
        });
        return response.data;
    },

    /**
     * Search public clones to add as contacts
     */
    search: async (query: string, limit: number = 20): Promise<ContactSearchResult[]> => {
        const response = await apiClient.get('/contacts/search', {
            params: { q: query, limit }
        });
        return response.data;
    },

    /**
     * Add a clone or user as a contact
     * @param contactCloneId - Clone ID to add (use one)
     * @param contactUserId - User ID to add (use one)
     * @param nickname - Optional custom display name
     */
    add: async (
        contactCloneId?: string,
        contactUserId?: string,
        nickname?: string
    ): Promise<Contact> => {
        const response = await apiClient.post('/contacts', {
            contact_clone_id: contactCloneId,
            contact_user_id: contactUserId,
            nickname
        });
        return response.data;
    },

    /**
     * Remove a contact
     */
    remove: async (contactId: string): Promise<void> => {
        await apiClient.delete(`/contacts/${contactId}`);
    },

    /**
     * Toggle favorite status for a contact
     */
    toggleFavorite: async (contactId: string): Promise<{ is_favorite: boolean }> => {
        const response = await apiClient.put(`/contacts/${contactId}/favorite`);
        return response.data;
    },
};

export default contactsApi;
