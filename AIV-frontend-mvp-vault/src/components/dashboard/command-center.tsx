"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, Briefcase, Activity, ArrowRight, Loader2,
  CheckCircle2, AlertTriangle, AlertCircle, Plus,
  Fingerprint, Mic, Brain, Eye, Clock, TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchTwins } from "@/lib/api/twins";
import { licensingApi, type Deal, type RevenueSummary } from "@/lib/api/licensing";
import { fetchAuditLogs, type AuditLog } from "@/lib/api/audit";
import { getCalibrationStatus, getComparison, type CalibrationStatus, type ComparisonResult } from "@/lib/api/calibration";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeEnum } from "@/lib/humanize";

// ── Health status config ──────────────────────────────
const HEALTH_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof CheckCircle2; label: string; description: string }> = {
  HEALTHY: { color: "text-success", bgColor: "bg-success/10", icon: CheckCircle2, label: "Healthy", description: "Your identity profile is accurate, data coverage is strong, and the personality model is confident. Ready for licensing." },
  BUILDING: { color: "text-primary", bgColor: "bg-primary/10", icon: Activity, label: "Building", description: "Your identity is being assembled from public data and your training sessions. Continue training to unlock licensing." },
  ATTENTION_NEEDED: { color: "text-warning", bgColor: "bg-warning/10", icon: AlertTriangle, label: "Attention Needed", description: "Some identity dimensions have low coverage. Visit the Training Area to strengthen weak areas." },
  ACTION_REQUIRED: { color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertCircle, label: "Action Required", description: "Critical gaps detected in your identity profile. Training is needed before deals can proceed reliably." },
  UNKNOWN: { color: "text-muted-foreground", bgColor: "bg-muted", icon: Activity, label: "Unknown", description: "Health status is being calculated." },
};

// ── Audit log humanization ────────────────────────────
function humanizeAuditLog(action: string, entityType: string): string {
  const key = `${action}_${entityType}`.toLowerCase();
  const map: Record<string, string> = {
    "create_onboarding_session": "Started identity onboarding",
    "approve_gate_2_authorization": "Authorized identity for commercial use",
    "approve_gate_1": "Manager approval confirmed",
    "create_twins": "Created digital identity",
    "create_deal": "New deal inquiry received",
    "update_deal": "Deal status updated",
    "create_certification": "Identity certified",
    "create_consent_record": "Consent recorded",
    "update_twins": "Identity profile updated",
    "create_agent_session": "Training session started",
  };
  return map[key] || `${humanizeEnum(action)} ${humanizeEnum(entityType)}`;
}

// ── Capability pillars (BUILDING state) ───────────────
const CAPABILITY_PILLARS = [
  { key: "public_profile", label: "Public Profile", icon: Fingerprint, desc: "Biographical data, social presence, public information" },
  { key: "voice_identity", label: "Voice Identity", icon: Mic, desc: "Audio samples, vocal patterns, speech characteristics" },
  { key: "behavioral_model", label: "Behavioral Model", icon: Brain, desc: "Values, communication style, personality patterns" },
  { key: "visual_identity", label: "Visual Identity", icon: Eye, desc: "Professional photos, visual references, likeness data" },
];

type PillarState = "complete" | "in_progress" | "not_started";

interface PillarInfo {
  state: PillarState;
  activityCount: number;
}

function getPillarStates(
  twin: Record<string, unknown>,
  logs: AuditLog[],
  calibrationStatus: CalibrationStatus | null,
  comparison: ComparisonResult | null,
): Record<string, PillarInfo> {
  const profileEdits = logs.filter((l) => l.action === "UPDATE" && l.entity_type === "twins").length;
  const trainingSessions = logs.filter((l) => l.entity_type === "agent_session" || (l.action === "CREATE" && l.entity_type === "agent_message")).length;
  const fileUploads = logs.filter((l) => l.entity_type === "upload" || l.entity_type === "file").length;
  const corrections = logs.filter((l) => l.entity_type === "training_contribution").length;

  const hasProfile = !!(twin.bio && (twin.bio as string).length > 20);
  const hasName = !!(twin.name || twin.display_name);
  const hasCategory = !!(twin.category);
  const socialProfiles = (twin.social_profiles as unknown[] | undefined) || [];
  const hasSufficientSocials = socialProfiles.length >= 3;

  const voiceStatus = (twin as Record<string, unknown>).voice_status as string | undefined;
  const voiceReady = voiceStatus === "ready";
  const hasVoiceSample = fileUploads > 0;
  const visualUploads = fileUploads;

  const calibrationCompleted = calibrationStatus?.completed === true;
  const calibrationAligned = comparison?.has_sufficient_data && comparison.aligned_count === 5;

  const publicProfileComplete = hasName && hasProfile && hasCategory && hasSufficientSocials;
  const publicProfileState: PillarState = publicProfileComplete
    ? "complete"
    : (hasProfile || profileEdits > 0) ? "in_progress" : "not_started";

  const voiceState: PillarState = voiceReady
    ? "complete"
    : (hasVoiceSample || voiceStatus === "processing" || voiceStatus === "pending")
      ? "in_progress"
      : "not_started";
  const voiceActivityCount = (hasVoiceSample ? 1 : 0) + (voiceReady ? 1 : 0);

  const behavioralComplete = calibrationCompleted && (trainingSessions > 0 || calibrationAligned);
  const behavioralState: PillarState = behavioralComplete
    ? "complete"
    : (trainingSessions > 0 || corrections > 0 || calibrationStatus?.has_calibration)
      ? "in_progress"
      : "not_started";

  const visualState: PillarState = visualUploads >= 3
    ? "complete"
    : visualUploads > 0
      ? "in_progress"
      : "not_started";

  return {
    public_profile: {
      state: publicProfileState,
      activityCount: profileEdits + (hasProfile ? 1 : 0),
    },
    voice_identity: {
      state: voiceState,
      activityCount: voiceActivityCount,
    },
    behavioral_model: {
      state: behavioralState,
      activityCount: trainingSessions + corrections,
    },
    visual_identity: {
      state: visualState,
      activityCount: visualUploads,
    },
  };
}

function getWeakestPillar(states: Record<string, PillarInfo>): typeof CAPABILITY_PILLARS[number] | null {
  for (const pillar of CAPABILITY_PILLARS) {
    if (states[pillar.key].state === "not_started") return pillar;
  }
  for (const pillar of CAPABILITY_PILLARS) {
    if (states[pillar.key].state === "in_progress") return pillar;
  }
  return null;
}

// ── Greeting ──────────────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ── Role context ──────────────────────────────────────
function getUserRole(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("aiv_user_role") || "";
}

function getUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = localStorage.getItem("user");
    if (!stored) return "";
    const user = JSON.parse(stored);
    return (user.data?.name || user.name || "").split(" ")[0];
  } catch { return ""; }
}

/** Resolve the display name for the greeting: manager name or talent first name. */
function getDisplayName(twin: Record<string, unknown>): string {
  if (getUserRole() === "manager") return getUserName() || "there";
  return ((twin.display_name as string) || (twin.name as string) || "").split(" ")[0] || "there";
}

// ── Pipeline stage grouping ──────────────────────────
const PIPELINE_STAGES: { label: string; statuses: string[]; dotColor: string }[] = [
  { label: "Pending Review", statuses: ["SUBMITTED", "UNDER_REVIEW"], dotColor: "bg-warning" },
  { label: "Approved", statuses: ["APPROVED", "CONTRACT_SENT"], dotColor: "bg-primary" },
  { label: "Active", statuses: ["EXECUTED", "ACTIVE"], dotColor: "bg-success" },
  { label: "Completed", statuses: ["COMPLETED"], dotColor: "bg-muted-foreground" },
];

// ── First-time walkthrough ────────────────────────────
function FirstTimeWalkthrough({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: Sparkles, title: "Train your identity", desc: "Visit the Training Area to add information, upload media, and strengthen your profile." },
    { icon: Briefcase, title: "Attract licensing deals", desc: "As your identity grows stronger, brands and platforms will submit deal inquiries." },
    { icon: TrendingUp, title: "Earn recurring revenue", desc: "Every licensed deal generates revenue. Your identity works for you." },
  ];
  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Welcome to your dashboard</h3>
          <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────
export function CommandCenter() {
  const [twin, setTwin] = useState<Record<string, unknown> | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [showWalkthrough, setShowWalkthrough] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("aiv_dashboard_seen");
  });

  useEffect(() => {
    Promise.allSettled([
      fetchTwins(),
      licensingApi.getDeals(),
      licensingApi.getRevenue(),
      fetchAuditLogs(""),
    ]).then((results) => {
      const errs: string[] = [];

      if (results[0].status === "fulfilled" && results[0].value.length > 0) {
        const t = results[0].value[0] as unknown as Record<string, unknown>;
        setTwin(t);
        if (t.id) {
          getCalibrationStatus(t.id as string).then(setCalibrationStatus);
          getComparison(t.id as string).then(setComparison);
        }
      } else if (results[0].status === "rejected") {
        errs.push("identity");
      }

      if (results[1].status === "fulfilled") {
        setDeals(results[1].value);
      } else {
        errs.push("deals");
      }

      if (results[2].status === "fulfilled") {
        setRevenue(results[2].value);
      } else {
        errs.push("revenue");
      }

      if (results[3].status === "fulfilled") {
        setAuditLogs((results[3].value || []).slice(0, 8));
      }

      setErrors(errs);
      setLoading(false);
    });
  }, []);

  // ── Loading skeleton ───────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" style={{ animationDelay: `${(i - 1) * 75}ms` }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="lg:col-span-2 h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── No Twin State ───────────────────────────────
  if (!twin) {
    return (
      <div className="p-6">
        <Card className="border-dashed shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Create your first identity</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Set up a digital identity to start protecting and licensing. Your identity is captured, verified, and made available for commercial use.
            </p>
            <Link href="/onboard" className="mt-6">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create Identity
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const twinStatus = (twin.status as string) || "INITIALIZING";
  const healthStatus = (twin.health_status as string) || "BUILDING";

  // ── INITIALIZING State (mid-onboarding) ─────────
  if (twinStatus === "INITIALIZING") {
    return (
      <div className="p-6">
        <Card className="shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Identity setup in progress</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              You started setting up an identity but didn&apos;t finish. Pick up where you left off to complete authorization.
            </p>
            <Link href="/onboard" className="mt-6">
              <Button>
                Continue Setup <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBuilding = twinStatus === "BUILDING";
  const healthCfg = HEALTH_CONFIG[healthStatus] || HEALTH_CONFIG.UNKNOWN;
  const HealthIcon = healthCfg.icon;
  const displayName = getDisplayName(twin);

  // Deal classifications
  const activeDeals = deals.filter((d) => !["EXPIRED", "TERMINATED", "COMPLETED"].includes(d.status));
  const totalDeals = deals.length;
  const netRevenue = revenue?.net_revenue ?? 0;
  const conversionRate = totalDeals > 0 ? Math.round((activeDeals.length / totalDeals) * 100) : 0;

  // ── BUILDING Dashboard ──────────────────────────
  if (isBuilding) {
    const pillarStates = getPillarStates(twin, auditLogs, calibrationStatus, comparison);
    const weakest = getWeakestPillar(pillarStates);

    return (
      <div className="space-y-4 p-6">
        {/* Greeting */}
        <h1 className="text-xl font-semibold">{getGreeting()}, {displayName}</h1>

        {/* First-time walkthrough */}
        {showWalkthrough && (
          <FirstTimeWalkthrough onDismiss={() => {
            setShowWalkthrough(false);
            localStorage.setItem("aiv_dashboard_seen", "1");
          }} />
        )}

        {/* Row 1: Three KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Identity Status */}
          <Card className="shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Shield className="h-4 w-4" />
                Identity Status
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold text-primary">Building</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {twin.certified_at ? "Identity verified and protected" : "Complete training to unlock licensing"}
              </p>
            </CardContent>
          </Card>

          {/* Identity Health */}
          <Card className="shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Fingerprint className="h-4 w-4" />
                Identity Health
              </div>
              <div className="flex items-center gap-2">
                <HealthIcon className={`h-5 w-5 ${healthCfg.color}`} />
                <span className={`text-lg font-bold ${healthCfg.color}`}>{healthCfg.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{healthCfg.description}</p>
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card className="shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Sparkles className="h-4 w-4" />
                Training Progress
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {Object.values(pillarStates).filter((p) => p.state === "complete").length}/4
                </span>
                <span className="text-sm text-muted-foreground">pillars complete</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {weakest ? `Next: ${weakest.label}` : "All pillars complete"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Capability Pillars (left 2/3) + Activity (right 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Capability Pillars */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4" />
                  Identity Strength
                </CardTitle>
                <Link href="/twin/training-area">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Open Training Area <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {CAPABILITY_PILLARS.map((pillar) => {
                  const info = pillarStates[pillar.key];
                  const Icon = pillar.icon;
                  const stateConfig = {
                    complete: { label: "Complete", color: "text-success", bg: "bg-success", width: "100%" },
                    in_progress: { label: "In Progress", color: "text-primary", bg: "bg-primary", width: "50%" },
                    not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted-foreground", width: "0%" },
                  }[info.state];

                  return (
                    <div key={pillar.key} className="flex items-center gap-3 py-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{pillar.label}</span>
                          <span className={`text-xs font-medium ${stateConfig.color}`}>{stateConfig.label}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stateConfig.bg} transition-all duration-500`}
                            style={{ width: stateConfig.width }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Precision Tuning row */}
                {calibrationStatus && (
                  <div className="pt-2 mt-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Precision Tuning</span>
                      {!calibrationStatus.has_calibration ? (
                        <Link href="/calibration" className="text-xs text-warning font-medium hover:underline">
                          Pending — Start now
                        </Link>
                      ) : !calibrationStatus.completed ? (
                        <Link href="/calibration" className="text-xs text-primary font-medium hover:underline">
                          In Progress ({calibrationStatus.progress}/60)
                        </Link>
                      ) : comparison?.has_sufficient_data && comparison.aligned_count != null ? (
                        <span className="text-xs text-success font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {comparison.aligned_count === 5 ? "Fully Aligned" : `${comparison.aligned_count}/5 Aligned`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">
                          Awaiting comparison
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{humanizeAuditLog(log.action, log.entity_type)}</p>
                        <p className="text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No activity yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href="/twin/training-area">
            <Button size="sm" variant="outline" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Training Area
            </Button>
          </Link>
          <Link href="/deals">
            <Button size="sm" variant="outline" className="text-xs">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Deals
            </Button>
          </Link>
          <Link href="/twin/certification">
            <Button size="sm" variant="outline" className="text-xs">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Certification
            </Button>
          </Link>
          {calibrationStatus && !calibrationStatus.has_calibration && (
            <Link href="/calibration">
              <Button size="sm" className="text-xs">
                <Brain className="h-3.5 w-3.5 mr-1.5" /> Start Precision Tuning
              </Button>
            </Link>
          )}
        </div>

        {/* Partial failure indicator */}
        {errors.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Some data could not be loaded. Refresh to try again.
          </p>
        )}
      </div>
    );
  }

  // ── ACTIVE Dashboard (portfolio-first status wall) ──
  // Group deals by pipeline stage (only non-terminated/expired)
  const pipelineDeals = deals.filter((d) => !["EXPIRED", "TERMINATED"].includes(d.status));

  return (
    <div className="space-y-4 p-6">
      {/* Greeting */}
      <h1 className="text-xl font-semibold">{getGreeting()}, {displayName}</h1>

      {/* First-time walkthrough */}
      {showWalkthrough && (
        <FirstTimeWalkthrough onDismiss={() => {
          setShowWalkthrough(false);
          localStorage.setItem("aiv_dashboard_seen", "1");
        }} />
      )}

      {/* Fee-Free Window Countdown */}
      {twin.fee_free_window_expires && (() => {
        const daysLeft = Math.ceil((new Date(twin.fee_free_window_expires as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 && daysLeft <= 30 ? (
          <Card className="border-warning/20 bg-warning/5 shadow-md">
            <CardContent className="flex items-center gap-3 py-3">
              <Clock className="h-4 w-4 text-warning shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Fee-free period ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span> — your first deal or day 90 activates the $997/month platform partnership fee.
              </p>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Training recency nudge */}
      {twin.last_training_activity && (() => {
        const daysSince = Math.floor((Date.now() - new Date(twin.last_training_activity as string).getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 7 ? (
          <Card className="border-warning/20 bg-warning/5 shadow-md">
            <CardContent className="flex items-center gap-3 py-3">
              <Clock className="h-4 w-4 text-warning shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                Your last training session was {daysSince} days ago. Regular training strengthens your identity profile.
              </p>
              <Link href="/twin/training-area">
                <Button size="sm" variant="outline" className="text-xs">Resume Training</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Row 1: Three KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Net Revenue */}
        <Card className="shadow-md">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              Net Revenue
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums">
              ${netRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              across {totalDeals} deal{totalDeals !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card className="shadow-md">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Briefcase className="h-4 w-4" />
              Active Deals
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums">
              {activeDeals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        {/* Identity Health */}
        <Card className="shadow-md">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Fingerprint className="h-4 w-4" />
              Identity Health
            </div>
            <div className="flex items-center gap-2">
              <HealthIcon className={`h-5 w-5 ${healthCfg.color}`} />
              <span className={`text-lg font-bold ${healthCfg.color}`}>{healthCfg.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{healthCfg.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Pipeline (2/3) + Activity Feed (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Deal Pipeline */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4" />
                Deal Pipeline
              </CardTitle>
              <Link href="/deals">
                <Button size="sm" variant="outline" className="text-xs h-7">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pipelineDeals.length > 0 ? (
              <div className="space-y-3">
                {PIPELINE_STAGES.map((stage) => {
                  const stageDeals = pipelineDeals.filter((d) => stage.statuses.includes(d.status));
                  if (stageDeals.length === 0) return null;

                  return (
                    <div key={stage.label}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
                        <span className="text-xs font-medium text-muted-foreground">{stage.label} ({stageDeals.length})</span>
                      </div>
                      <div className="space-y-1">
                        {stageDeals.slice(0, 3).map((d) => (
                          <Link key={d.id} href={`/deals/${d.id}`} className="block">
                            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium truncate">{humanizeEnum(d.deal_type)}</span>
                                <Badge variant="outline" className="text-xs shrink-0">{humanizeEnum(d.status)}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground font-mono tabular-nums shrink-0 ml-2">
                                ${d.value.toLocaleString()}
                              </span>
                            </div>
                          </Link>
                        ))}
                        {stageDeals.length > 3 && (
                          <Link href="/deals" className="text-xs text-primary hover:underline block pl-3">
                            +{stageDeals.length - 3} more
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No active deals in pipeline</p>
                <p className="text-xs text-muted-foreground mt-1">Deals will appear here once inquiries are submitted</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{humanizeAuditLog(log.action, log.entity_type)}</p>
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/twin/training-area">
          <Button size="sm" variant="outline" className="text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Training Area
          </Button>
        </Link>
        <Link href="/deals">
          <Button size="sm" variant="outline" className="text-xs">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Deals
          </Button>
        </Link>
        <Link href="/twin/certification">
          <Button size="sm" variant="outline" className="text-xs">
            <Shield className="h-3.5 w-3.5 mr-1.5" /> Certification
          </Button>
        </Link>
      </div>

      {/* Partial failure indicator */}
      {errors.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Some data could not be loaded. Refresh to try again.
        </p>
      )}
    </div>
  );
}
