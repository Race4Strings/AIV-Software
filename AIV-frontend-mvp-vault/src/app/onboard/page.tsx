"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, FileUp, UserCheck, Shield, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Pencil, Sparkles, Upload, AlertTriangle,
  PartyPopper, ExternalLink, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  { label: "Upload", icon: Upload },
  { label: "Rights", icon: Shield },
  { label: "Manager", icon: Users },
  { label: "Authorize", icon: UserCheck },
];

const CATEGORIES: Record<string, string> = {
  ENTERTAINMENT: "Stricter content safety defaults, higher typical deal values ($15K\u2013$100K)",
  SPORTS: "Athletic endorsement focus, physical likeness emphasis ($25K\u2013$250K)",
  CORPORATE: "Professional tone defaults, business-safe guardrails ($10K\u2013$75K)",
  EDUCATION: "Educational content focus, age-appropriate guardrails ($5K\u2013$30K)",
  CREATOR_ECONOMY: "Flexible guardrails, social platform emphasis ($5K\u2013$50K)",
  BRAND_PERSONA: "Custom character guardrails, fictional identity rules",
  GAMING_VIRTUAL: "Interactive character focus, gaming platform integration",
};

const CONSENT_TYPES = [
  { key: "PUBLIC_SCRAPING", label: "Public data discovery", desc: "Search social media, interviews, and articles to build your profile" },
  { key: "AUDIO_VIDEO_ANALYSIS", label: "Audio & video analysis", desc: "Analyze uploaded media to create your voice and visual profile" },
  { key: "BEHAVIORAL_ANALYSIS", label: "Behavioral analysis", desc: "Model your communication style, values, and personality" },
  { key: "VOICE_LICENSING", label: "Commercial licensing \u2014 Voice", desc: "Allow your voice identity to be licensed to clients" },
  { key: "VISUAL_LICENSING", label: "Commercial licensing \u2014 Likeness", desc: "Allow your visual likeness to be licensed to clients" },
  { key: "LIKENESS_LICENSING", label: "Commercial licensing \u2014 Personality", desc: "Allow your behavioral/personality model to be licensed" },
  { key: "DATA_PROCESSING", label: "Data processing & storage", desc: "Securely process and store your identity data on AIV infrastructure" },
];

// ──────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState("");
  const [twinId, setTwinId] = useState("");

  // Step 1: Discovery
  const [discoveryInput, setDiscoveryInput] = useState("");
  const [onboardingPath, setOnboardingPath] = useState("HYBRID");

  // Step 2: Review
  const [discoveryResults, setDiscoveryResults] = useState<Record<string, unknown> | null>(null);
  const [discoveryPolling, setDiscoveryPolling] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ display_name: "", bio: "" });

  // Step 3: Upload
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 4: Rights
  const [category, setCategory] = useState("ENTERTAINMENT");
  const [successorName, setSuccessorName] = useState("");
  const [successorEmail, setSuccessorEmail] = useState("");
  const [consents, setConsents] = useState<Record<string, boolean>>({
    PUBLIC_SCRAPING: true,
    AUDIO_VIDEO_ANALYSIS: true,
    BEHAVIORAL_ANALYSIS: true,
    VOICE_LICENSING: true,
    VISUAL_LICENSING: true,
    LIKENESS_LICENSING: true,
    DATA_PROCESSING: true,
  });

  // Step 5: Manager
  const [isSelfManager, setIsSelfManager] = useState(true);

  // Step 6: Authorize
  const [authSummary, setAuthSummary] = useState<Record<string, unknown> | null>(null);
  const [authorized, setAuthorized] = useState(false);

  // ──────────────────────────────────────────────────────
  // Step 1: Start Discovery
  // ──────────────────────────────────────────────────────
  async function startDiscovery() {
    if (!discoveryInput.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/onboarding/start", {
        discovery_input: discoveryInput.trim(),
        onboarding_path: onboardingPath,
      });
      const data = res.data;
      setSessionId(data.id);
      setTwinId(data.twin_id || "");
      setStep(1);
      // Start polling for discovery results
      setDiscoveryPolling(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to start discovery. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Poll for discovery results
  useEffect(() => {
    if (!discoveryPolling || !sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await apiClient.get(`/onboarding/${sessionId}/discovery-results`);
        if (!cancelled) {
          setDiscoveryResults(res.data);
          if (res.data.status === "ready") {
            setDiscoveryPolling(false);
            const twin = res.data.twin || {};
            setProfileDraft({
              display_name: (twin.display_name as string) || discoveryInput.split("/").pop()?.replace("@", "").trim() || "",
              bio: (twin.bio as string) || "",
            });
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
  // Step 2: Confirm Profile
  // ──────────────────────────────────────────────────────
  async function confirmProfile() {
    setLoading(true);
    try {
      // Update twin name/bio if edited
      if (twinId && (profileDraft.display_name || profileDraft.bio)) {
        await apiClient.put(`/twins/${twinId}`, {
          display_name: profileDraft.display_name,
          bio: profileDraft.bio,
        }).catch(() => {});
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
  // Step 3: Upload Files
  // ──────────────────────────────────────────────────────
  async function handleUpload() {
    if (files.length === 0) {
      // Skip — record it
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
  // Step 4: Submit Rights
  // ──────────────────────────────────────────────────────
  async function submitRights() {
    const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
    if (grantedConsents.length === 0) {
      toast.error("At least one consent must be granted to proceed.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/onboarding/${sessionId}/rights`, {
        identity_category: category,
        successor: successorName ? { name: successorName, email: successorEmail } : null,
        consents: grantedConsents,
      });
      setStep(4);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to save rights. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Step 5: Manager Approval (Gate 1)
  // ──────────────────────────────────────────────────────
  async function submitGate1() {
    setLoading(true);
    try {
      await apiClient.post(`/onboarding/${sessionId}/gate-1`, { approved: true });
      // Build summary for Gate 2
      const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
      setAuthSummary({
        display_name: profileDraft.display_name,
        category,
        files_count: files.length,
        consents: grantedConsents,
      });
      setStep(5);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Manager approval failed.");
    } finally {
      setLoading(false);
    }
  }

  // ──────────────────────────────────────────────────────
  // Step 6: Authorize (Gate 2)
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
      toast.success("Your digital identity has been authorized.");

      if (res.data.readiness_warnings?.length > 0) {
        toast.info(`Note: ${res.data.readiness_warnings.join(". ")}. You can improve in the Training Area.`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Authorization failed. Please try again.");
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
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
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
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((authorized ? 6 : step) / 6) * 100}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">Step {step + 1} of 6</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────

  if (authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="rounded-full bg-emerald-500/10 p-6 mb-6">
          <PartyPopper className="h-12 w-12 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold">Your identity is now live</h1>
        <p className="mt-3 text-muted-foreground max-w-md">
          Your digital twin has been authorized and is now in <strong>Building</strong> status. Visit the Training Area to increase your identity scores and activate the Licensing Portal.
        </p>
        <div className="flex gap-3 mt-8">
          <Button onClick={() => router.push("/twin/training-area")}>
            <Sparkles className="h-4 w-4 mr-2" /> Open Training Area
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <ProgressBar />

      {/* ──── Step 1: Discovery ──── */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Who are we building for?</h2>
            <p className="mt-2 text-muted-foreground">
              We'll search your public presence across social media, interviews, articles, and public records to synthesize a foundation profile. You'll review and refine everything before it's used.
            </p>
          </div>
          <Input
            value={discoveryInput}
            onChange={(e) => setDiscoveryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startDiscovery()}
            placeholder="Enter a name, @handle, or URL"
            className="text-lg py-5"
          />
          <div className="flex gap-2">
            {(["HYBRID", "AIV_ASSISTED", "MANUAL"] as const).map((path) => (
              <button
                key={path}
                onClick={() => setOnboardingPath(path)}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  onboardingPath === path ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <div className="font-medium">{path === "HYBRID" ? "Hybrid" : path === "AIV_ASSISTED" ? "AI-Assisted" : "Manual"}</div>
                <div className="text-[10px] mt-0.5 opacity-70">
                  {path === "HYBRID" ? "We search + you add" : path === "AIV_ASSISTED" ? "We build, you refine" : "You enter everything"}
                </div>
              </button>
            ))}
          </div>
          <Button onClick={startDiscovery} disabled={!discoveryInput.trim() || loading} className="w-full py-5 text-base">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Search className="h-5 w-5 mr-2" />}
            Start Discovery
          </Button>
        </div>
      )}

      {/* ──── Step 2: Review Profile ──── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Review your profile</h2>
            <p className="mt-2 text-muted-foreground">
              Here's what we found from public sources. Review for accuracy and make any corrections.
            </p>
          </div>

          {discoveryPolling ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Searching public profiles and media...</p>
                <p className="text-xs text-muted-foreground">This typically takes 15\u201330 seconds</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Display Name</Label>
                  {editingProfile ? (
                    <Input value={profileDraft.display_name} onChange={(e) => setProfileDraft({ ...profileDraft, display_name: e.target.value })} className="mt-1" />
                  ) : (
                    <p className="text-lg font-medium mt-0.5">{profileDraft.display_name || "Not found"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  {editingProfile ? (
                    <Textarea value={profileDraft.bio} onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })} rows={3} className="mt-1" />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">{profileDraft.bio || "No bio found. Click Edit to add one."}</p>
                  )}
                </div>

                {/* Health scores if available */}
                {discoveryResults?.health && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
                    {[
                      { label: "Coverage", value: (discoveryResults.health as Record<string, number>).psychographic_coverage },
                      { label: "Confidence", value: (discoveryResults.health as Record<string, number>).personality_confidence },
                      { label: "CFS", value: (discoveryResults.health as Record<string, number>).cfs },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <div className="text-lg font-bold">{m.value ? `${Math.round(m.value * 100)}%` : "\u2014"}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                    <Pencil className="h-4 w-4 mr-1" /> {editingProfile ? "Done editing" : "Edit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep(0); setDiscoveryPolling(false); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Start Over
            </Button>
            <Button onClick={confirmProfile} disabled={loading || discoveryPolling} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Looks good, continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 3: Upload Files ──── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Add professional media</h2>
            <p className="mt-2 text-muted-foreground">
              Quality matters \u2014 clients validate your twin against these files. Professional audio produces better voice synthesis. Higher quality means higher deal value.
            </p>
          </div>
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <FileUp className="h-10 w-10 text-muted-foreground/40" />
              {files.length > 0 ? (
                <div className="space-y-1.5 text-sm w-full max-w-sm">
                  {files.map((f, i) => (
                    <div key={f.name + i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
              )}
              <input ref={fileInputRef} type="file" multiple accept="audio/*,video/*,image/*" className="hidden" onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {files.length > 0 ? "Add More" : "Choose Files"}
              </Button>
              <p className="text-xs text-muted-foreground">Audio, Video, Images \u2014 up to 50MB each</p>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {files.length > 0 ? `Upload ${files.length} file(s) & continue` : "Skip for now"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          {files.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">You can add files later in the Training Area.</p>
          )}
        </div>
      )}

      {/* ──── Step 4: Rights, Category & Consents ──── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Define how your identity is protected</h2>
            <p className="mt-2 text-muted-foreground">
              Your identity category determines default guardrails and licensing parameters. Consents control exactly what AIV can do with your data.
            </p>
          </div>

          {/* Identity Category */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Identity Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CATEGORIES).map(([key, desc]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    category === key ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium">{key.replace("_", " ")}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Successor */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Emergency Successor (optional)</Label>
            <p className="text-xs text-muted-foreground">In case of emergency, who should manage your digital identity?</p>
            <div className="grid grid-cols-2 gap-2">
              <Input value={successorName} onChange={(e) => setSuccessorName(e.target.value)} placeholder="Full name" />
              <Input type="email" value={successorEmail} onChange={(e) => setSuccessorEmail(e.target.value)} placeholder="Email address" />
            </div>
          </div>

          {/* Granular Consents */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data & Licensing Consents</Label>
            <p className="text-xs text-muted-foreground">Each consent is recorded separately. You can revoke any consent from Identity settings at any time.</p>
            {CONSENT_TYPES.map((c) => (
              <div key={c.key} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                <Checkbox
                  checked={consents[c.key]}
                  onCheckedChange={(v) => setConsents({ ...consents, [c.key]: !!v })}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={submitRights} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 5: Manager Confirmation (Gate 1) ──── */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Operational sign-off</h2>
            <p className="mt-2 text-muted-foreground">
              Before personal authorization, the operational manager must confirm that this digital identity accurately represents the talent.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <Checkbox checked={isSelfManager} onCheckedChange={(v) => setIsSelfManager(!!v)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">I am also the operational manager for this identity</div>
                  <div className="text-xs text-muted-foreground">Select this if you manage your own digital presence or are the primary decision-maker.</div>
                </div>
              </div>
              {!isSelfManager && (
                <div className="pl-7 space-y-2 border-l-2 border-border/50 ml-1.5">
                  <p className="text-sm text-muted-foreground">Send an approval request to your manager. They'll review and approve before you can authorize.</p>
                  <Input placeholder="Manager's email address" type="email" />
                  <Button variant="outline" size="sm" disabled>
                    <ExternalLink className="h-4 w-4 mr-1" /> Send Approval Request (coming soon)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={submitGate1} disabled={loading || !isSelfManager} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm & Continue <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ──── Step 6: Personal Authorization (Gate 2) ──── */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Authorize your digital identity</h2>
            <p className="mt-2 text-muted-foreground">
              This is the final step. Review what you're authorizing for commercial use. Without this, the Licensing Portal will not open.
            </p>
          </div>

          {/* Summary Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Your Identity Authorization</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <strong>{authSummary?.display_name as string || profileDraft.display_name}</strong></div>
                <div><span className="text-muted-foreground">Category:</span> <strong>{category.replace("_", " ")}</strong></div>
                <div><span className="text-muted-foreground">Clone Type:</span> <strong>PUBLIC FIGURE</strong></div>
                <div><span className="text-muted-foreground">Files uploaded:</span> <strong>{files.length}</strong></div>
              </div>

              <div className="border-t border-border/30 pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">CONSENTS GRANTED:</p>
                <div className="space-y-1">
                  {CONSENT_TYPES.filter((c) => consents[c.key]).map((c) => (
                    <div key={c.key} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/30 pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Manager approved: <span className="text-emerald-500">Yes</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Consent Statement */}
          <Card className="border-border">
            <CardContent className="py-6 text-center">
              <p className="text-base font-medium leading-relaxed">
                "This is me. I authorize this version of my digital identity for commercial use under the terms reviewed above."
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                This is a recorded consent event. You can revoke this authorization at any time from your Identity settings. Revoking consent while deals are active may affect those deals and could result in contractual obligations.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
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
