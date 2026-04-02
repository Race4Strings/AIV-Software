export interface TwinData {
  id: string;
  display_name?: string;
  name?: string;
  public_name?: string;
  bio?: string;
  identity_category?: string[];
  clone_type?: string;
  status?: string;
  health_status?: string;
  certified_at?: string;
  talent_authorization_at?: string;
  alcm_twin_id?: string;
  voice_status?: string;
  voice_sample_url?: string;
  organization_id?: string;
  talent_user_id?: string;
  platform_fee_active?: boolean;
  fee_free_window_expires?: string;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
