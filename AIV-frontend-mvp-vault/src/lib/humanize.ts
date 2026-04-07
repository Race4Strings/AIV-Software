/**
 * Humanize enum values for display.
 * Design principle #3: "Never show the database."
 */

/** Known AIV enum mappings — explicit, curated labels for every value the UI renders. */
const KNOWN_ENUMS: Record<string, string> = {
  // ── Deal Status ──
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  CONTRACT_SENT: "Contract Sent",
  EXECUTED: "Executed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",

  // ── Deal Type ──
  BRAND_CAMPAIGN: "Brand Campaign",
  CONTENT_CREATION: "Content Creation",
  VOICE_LICENSING: "Voice Licensing",
  GAME_CHARACTER: "Game Character",
  EDUCATIONAL: "Educational",
  CUSTOM: "Custom",

  // ── Twin Status ──
  INITIALIZING: "Initializing",
  BUILDING: "Building",
  PROTECTED_HOLD: "Protected Hold",
  LOCKED: "Locked",
  ARCHIVED: "Archived",

  // ── Twin Health ──
  HEALTHY: "Healthy",
  ATTENTION_NEEDED: "Attention Needed",
  ACTION_REQUIRED: "Action Required",

  // ── Clone Type ──
  PUBLIC_FIGURE: "Public Figure",
  PERSONAL_IDENTITY: "Personal Identity",
  CHARACTER_OR_BRAND: "Character or Brand",

  // ── Identity Category ──
  MUSIC: "Music",
  ENTERTAINMENT: "Entertainment",
  SPORTS: "Sports",
  BUSINESS: "Business",
  ACADEMIA: "Academia",
  CULINARY: "Culinary",
  FASHION: "Fashion",
  MEDIA: "Media",
  GOVERNMENT: "Government",
  WELLNESS: "Wellness",
  ARTS: "Arts",
  CHARACTER: "Character",
  VIRTUAL: "Virtual",

  // ── Consent Scopes ──
  PUBLIC_SCRAPING: "Public Data Discovery",
  AUDIO_VIDEO_ANALYSIS: "Audio & Video Analysis",
  BEHAVIORAL_ANALYSIS: "Behavioral Analysis",
  DATA_PROCESSING: "Data Processing & Storage",
  VISUAL_LICENSING: "Visual Likeness Licensing",
  LIKENESS_LICENSING: "Behavioral & Personality Licensing",
  FULL_LIKENESS: "Full Likeness",
  VOICE_ONLY: "Voice Only",

  // ── Data Scope ──
  identity_profile: "Identity Profile",
  knowledge_base: "Knowledge Base",
  voice_identity: "Voice Identity",
  visual_identity: "Visual Identity",

  // ── Invoice / Payment Status ──
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
  FAILED: "Failed",
  PROCESSING: "Processing",

  // ── Training Contribution ──
  AUTO_APPROVED: "Auto-Approved",
  PENDING_APPROVAL: "Pending Approval",
  REJECTED: "Rejected",
  CLASSIFIED: "Classified",
  APPLIED: "Applied",

  // ── Misuse Detection ──
  DETECTED: "Detected",
  CONFIRMED: "Confirmed",
  FALSE_POSITIVE: "False Positive",
  ENFORCEMENT_SENT: "Enforcement Sent",
  RESOLVED: "Resolved",

  // ── Client Validation ──
  ACCEPTED: "Accepted",
  FLAGGED: "Flagged",
  RESTRICTED: "Restricted",

  // ── Onboarding ──
  in_progress: "In Progress",
  completed: "Completed",
  abandoned: "Abandoned",
  DISCOVERY: "Discovery",
  CONTENT_INGESTION: "Content Ingestion",
  PROFILE_REVIEW: "Profile Review",
  FILE_UPLOAD: "File Upload",
  RIGHTS_AGREEMENT: "Rights Agreement",
  GATE_APPROVAL: "Gate Approval",
  COMPLETE: "Complete",
  AIV_ASSISTED: "AIV-Assisted",
  MANUAL: "Manual",
  HYBRID: "Hybrid",
};

/**
 * Convert a raw enum/constant value to a human-readable label.
 *
 * 1. Checks the curated mapping first (exact match).
 * 2. Falls back to generic SCREAMING_CASE → Title Case conversion.
 *
 * @example
 * humanizeEnum("BRAND_CAMPAIGN")   // "Brand Campaign"
 * humanizeEnum("PUBLIC_FIGURE")    // "Public Figure"
 * humanizeEnum("UNKNOWN_VALUE")    // "Unknown Value" (fallback)
 */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "";

  const known = KNOWN_ENUMS[value];
  if (known) return known;

  // Fallback: SCREAMING_CASE → Title Case
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
