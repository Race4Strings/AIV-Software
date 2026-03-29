"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileUp, UserCheck, Shield, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Sparkles, Upload, AlertTriangle,
  X, Globe, Mic, Eye, Brain, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";
import { uploadApi } from "@/lib/api/upload";

// ──────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────

const STEPS = [
  { label: "Discovery", icon: Search },
  { label: "Review", icon: Sparkles },
  { label: "Assets", icon: Upload },
  { label: "Consents", icon: Shield },
  { label: "Authorize", icon: UserCheck },
];

const TOTAL_STEPS = STEPS.length;

const PROFILE_CONSENTS = [
  { key: "PUBLIC_SCRAPING", label: "Public data discovery", desc: "Analyze public information to build your identity foundation", icon: Globe },
  { key: "AUDIO_VIDEO_ANALYSIS", label: "Audio & video analysis", desc: "Analyze uploaded media to create your voice and visual profile", icon: Mic },
  { key: "BEHAVIORAL_ANALYSIS", label: "Behavioral analysis", desc: "Model your communication style, values, and personality", icon: Brain },
  { key: "DATA_PROCESSING", label: "Data processing & storage", desc: "Securely process and store your identity data on AIV infrastructure", icon: Database, required: true },
];

const LICENSING_CONSENTS = [
  { key: "VOICE_LICENSING", label: "Commercial licensing \u2014 Voice", desc: "Allow your voice identity to be licensed to clients", icon: Mic },
  { key: "VISUAL_LICENSING", label: "Commercial licensing \u2014 Likeness", desc: "Allow your visual likeness to be licensed to clients", icon: Eye },
  { key: "LIKENESS_LICENSING", label: "Commercial licensing \u2014 Behavioral & Personality", desc: "Allow your behavioral and personality model to be licensed to clients", icon: Brain },
];

const ALL_CONSENTS = [...PROFILE_CONSENTS, ...LICENSING_CONSENTS];

const HEALTH_LABELS: Record<string, { label: string; desc: string }> = {
  cfs: { label: "Profile Accuracy", desc: "How accurately your twin represents you" },
  psychographic_coverage: { label: "Data Completeness", desc: "How much of your personality has been captured" },
  personality_confidence: { label: "Model Reliability", desc: "Statistical confidence in your personality model" },
};

const IDENTITY_CATEGORIES = [
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

const CLONE_TYPES = [
  { key: "PERSONAL_IDENTITY", label: "Personal Identity", desc: "A living individual's identity" },
  { key: "CHARACTER_OR_BRAND", label: "Character or Brand", desc: "A fictional character, brand persona, or designed identity" },
];

const DISCOVERY_STAGES = [
  "Searching social media profiles...",
  "Analyzing public content and interviews...",
  "Building initial identity profile...",
  "Finalizing results...",
];

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

type ApiError = { response?: { data?: { detail?: string } } };
function getErrorMsg(err: unknown, fallback: string): string {
  return (err as ApiError)?.response?.data?.detail || fallback;
}

// ──────────────────────────────────────────────────────
// Main Page — 5-step onboarding flow
//
// Step 0: Discovery (enter name/handle)
// Step 1: Review (read-only foundation profile)
// Step 2: Assets (upload identity media)
// Step 3: Consents & Confirmation (grouped consents + self-manager Gate 1)
// Step 4: Authorize (full summary + Gate 2)
// ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Role context — determines language adaptation
  const [userRole, setUserRole] = useState<string>("");
  const isManager = userRole === "manager";

  // Session state
  const [sessionId, setSessionId] = useState("");
  const [twinId, setTwinId] = useState("");

  // Step 0: Discovery
  const [discoveryInput, setDiscoveryInput] = useState("");

  // Step 1: Review
  const [discoveryResults, setDiscoveryResults] = useState<Record<string, unknown> | null>(null);
  const [discoveryPolling, setDiscoveryPolling] = useState(false);
  const [discoveryStage, setDiscoveryStage] = useState(0);
  const [isMockData, setIsMockData] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ display_name: "", bio: "" });

  // Step 2: Upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Identity Classification + Consents
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cloneType, setCloneType] = useState("PERSONAL_IDENTITY");
  const [consents, setConsents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ALL_CONSENTS.forEach((c) => { initial[c.key] = false; });
    return initial;
  });

  // Step 4: Authorize
  const [authorized, setAuthorized] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // ──────────────────────────────────────────────────────
  // Session Resume
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    // Load user role for adaptive language
    const savedRole = localStorage.getItem("aiv_user_role");
    if (savedRole) setUserRole(savedRole);

    let cancelled = false;
    async function checkActiveSession() {
      try {
        const res = await apiClient.get("/onboarding/sessions/active");
        if (cancelled || !res.data) { setInitialLoading(false); return; }
        const session = res.data;
        setSessionId(session.id);
        setTwinId(session.twin_id || "");
        if (session.discovery_input) setDiscoveryInput(session.discovery_input);
        if (session.twin?.display_name) setProfileDraft((d) => ({ ...d, display_name: session.twin.display_name }));
        if (session.twin?.bio) setProfileDraft((d) => ({ ...d, bio: session.twin.bio }));

        // Map session status to step (5-step flow)
        const statusMap: Record<string, number> = {
          DISCOVERY: 1,
          PROFILE_REVIEW: 1,
          CONTENT_INGESTION: 2,
          FILE_UPLOAD: 3,
          RIGHTS_AGREEMENT: 3,
          GATE_APPROVAL: 4,
        };
        const resumeStep = statusMap[session.status] ?? 0;
        if (resumeStep > 0) {
          setStep(resumeStep);
          if (resumeStep === 1) setDiscoveryPolling(true);
          toast.info(`Welcome back \u2014 resuming from step ${resumeStep + 1}.`);
        }
      } catch {
        // No active session
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }
    checkActiveSession();
    return () => { cancelled = true; };
  }, []);

  // ──────────────────────────────────────────────────────
  // Step 0: Start Discovery
  // ──────────────────────────────────────────────────────
  async function startDiscovery() {
    if (!discoveryInput.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/onboarding/start", {
        discovery_input: discoveryInput.trim(),
        onboarding_path: "HYBRID",
      });
      setSessionId(res.data.id);
      setTwinId(res.data.twin_id || "");
      setStep(1);
      setDiscoveryPolling(true);
      setDiscoveryStage(0);
    } catch (err: unknown) {
      toast.error(getErrorMsg(err, "Failed to start discovery. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  // Animated discovery stages
  useEffect(() => {
    if (!discoveryPolling) return;
    const timers = DISCOVERY_STAGES.map((_, i) =>
      setTimeout(() => setDiscoveryStage(i), i * 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [discoveryPolling]);

  // Poll for discovery results
  useEffect(() => {
    if (!discoveryPolling || !sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await apiClient.get(`/onboarding/${sessionId}/discovery-results`);
        if (cancelled) return;
        setDiscoveryResults(res.data);
        if (res.data.status === "ready") {
          setDiscoveryPolling(false);
          setIsMockData(!!res.data.mock);
          const twin = res.data.twin || {};
          setProfileDraft({
            display_name: (twin.display_name as string) || discoveryInput.split("/").pop()?.replace("@", "").trim() || "",
            bio: (twin.bio as string) || "",
          });
          // Pre-populate category from detection (user can change in Step 3)
          const detected = (res.data.detected_categories as string[]) || [];
          if (detected.length > 0 && !selectedCategory) {
            setSelectedCategory(detected[0]);
          }
        }
      } catch {
        // Keep polling
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [discoveryPolling, sessionId, discoveryInput]);

  // ──────────────────────────────────────────────────────
  // Step 1: Confirm Profile
  // ──────────────────────────────────────────────────────
  async function confirmProfile() {
    setLoading(true);
    try {
      if (twinId && (profileDraft.display_name || profileDraft.bio)) {
        try {
          await apiClient.put(`/twins/${twinId}`, {
            display_name: profileDraft.display_name,
            bio: profileDraft.bio,
          });
        } catch (err: unknown) {
          toast.error(getErrorMsg(err, "Failed to save profile changes. You can update this later."));
        }
      }
      await apiClient.post(`/onboarding/${sessionId}/confirm-profiles`, {
        confirmed_profiles: discoveryResults?.discovered_profiles || [],
      });
      setStep(2);
    } catch {
      toast.error("Failed to confirm profile.");
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Step 2: Upload Files
  // ──────────────────────────────────────────────────────
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleUpload() {
    if (files.length === 0) {
      await apiClient.post(`/onboarding/${sessionId}/upload`).catch(() => {});
      setStep(3);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await uploadApi.uploadFile(file, "onboarding");
      }
      await apiClient.post(`/onboarding/${sessionId}/upload`).catch(() => {});
      toast.success(`${files.length} file(s) uploaded`);
      setStep(3);
    } catch {
      toast.error("Upload failed. Check file size (max 50MB) and try again.");
    } finally {
      setUploading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Step 3: Submit Consents + Gate 1 (combined)
  // ──────────────────────────────────────────────────────
  function selectAllConsents(group: typeof PROFILE_CONSENTS | typeof LICENSING_CONSENTS) {
    const updates: Record<string, boolean> = {};
    group.forEach((c) => { updates[c.key] = true; });
    setConsents((prev) => ({ ...prev, ...updates }));
  }

  async function submitConsentsAndGate1() {
    if (!consents.DATA_PROCESSING) {
      toast.error("Data processing consent is required to create your identity profile.");
      return;
    }
    const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
    if (grantedConsents.length === 0) {
      toast.error("At least one consent must be granted to proceed.");
      return;
    }
    setLoading(true);
    try {
      // Submit rights with user-selected category
      await apiClient.post(`/onboarding/${sessionId}/rights`, {
        identity_category: selectedCategory || "ENTERTAINMENT",
        successor: null,
        consents: grantedConsents,
      });
      // Auto-approve Gate 1 (self-manager)
      await apiClient.post(`/onboarding/${sessionId}/gate-1`, { approved: true });
      setStep(4);
    } catch (err: unknown) {
      toast.error(getErrorMsg(err, "Failed to save consents."));
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Step 4: Authorize (Gate 2)
  // ──────────────────────────────────────────────────────
  async function submitGate2() {
    setLoading(true);
    try {
      const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
      const res = await apiClient.post(`/onboarding/${sessionId}/gate-2`, {
        approved: true,
        consents: grantedConsents,
      });
      setAuthorized(true);
      if (res.data.readiness_warnings?.length > 0) {
        toast.info(`Note: ${res.data.readiness_warnings.join(". ")}. You can improve in the Training Area.`);
      }
      setTimeout(() => setShowButtons(true), 2000);
    } catch (err: unknown) {
      toast.error(getErrorMsg(err, "Authorization failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Progress Bar
  // ──────────────────────────────────────────────────────
  function ProgressBar() {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step || authorized;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                  isActive ? "border-primary bg-primary/10 text-primary" :
                  "border-border text-muted-foreground"
                }`}>
                  {isDone && !isActive ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((authorized ? TOTAL_STEPS : step) / TOTAL_STEPS) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">Step {step + 1} of {TOTAL_STEPS}</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in duration-700">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"][i % 5],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>

        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Identity authorized</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your digital identity is now protected and building.</p>
        <p className="mt-3 text-sm text-muted-foreground max-w-md">
          Your identity is secured with cryptographic verification and blockchain-anchored proof of ownership. Your Licensing Portal is open.
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          {isManager
            ? "One more step: have the talent complete Precision Tuning to calibrate their digital twin with maximum accuracy."
            : "One more step: a quick session to help your twin understand the real you — not just the public you."}
        </p>
        {showButtons && (
          <div className="flex flex-col gap-3 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Button size="lg" onClick={() => router.push("/calibration")}>
              <Brain className="h-4 w-4 mr-2" /> Start Precision Tuning
            </Button>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll do this later &rarr;
            </button>
          </div>
        )}
      </div>
    );
  }

  const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
  const health = discoveryResults?.health as Record<string, number> | undefined;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <ProgressBar />

      {/* Safety message — shown on all steps */}
      {step === 0 && (
        <p className="text-xs text-muted-foreground text-center mb-6">
          You can leave at any time and continue from where you left off.
        </p>
      )}

      {/* ──── Step 0: Discovery ──── */}
      {step === 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-2xl font-bold">Who are we building for?</h2>
            <p className="mt-2 text-muted-foreground">
              {isManager
                ? "Enter your client\u2019s name, handle, or URL and we\u2019ll do the rest \u2014 searching public profiles, interviews, articles, and media to build a comprehensive foundation for their digital identity."
                : "Enter a name, handle, or URL and we\u2019ll do the rest \u2014 searching public profiles, interviews, articles, and media to build a comprehensive foundation for your digital identity."}
            </p>
          </div>
          <Input
            value={discoveryInput}
            onChange={(e) => setDiscoveryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startDiscovery()}
            placeholder="Enter a name, @handle, or URL"
            className="text-lg py-5"
            autoFocus
          />
          <Button onClick={startDiscovery} disabled={!discoveryInput.trim() || loading} className="w-full py-5 text-base">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Search className="h-5 w-5 mr-2" />}
            Build My Identity
          </Button>
        </div>
      )}

      {/* ──── Step 1: Review Profile ──── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-2xl font-bold">Your foundation profile</h2>
            <p className="mt-2 text-muted-foreground">
              Here's what we assembled from public sources. You can deepen and refine everything in the Training Area after setup.
            </p>
          </div>

          {discoveryPolling && !isMockData ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="space-y-1 text-center">
                  {DISCOVERY_STAGES.map((stage, i) => (
                    <p
                      key={stage}
                      className={`text-sm transition-all duration-500 ${
                        i === discoveryStage ? "text-foreground font-medium" :
                        i < discoveryStage ? "text-emerald-500 line-through" :
                        "text-muted-foreground/40"
                      }`}
                    >
                      {i < discoveryStage && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />}
                      {stage}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">This typically takes 15–30 seconds</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {isMockData && (
                <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    Your profile has been created. You can enrich it with additional content in the Training Area after setup.
                  </div>
                </div>
              )}
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <p className="text-lg font-medium mt-0.5">{profileDraft.display_name || "—"}</p>
                  </div>
                  {profileDraft.bio && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Bio</Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{profileDraft.bio}</p>
                    </div>
                  )}

                  {/* Only show health metrics when real data is available (not mock) */}
                  {health && !isMockData && (
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
                      {(["psychographic_coverage", "personality_confidence", "cfs"] as const).map((key) => {
                        const meta = HEALTH_LABELS[key];
                        const value = health[key];
                        return (
                          <div key={key} className="text-center">
                            <div className="text-lg font-bold">{value ? `${Math.round(value * 100)}%` : "—"}</div>
                            <div className="text-[10px] font-medium text-muted-foreground">{meta?.label || key}</div>
                            <div className="text-[9px] text-muted-foreground/60 mt-0.5">{meta?.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Auto-detected categories */}
                  {(discoveryResults?.detected_categories as string[] | undefined)?.length ? (
                    <div className="pt-3 border-t border-border/30">
                      <Label className="text-xs text-muted-foreground">Detected Categories</Label>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {(discoveryResults.detected_categories as string[]).map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground pt-2">This is your starting point. The Training Area is where your identity becomes comprehensive and accurate.</p>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} disabled={loading || discoveryPolling}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={confirmProfile} disabled={loading || discoveryPolling} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 2: Upload Assets ──── */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-2xl font-bold">Your identity assets</h2>
            <p className="mt-2 text-muted-foreground">
              These files form your identity pack \u2014 the assets clients receive to produce accurate representations of you. Higher quality means higher deal value.
            </p>
          </div>

          {/* Required asset types */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Professional Headshots", desc: "High-res photos for visual identity", icon: Eye },
              { label: "Audio Samples", desc: "Interviews, podcasts for voice profile", icon: Mic },
              { label: "Video Footage", desc: "Appearances for behavioral modeling", icon: FileUp },
            ].map((asset) => {
              const AssetIcon = asset.icon;
              return (
                <div key={asset.label} className="rounded-lg border border-border/50 p-3 text-center">
                  <AssetIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
                  <div className="text-xs font-medium">{asset.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{asset.desc}</div>
                </div>
              );
            })}
          </div>

          <Card
            className={`border-dashed border-2 transition-colors ${dragActive ? "border-primary bg-primary/5" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = Array.from(e.dataTransfer.files);
              const valid = dropped.filter(f => {
                if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50MB limit`); return false; }
                return true;
              });
              if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
            }}
          >
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <FileUp className={`h-10 w-10 transition-colors ${dragActive ? "text-primary" : "text-muted-foreground/40"}`} />
              {files.length > 0 ? (
                <div className="space-y-1.5 text-sm w-full max-w-sm">
                  {files.map((f, i) => (
                    <div key={f.name + i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      {f.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(f)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dragActive ? "Drop files here..." : "Drag and drop files here, or click to browse"}
                </p>
              )}
              <input ref={fileInputRef} type="file" multiple accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => {
                const newFiles = Array.from(e.target.files || []).filter(f => {
                  if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50MB limit`); return false; }
                  return true;
                });
                setFiles((prev) => [...prev, ...newFiles]);
                e.target.value = "";
              }} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {files.length > 0 ? "Add More" : "Choose Files"}
              </Button>
              <p className="text-xs text-muted-foreground">Audio, Video, Images, PDF, Documents \u2014 up to 50MB each</p>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} disabled={uploading}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {files.length > 0 ? `Upload ${files.length} file(s) & continue` : "Skip for now"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 3: Consents & Manager Confirmation ──── */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-2xl font-bold">Permissions & confirmation</h2>
            <p className="mt-2 text-muted-foreground">
              These consents give you full control over how your identity data is used. Each is recorded separately and can be revoked anytime.
            </p>
          </div>

          {/* Identity Classification */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Identity Classification</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select category...</option>
                  {IDENTITY_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
                {(discoveryResults?.detected_categories as string[] | undefined)?.length ? (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Suggested: {(discoveryResults.detected_categories as string[]).slice(0, 3).map(c => c.replace("_", " ")).join(", ")}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Clone Type</Label>
                <select
                  value={cloneType}
                  onChange={(e) => setCloneType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CLONE_TYPES.map((ct) => (
                    <option key={ct.key} value={ct.key}>{ct.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Profile Consents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Profile Creation</Label>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllConsents(PROFILE_CONSENTS)}>
                Select all recommended
              </Button>
            </div>
            <Card className="border-border/50">
              <CardContent className="space-y-2 pt-4 pb-3">
                {PROFILE_CONSENTS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/30 transition-colors">
                      <Checkbox checked={consents[c.key]} onCheckedChange={(v) => setConsents({ ...consents, [c.key]: !!v })} className="mt-0.5" />
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {c.label}
                          {"required" in c && c.required && <Badge variant="outline" className="ml-2 text-[9px] py-0">Required</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Licensing Consents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Commercial Licensing</Label>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllConsents(LICENSING_CONSENTS)}>
                Select all recommended
              </Button>
            </div>
            <Card className="border-border/50">
              <CardContent className="space-y-2 pt-4 pb-3">
                {LICENSING_CONSENTS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.key} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/30 transition-colors">
                      <Checkbox checked={consents[c.key]} onCheckedChange={(v) => setConsents({ ...consents, [c.key]: !!v })} className="mt-0.5" />
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">{c.label}</div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Manager Authorization / Confirmation */}
          <Card className="border-border/50">
            <CardContent className="pt-4 pb-3">
              {isManager ? (
                <>
                  <div className="flex items-start gap-3 rounded-lg p-2">
                    <Checkbox
                      checked={consents._manager_auth || false}
                      onCheckedChange={(v) => setConsents({ ...consents, _manager_auth: !!v })}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">Manager authorization</div>
                      <div className="text-xs text-muted-foreground">
                        I confirm I have received authorization from {profileDraft.display_name || "the talent"} to create and manage their digital identity on the AIV platform.
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 pl-7">
                    Start with one client. You can add more from your dashboard.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Identity confirmation</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-7">
                    As the primary decision-maker, you confirm this identity is accurate and representative.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={submitConsentsAndGate1} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue to authorization <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 4: Personal Authorization (Gate 2) ──── */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h2 className="text-2xl font-bold">Authorize your digital identity</h2>
            <p className="mt-2 text-muted-foreground">
              This is the final step. Review what you're authorizing for commercial use. Without this, the Licensing Portal will not open.
            </p>
          </div>

          {/* Complete Summary Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Your Identity Authorization</h3>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Name:</span> <strong>{profileDraft.display_name}</strong></div>
                  <div><span className="text-muted-foreground">Clone Type:</span> <strong>{CLONE_TYPES.find(ct => ct.key === cloneType)?.label || "Public Figure"}</strong></div>
                  <div><span className="text-muted-foreground">Files uploaded:</span> <strong>{files.length}</strong></div>
                  <div><span className="text-muted-foreground">Manager confirmed:</span> <strong className="text-emerald-500">Yes</strong></div>
                </div>
                {profileDraft.bio && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Bio:</span>
                    <p className="text-sm mt-0.5 line-clamp-2">{profileDraft.bio}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border/30 pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">CONSENTS GRANTED:</p>
                <div className="space-y-1">
                  {ALL_CONSENTS.filter((c) => consents[c.key]).map((c) => (
                    <div key={c.key} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{c.label}</span>
                    </div>
                  ))}
                  {grantedConsents.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-500">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>No consents granted</span>
                    </div>
                  )}
                </div>
              </div>

              {health && !isMockData && (
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">IDENTITY SCORES:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cfs", "psychographic_coverage", "personality_confidence"] as const).map((key) => {
                      const val = health[key];
                      const pct = val ? Math.round(val * 100) : 0;
                      const threshold = key === "cfs" ? 65 : 50;
                      const below = pct < threshold;
                      return (
                        <div key={key} className="text-center">
                          <div className={`text-sm font-bold ${below ? "text-amber-500" : "text-emerald-500"}`}>{pct}%</div>
                          <div className="text-[10px] text-muted-foreground">{HEALTH_LABELS[key]?.label}</div>
                          {below && <div className="text-[9px] text-amber-500/70">Target: {threshold}%</div>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Scores will improve as you train your twin in the Training Area.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consent Statement */}
          <Card className="border-border">
            <CardContent className="py-6 text-center">
              <p className="text-base font-medium leading-relaxed">
                {isManager
                  ? `"I confirm that ${profileDraft.display_name || "the talent"} has authorized me to act on their behalf for the creation and commercial licensing of their digital identity under the terms reviewed above."`
                  : `"This is me. I authorize this version of my digital identity for commercial use under the terms reviewed above."`}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                This is a recorded consent event. You can revoke this authorization at any time from your Identity settings. Revoking consent while deals are active may affect those deals.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} disabled={loading} className="py-5">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={submitGate2}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 text-base font-semibold"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <UserCheck className="h-5 w-5 mr-2" />}
              I Authorize This Identity
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
