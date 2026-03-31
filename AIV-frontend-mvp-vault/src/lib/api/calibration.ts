/**
 * Precision Tuning (BFI-2 Calibration) API client.
 *
 * Maps to the calibration router: /twins/{id}/calibration/
 * Handles the 60-item personality questionnaire lifecycle.
 */
import apiClient from "./client";

export interface CalibrationItem {
  item: number;
  text: string;
  domain?: string;
  domain_label?: string;
}

export interface CalibrationRecord {
  id: string;
  twin_id: string;
  user_id: string;
  progress: number;
  completed: boolean;
  score_extraversion: number | null;
  score_agreeableness: number | null;
  score_conscientiousness: number | null;
  score_negative_emotionality: number | null;
  score_open_mindedness: number | null;
  facet_scores: Record<string, number> | null;
  source: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface CalibrationStatus {
  has_calibration: boolean;
  completed: boolean;
  progress: number;
  calibration_id: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ComparisonTrait {
  name: string;
  display_name: string;
  bfi2_score: number | null;
  alcm_score: number | null;
  confidence?: number;
  aligned: boolean | null;
  status: "aligned" | "divergent" | "insufficient_data";
}

export interface ComparisonResult {
  has_sufficient_data: boolean;
  message?: string;
  traits?: ComparisonTrait[];
  aligned_count?: number;
  divergent_count?: number;
  insufficient_count?: number;
  tier?: "high_alignment" | "moderate" | "full_divergence";
  summary?: string;
  aligned_traits?: string[];
  divergent_traits?: string[];
  bfi2_completed?: boolean;
}

export async function startCalibration(
  twinId: string,
  source: string = "ONBOARDING_INTERSTITIAL"
): Promise<{ calibration: CalibrationRecord; items: CalibrationItem[] } | null> {
  try {
    const res = await apiClient.post(`/twins/${twinId}/calibration/start`, { source });
    return res.data;
  } catch {
    return null;
  }
}

export async function saveResponses(
  twinId: string,
  calId: string,
  responses: { item: number; value: number }[]
): Promise<CalibrationRecord | null> {
  try {
    const res = await apiClient.put(`/twins/${twinId}/calibration/${calId}`, { responses });
    return res.data;
  } catch {
    return null;
  }
}

export async function completeCalibration(
  twinId: string,
  calId: string
): Promise<{ calibration: CalibrationRecord; message: string } | null> {
  try {
    const res = await apiClient.post(`/twins/${twinId}/calibration/${calId}/complete`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getCalibrationStatus(
  twinId: string
): Promise<CalibrationStatus> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/calibration/status`);
    return res.data;
  } catch {
    return { has_calibration: false, completed: false, progress: 0, calibration_id: null };
  }
}

export async function getCalibrations(
  twinId: string
): Promise<CalibrationRecord[]> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/calibration`);
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function getComparison(
  twinId: string
): Promise<ComparisonResult | null> {
  try {
    const res = await apiClient.get(`/twins/${twinId}/calibration/comparison`);
    return res.data;
  } catch {
    return null;
  }
}
