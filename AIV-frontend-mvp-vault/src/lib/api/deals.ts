import { apiClient } from "./client";

export interface Deal {
    id: string;
    twin_id: string;
    brand_name: string;
    deal_type: string;
    value: number;
    currency: string;
    status: string;
    terms_summary: string | null;
    notes: string | null;
    start_date: string | null;
    end_date: string | null;
    document_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface DealCreate {
    brand_name: string;
    deal_type: string;
    value: number;
    currency?: string;
    status?: string;
    terms_summary?: string | null;
    notes?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    document_ids?: string[];
}

export interface DealUpdate {
    brand_name?: string;
    deal_type?: string;
    value?: number;
    currency?: string;
    terms_summary?: string | null;
    notes?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    document_ids?: string[];
}

export const dealApi = {
    createDeal: async (twinId: string, data: DealCreate): Promise<Deal> => {
        const response = await apiClient.post(`/deals`, { twin_id: twinId, data });
        return response.data;
    },

    getDeals: async (): Promise<Deal[]> => {
        const response = await apiClient.get(`/deals`);
        return response.data;
    },

    getDeal: async (dealId: string): Promise<Deal> => {
        const response = await apiClient.get(`/deals/${dealId}`);
        return response.data;
    },

    updateDeal: async (dealId: string, data: DealUpdate): Promise<Deal> => {
        const response = await apiClient.put(`/deals/${dealId}`, data);
        return response.data;
    },

    updateDealStatus: async (dealId: string, newStatus: string): Promise<Deal> => {
        const response = await apiClient.put(`/deals/${dealId}/status`, { new_status: newStatus });
        return response.data;
    },
};
