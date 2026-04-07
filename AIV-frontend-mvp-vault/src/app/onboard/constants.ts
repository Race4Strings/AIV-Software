import {
  Search, Shield, UserCheck,
  Globe, Mic, Eye, Brain, Database,
} from "lucide-react";

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────

export const STEPS = [
  { label: "Discovery", icon: Search },
  { label: "Review & Consent", icon: Shield },
  { label: "Authorize", icon: UserCheck },
];

export const TOTAL_STEPS = STEPS.length;

export const PROFILE_CONSENTS = [
  { key: "PUBLIC_SCRAPING", label: "Public data discovery", desc: "Analyze public information to build your identity foundation", icon: Globe },
  { key: "AUDIO_VIDEO_ANALYSIS", label: "Audio & video analysis", desc: "Analyze uploaded media to create your voice and visual profile", icon: Mic },
  { key: "BEHAVIORAL_ANALYSIS", label: "Behavioral analysis", desc: "Model your communication style, values, and personality", icon: Brain },
  { key: "DATA_PROCESSING", label: "Data processing & storage", desc: "Securely process and store your identity data on AIV infrastructure", icon: Database, required: true },
];

export const LICENSING_CONSENTS = [
  { key: "VOICE_LICENSING", label: "Commercial licensing \u2014 Voice", desc: "Allow your voice identity to be licensed to clients", icon: Mic },
  { key: "VISUAL_LICENSING", label: "Commercial licensing \u2014 Likeness", desc: "Allow your visual likeness to be licensed to clients", icon: Eye },
  { key: "LIKENESS_LICENSING", label: "Commercial licensing \u2014 Behavioral & Personality", desc: "Allow your behavioral and personality model to be licensed to clients", icon: Brain },
];

export const ALL_CONSENTS = [...PROFILE_CONSENTS, ...LICENSING_CONSENTS];

export const HEALTH_LABELS: Record<string, { label: string; desc: string }> = {
  cfs: { label: "Profile Accuracy", desc: "How accurately your twin represents you" },
  psychographic_coverage: { label: "Data Completeness", desc: "How much of your personality has been captured" },
  personality_confidence: { label: "Model Reliability", desc: "Statistical confidence in your personality model" },
};

export const IDENTITY_CATEGORIES = [
  { key: "MUSIC", label: "Music" },
  { key: "ENTERTAINMENT", label: "Entertainment" },
  { key: "SPORTS", label: "Sports" },
  { key: "BUSINESS", label: "Business" },
  { key: "ACADEMIA", label: "Academia" },
  { key: "CULINARY", label: "Culinary" },
  { key: "FASHION", label: "Fashion" },
  { key: "MEDIA", label: "Media" },
  { key: "GOVERNMENT", label: "Government" },
  { key: "WELLNESS", label: "Wellness" },
  { key: "ARTS", label: "Arts" },
  { key: "CHARACTER", label: "Character" },
  { key: "VIRTUAL", label: "Virtual" },
];

export const CLONE_TYPES = [
  { key: "PERSONAL_IDENTITY", label: "Personal Identity", desc: "A living individual's identity" },
  { key: "CHARACTER_OR_BRAND", label: "Character or Brand", desc: "A fictional character, brand persona, or designed identity" },
];

export const DISCOVERY_STAGES = [
  "Searching public profiles...",
  "Gathering public content and interviews...",
  "Building initial identity profile...",
  "Finalizing results...",
];

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

type ApiError = { response?: { data?: { detail?: string } } };
export function getErrorMsg(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.detail || fallback;
}
