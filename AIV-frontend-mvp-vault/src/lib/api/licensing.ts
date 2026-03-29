/**
 * Licensing API client — deals, contracts, milestones, PUL, payments.
 */

import { apiClient } from "./client";

export interface Deal {
  id: string;
  twin_id: string;
  client_organization_id: string;
  deal_number: number;
  deal_type: string;
  value: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  territory: string[];
  exclusivity: boolean;
  start_date: string | null;
  end_date: string | null;
  terms_summary: string | null;
  data_scope: string[];
  status: string;
  executed_at: string | null;
  completed_at: string | null;
  created_at: string;
  parameter_flags?: Record<string, { status: string; reason?: string }>;
  milestones?: DealMilestone[];
  contracts?: DealContract[];
  pul_records?: PULRecord[];
}

export interface DealMilestone {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  comments: string | null;
}

export interface DealContract {
  id: string;
  version: number;
  contract_url: string | null;
  contract_text: string | null;
  signed_by_talent_at: string | null;
  signed_by_client_at: string | null;
  is_amendment: boolean;
}

export interface PULRecord {
  id: string;
  record_type: string;
  platforms_used: string[];
  territories_reached: string[];
  submitted_at: string;
}

export interface RevenueSummary {
  total_deals: number;
  gross_revenue: number;
  total_commission: number;
  net_revenue: number;
  currency: string;
}

export const licensingApi = {
  async getDeals(twinId?: string, status?: string): Promise<Deal[]> {
    const params: Record<string, string> = {};
    if (twinId) params.twin_id = twinId;
    if (status) params.status = status;
    const { data } = await apiClient.get("/deals", { params });
    // Handle both paginated {data, pagination} and flat array responses
    return Array.isArray(data) ? data : (data.data || []);
  },

  async getDeal(dealId: string): Promise<Deal> {
    const { data } = await apiClient.get(`/deals/${dealId}`);
    return data;
  },

  async createDeal(deal: {
    twin_id: string;
    client_org_id: string;
    deal_type: string;
    value: number;
    data_scope: string[];
    territory?: string[];
    exclusivity?: boolean;
    terms_summary?: string;
  }): Promise<Deal> {
    const { data } = await apiClient.post("/deals", deal);
    return data;
  },

  async transitionStatus(dealId: string, status: string): Promise<Deal> {
    const { data } = await apiClient.put(`/deals/${dealId}/status`, { status });
    return data;
  },

  async addMilestone(dealId: string, title: string, description?: string, dueDate?: string) {
    const { data } = await apiClient.post(`/deals/${dealId}/milestones`, {
      title, description, due_date: dueDate,
    });
    return data;
  },

  async sendMessage(dealId: string, content: string) {
    const { data } = await apiClient.post(`/deals/${dealId}/messages`, { content });
    return data;
  },

  async getMessages(dealId: string) {
    const { data } = await apiClient.get(`/deals/${dealId}/messages`);
    return data;
  },

  async getRevenue(twinId?: string): Promise<RevenueSummary> {
    const params: Record<string, string> = {};
    if (twinId) params.twin_id = twinId;
    const { data } = await apiClient.get("/payments/revenue", { params });
    return data;
  },

  async getInvoices() {
    const { data } = await apiClient.get("/payments/invoices");
    return data;
  },

  async getPayouts() {
    const { data } = await apiClient.get("/payments/payouts");
    return data;
  },

  async trainAssistant(dealId: string, reasoning: string = "") {
    const { data } = await apiClient.post(`/deals/${dealId}/train-assistant`, { reasoning });
    return data;
  },

  async getNegotiationKnowledge(twinId: string) {
    const { data } = await apiClient.get(`/twins/${twinId}/negotiation-knowledge`);
    return data;
  },

  async getLicensingInfo(twinId: string) {
    const { data } = await apiClient.get(`/twins/${twinId}/licensing-info`);
    return data;
  },
};
