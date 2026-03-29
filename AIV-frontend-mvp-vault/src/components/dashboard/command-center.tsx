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

// ── Health status config ──────────────────────────────
const HEALTH_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  HEALTHY: { color: "text-emerald-500", icon: CheckCircle2, label: "Healthy" },
  BUILDING: { color: "text-blue-500", icon: Activity, label: "Building" },
  ATTENTION_NEEDED: { color: "text-yellow-500", icon: AlertTriangle, label: "Attention Needed" },
  ACTION_REQUIRED: { color: "text-red-500", icon: AlertCircle, label: "Action Required" },
  UNKNOWN: { color: "text-muted-foreground", icon: Activity, label: "Unknown" },
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
  return map[key] || `${action.replace(/_/g, " ")} ${entityType.replace(/_/g, " ")}`;
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

function getPillarStates(twin: Record<string, unknown>, logs: AuditLog[]): Record<string, PillarInfo> {
  // Derive pillar states from twin data + activity (audit logs)
  // Tracks user effort, not AI scoring — works without ALCM
  const profileEdits = logs.filter((l) => l.action === "UPDATE" && l.entity_type === "twins").length;
  const trainingSessions = logs.filter((l) => l.entity_type === "agent_session" || (l.action === "CREATE" && l.entity_type === "agent_message")).length;
  const fileUploads = logs.filter((l) => l.entity_type === "upload" || l.entity_type === "file").length;
  const corrections = logs.filter((l) => l.entity_type === "training_contribution").length;

  const hasProfile = !!(twin.bio && (twin.bio as string).length > 20);

  return {
    public_profile: {
      state: hasProfile ? "in_progress" : profileEdits > 0 ? "in_progress" : "not_started",
      activityCount: profileEdits + (hasProfile ? 1 : 0),
    },
    voice_identity: {
      state: fileUploads > 0 ? "in_progress" : "not_started",
      activityCount: fileUploads,
    },
    behavioral_model: {
      state: trainingSessions > 0 || corrections > 0 ? "in_progress" : "not_started",
      activityCount: trainingSessions + corrections,
    },
    visual_identity: {
      state: fileUploads > 0 ? "in_progress" : "not_started",
      activityCount: fileUploads,
    },
  };
}

function getPillarStateLabel(state: PillarState): { label: string; color: string } {
  switch (state) {
    case "complete": return { label: "Complete", color: "text-emerald-500" };
    case "in_progress": return { label: "In Progress", color: "text-blue-500" };
    case "not_started": return { label: "Not Started", color: "text-muted-foreground" };
  }
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
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return (user.data?.name || user.name || "").split(" ")[0];
  } catch { return ""; }
}

// ── First-time walkthrough ────────────────────────────
function FirstTimeWalkthrough({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { icon: Sparkles, title: "Train your identity", desc: "Visit the Training Area to add information, upload media, and strengthen your profile." },
    { icon: Briefcase, title: "Attract licensing deals", desc: "As your identity grows stronger, brands and platforms will submit deal inquiries." },
    { icon: TrendingUp, title: "Earn recurring revenue", desc: "Every licensed deal generates revenue. Your identity works for you." },
  ];
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-5">
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

      // Twins
      if (results[0].status === "fulfilled" && results[0].value.length > 0) {
        const t = results[0].value[0] as Record<string, unknown>;
        setTwin(t);
        // Fetch calibration status for this twin
        if (t.id) {
          getCalibrationStatus(t.id as string).then(setCalibrationStatus);
          getComparison(t.id as string).then(setComparison);
        }
      } else if (results[0].status === "rejected") {
        errs.push("identity");
      }

      // Deals
      if (results[1].status === "fulfilled") {
        setDeals(results[1].value);
      } else {
        errs.push("deals");
      }

      // Revenue
      if (results[2].status === "fulfilled") {
        setRevenue(results[2].value);
      } else {
        errs.push("revenue");
      }

      // Audit logs
      if (results[3].status === "fulfilled") {
        setAuditLogs((results[3].value || []).slice(0, 5));
      }

      setErrors(errs);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  // ── No Twin State ───────────────────────────────
  if (!twin) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-6">
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold">Identity setup in progress</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              You started setting up an identity but didn't finish. Pick up where you left off to complete authorization.
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
  const twinName = (twin.display_name as string) || (twin.name as string) || "Your Identity";

  // ── BUILDING Dashboard ──────────────────────────
  if (isBuilding) {
    const pillarStates = getPillarStates(twin, auditLogs);
    const weakest = getWeakestPillar(pillarStates);

    return (
      <div className="space-y-6 p-6">
        {/* Greeting */}
        <h1 className="text-xl font-semibold">{getGreeting()}, {getUserRole() === "manager" ? getUserName() || "there" : (twin.display_name as string)?.split(" ")[0] || "there"}</h1>

        {/* First-time walkthrough */}
        {showWalkthrough && (
          <FirstTimeWalkthrough onDismiss={() => {
            setShowWalkthrough(false);
            localStorage.setItem("aiv_dashboard_seen", "1");
          }} />
        )}

        {/* Identity Status */}
        <Card>
          <CardContent className="flex items-center gap-6 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
              <Shield className="h-7 w-7 text-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{twinName}</h2>
              <div className="mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-blue-500">
                  <Activity className="h-4 w-4" />
                  Building
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 text-xs">
                  Identity Verified & Protected
                </Badge>
              </div>
            </div>
            <Link href="/twin/training-area">
              <Button size="sm">
                <Sparkles className="h-4 w-4 mr-1.5" /> Open Training Area
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Capability Pillars */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identity Strength</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAPABILITY_PILLARS.map((pillar) => {
              const info = pillarStates[pillar.key];
              const { label, color } = getPillarStateLabel(info.state);
              const Icon = pillar.icon;
              return (
                <Card key={pillar.key} className="border-border/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{pillar.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{pillar.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${color}`}>{label}</span>
                      {info.activityCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {info.activityCount} {info.activityCount === 1 ? "action" : "actions"}
                        </span>
                      )}
                    </div>
                    {/* Precision Tuning indicator — behavioral_model pillar only */}
                    {pillar.key === "behavioral_model" && calibrationStatus && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        {!calibrationStatus.has_calibration ? (
                          <Link href="/calibration" className="group flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-500 font-medium group-hover:text-amber-400 transition-colors">
                              Precision Tuning: Pending
                            </span>
                          </Link>
                        ) : !calibrationStatus.completed ? (
                          <Link href="/calibration" className="group flex items-center gap-1.5">
                            <span className="text-[10px] text-blue-500 font-medium group-hover:text-blue-400 transition-colors">
                              Precision Tuning: In Progress ({calibrationStatus.progress}/60)
                            </span>
                          </Link>
                        ) : comparison?.has_sufficient_data && comparison.aligned_count != null ? (
                          <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {comparison.aligned_count === 5 ? "Fully Aligned" : `${comparison.aligned_count}/5 Aligned`}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Precision-Tuned — Awaiting comparison
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Precision Tuning Nudge */}
        {calibrationStatus && !calibrationStatus.has_calibration && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Brain className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Your twin is built from public data. Precision Tuning adds the dimensions only you can provide.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  10 minutes to help your twin understand the real you — not just the public you.
                </p>
              </div>
              <Link href="/calibration">
                <Button size="sm">
                  Start <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Intelligent Guidance */}
        {weakest && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <weakest.icon className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {weakest.key === "voice_identity" && "Upload audio samples to build your voice identity."}
                  {weakest.key === "behavioral_model" && "Start a training session to model your communication style."}
                  {weakest.key === "visual_identity" && "Add professional photos to complete your visual identity."}
                  {weakest.key === "public_profile" && "Add more information to strengthen your public profile."}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The stronger your identity profile, the higher your deal value.
                </p>
              </div>
              <Link href="/twin/training-area">
                <Button size="sm" variant="outline">
                  Get Started <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Training Recency Nudge */}
        {twin.last_training_activity && (() => {
          const daysSince = Math.floor((Date.now() - new Date(twin.last_training_activity as string).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince > 7 ? (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="flex items-center gap-3 py-3">
                <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
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

        {/* Recent Activity */}
        <RecentActivity logs={auditLogs} />
      </div>
    );
  }

  // ── ACTIVE Dashboard ────────────────────────────
  const activeDeals = deals.filter((d) => ["EXECUTED", "ACTIVE"].includes(d.status));
  const pendingDeals = deals.filter((d) => ["SUBMITTED", "UNDER_REVIEW"].includes(d.status));
  const hasRevenue = revenue && revenue.net_revenue > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Greeting */}
      <h1 className="text-xl font-semibold">{getGreeting()}, {getUserRole() === "manager" ? getUserName() || "there" : (twin.display_name as string)?.split(" ")[0] || "there"}</h1>

      {/* Fee-Free Window Countdown */}
      {twin.fee_free_window_expires && (() => {
        const daysLeft = Math.ceil((new Date(twin.fee_free_window_expires as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 && daysLeft <= 30 ? (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 py-3">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Fee-free period ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span> — your first deal or day 90 activates the $997/month platform partnership fee.
              </p>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Identity Status + Revenue */}
      <div className={`grid grid-cols-1 gap-4 ${hasRevenue ? "lg:grid-cols-3" : ""}`}>
        <Card className={hasRevenue ? "lg:col-span-2" : ""}>
          <CardContent className="flex items-center gap-6 py-6">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${healthCfg.color === "text-emerald-500" ? "bg-emerald-500/10" : healthCfg.color === "text-yellow-500" ? "bg-yellow-500/10" : healthCfg.color === "text-red-500" ? "bg-red-500/10" : "bg-muted"}`}>
              <HealthIcon className={`h-7 w-7 ${healthCfg.color}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{twinName}</h2>
              <div className="mt-1 flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-sm font-medium ${healthCfg.color}`}>
                  <HealthIcon className="h-4 w-4" />
                  {healthCfg.label}
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 text-xs">
                  Identity Verified & Protected
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {(twin.last_training_activity as string)
                  ? `Last training activity ${formatDistanceToNow(new Date(twin.last_training_activity as string), { addSuffix: true })}`
                  : "Your digital identity is active and available for licensing."}
              </p>
            </div>
            <Link href="/twin">
              <Button variant="outline" size="sm">
                View Identity <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Revenue — only when meaningful */}
        {hasRevenue && (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Net Revenue
              </div>
              <div className="mt-2 text-3xl font-bold text-emerald-500">
                ${revenue.net_revenue.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {revenue.total_deals} deal{revenue.total_deals !== 1 ? "s" : ""} total
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Urgent Items — pending deals that need action */}
      {pendingDeals.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500" />
              Needs Your Attention ({pendingDeals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...pendingDeals].sort((a, b) => b.value - a.value).slice(0, 3).map((d) => {
                const ageMs = Date.now() - new Date(d.created_at).getTime();
                const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                const ageLabel = ageDays === 0 ? "Today" : ageDays === 1 ? "1 day" : `${ageDays} days`;
                return (
                  <Link key={d.id} href={`/deals/${d.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                      <span className="font-medium">{d.deal_type.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">{ageLabel}</span>
                        <span className="text-muted-foreground">${d.value.toLocaleString()}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}
              {pendingDeals.length > 3 && (
                <Link href="/deals" className="text-xs text-primary hover:underline block pt-1">
                  +{pendingDeals.length - 3} more inquiries
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Deals */}
      {activeDeals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Active Deals ({activeDeals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeDeals.slice(0, 3).map((d) => (
                <Link key={d.id} href={`/deals/${d.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                    <span>{d.deal_type.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500">Active</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium">Certification</p>
              <p className="text-[10px] text-muted-foreground">{twin.certified_at ? "Identity certified" : "Not yet certified"}</p>
            </div>
            <Link href="/twin/certification"><Button variant="ghost" size="sm" className="text-xs h-7">View</Button></Link>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium">Training</p>
              <p className="text-[10px] text-muted-foreground">
                {(twin.last_training_activity as string)
                  ? `Last: ${formatDistanceToNow(new Date(twin.last_training_activity as string), { addSuffix: true })}`
                  : "No sessions yet"}
              </p>
            </div>
            <Link href="/twin/training-area"><Button variant="ghost" size="sm" className="text-xs h-7">Train</Button></Link>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Fingerprint className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium">Identity</p>
              <p className="text-[10px] text-muted-foreground">{healthCfg.label}</p>
            </div>
            <Link href="/twin"><Button variant="ghost" size="sm" className="text-xs h-7">View</Button></Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <RecentActivity logs={auditLogs} />

      {/* Partial failure indicator */}
      {errors.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Some data could not be loaded. Refresh to try again.
        </p>
      )}
    </div>
  );
}

// ── Recent Activity (shared) ──────────────────────────
function RecentActivity({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
              <span className="flex-1 truncate">
                {humanizeAuditLog(log.action, log.entity_type)}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
