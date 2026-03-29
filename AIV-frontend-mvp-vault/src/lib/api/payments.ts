import apiClient from "./client";

export interface Invoice {
  id: string;
  organization_id: string;
  type: string; // PLATFORM_FEE | COMMISSION | USAGE
  amount: number;
  currency: string;
  deal_id: string | null;
  status: string; // PENDING | PAID | OVERDUE | FAILED
  due_date: string | null;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  stripe_invoice_url: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  organization_id: string;
  deal_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string; // PENDING | PROCESSING | COMPLETED | FAILED
  processed_at: string | null;
  created_at: string;
}

export interface BillingStatus {
  has_payment_method: boolean;
  stripe_customer_id: string | null;
  subscription_active: boolean;
  platform_fee_active: boolean;
  fee_free_window_expires: string | null;
}

export const paymentsApi = {
  async getInvoices(status?: string, type?: string): Promise<Invoice[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const { data } = await apiClient.get("/payments/invoices", { params });
    return data;
  },

  async getPayouts(dealId?: string): Promise<Payout[]> {
    const params: Record<string, string> = {};
    if (dealId) params.deal_id = dealId;
    const { data } = await apiClient.get("/payments/payouts", { params });
    return data;
  },

  async getBillingStatus(): Promise<BillingStatus> {
    const { data } = await apiClient.get("/payments/billing-status");
    return data;
  },

  async createSetupCheckout(successUrl: string, cancelUrl: string): Promise<{ checkout_url: string; session_id: string }> {
    const { data } = await apiClient.post("/payments/setup-checkout", {
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return data;
  },

  async createConnectOnboarding(returnUrl: string, refreshUrl: string): Promise<{ connect_account_id: string; onboarding_url: string }> {
    const { data } = await apiClient.post("/payments/connect-onboard", {
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
    return data;
  },
};

export default paymentsApi;
