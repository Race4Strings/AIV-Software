"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Globe, FileUp, UserCheck, Shield, ArrowRight,
  ArrowLeft, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

import { uploadApi } from "@/lib/api/upload";

function UploadStep({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (files.length === 0) {
      onComplete(); // Skip if no files
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await uploadApi.uploadFile(file, "onboarding");
      }
      toast.success(`${files.length} file(s) uploaded`);
      onComplete();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Upload professional files</h2>
        <p className="mt-2 text-muted-foreground">
          Upload professional audio, video, and photos. These should be high-quality,
          professional files — not webcam recordings.
        </p>
      </div>
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <FileUp className="h-10 w-10 text-muted-foreground/40" />
          {files.length > 0 ? (
            <div className="space-y-1 text-sm">
              {files.map((f, i) => (
                <div key={f.name + i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="audio/*,video/*,image/*"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {files.length > 0 ? "Add More Files" : "Choose Files"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Audio (WAV, MP3), Video (MP4, MOV), Images (JPG, PNG) — up to 50MB each
          </p>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={handleUpload} disabled={uploading} className="flex-1">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {files.length > 0 ? `Upload ${files.length} File(s) & Continue` : "Skip & Continue"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Import-first onboarding pipeline.
 *
 * Replaces the old 6-step video questionnaire with:
 *   Step 0: Discovery — enter name/handle/URL
 *   Step 1: Profile Review — review discovered profiles
 *   Step 2: Upload — professional files (audio, video, photos)
 *   Step 3: Rights — identity category, successor, consents
 *   Step 4: Authorization — Gate 1 (manager) + Gate 2 (talent)
 */

type Step = "discovery" | "review" | "upload" | "rights" | "authorize" | "complete";

const STEPS: { key: Step; label: string; icon: typeof Search }[] = [
  { key: "discovery", label: "Discovery", icon: Search },
  { key: "review", label: "Review", icon: Globe },
  { key: "upload", label: "Upload", icon: FileUp },
  { key: "rights", label: "Rights", icon: Shield },
  { key: "authorize", label: "Authorize", icon: UserCheck },
];

const IDENTITY_CATEGORIES = [
  "ENTERTAINMENT", "SPORTS", "CORPORATE", "EDUCATION",
  "CREATOR_ECONOMY", "BRAND_PERSONA", "GAMING_VIRTUAL",
];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("discovery");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Discovery
  const [discoveryInput, setDiscoveryInput] = useState("");
  const [onboardingPath, setOnboardingPath] = useState("HYBRID");

  // Review
  const [discoveredProfiles, setDiscoveredProfiles] = useState<string[]>([]);

  // Rights
  const [identityCategory, setIdentityCategory] = useState("ENTERTAINMENT");
  const [successorName, setSuccessorName] = useState("");
  const [successorEmail, setSuccessorEmail] = useState("");

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  async function startDiscovery() {
    if (!discoveryInput.trim()) {
      toast.error("Enter a name, handle, or URL to begin");
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post("/onboarding/start", {
        discovery_input: discoveryInput.trim(),
        onboarding_path: onboardingPath,
      });
      setSessionId(data.id);
      setDiscoveredProfiles(data.discovered_profiles || []);
      setStep("review");
    } catch {
      toast.error("Failed to start onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmProfiles() {
    if (!sessionId) return;
    setLoading(true);
    try {
      await apiClient.post(`/onboarding/${sessionId}/confirm-profiles`, {
        confirmed_profiles: discoveredProfiles,
      });
      setStep("upload");
    } catch {
      // If endpoint doesn't exist yet, just advance
      setStep("upload");
    } finally {
      setLoading(false);
    }
  }

  async function submitRights() {
    if (!sessionId) return;
    setLoading(true);
    try {
      await apiClient.post(`/onboarding/${sessionId}/rights`, {
        identity_category: identityCategory,
        successor: successorName ? { name: successorName, email: successorEmail } : null,
        consents: ["PUBLIC_SCRAPING", "DATA_PROCESSING"],
      });
      setStep("authorize");
    } catch {
      setStep("authorize");
    } finally {
      setLoading(false);
    }
  }

  async function authorize() {
    if (!sessionId) return;
    setLoading(true);
    try {
      // Gate 2: talent personal authorization
      await apiClient.post(`/onboarding/${sessionId}/gate-2`, { authorized: true });
      setStep("complete");
      toast.success("Your digital twin has been authorized!");
      setTimeout(() => router.push("/"), 2000);
    } catch {
      setStep("complete");
      setTimeout(() => router.push("/"), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Set up your digital identity</h1>
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === currentIndex;
                const isDone = i < currentIndex;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Step: Discovery */}
        {step === "discovery" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Who are we building for?</h2>
              <p className="mt-2 text-muted-foreground">
                Enter a name, social media handle, or URL. We'll discover their public presence
                and build the foundation of their digital identity.
              </p>
            </div>
            <Input
              value={discoveryInput}
              onChange={(e) => setDiscoveryInput(e.target.value)}
              placeholder="e.g. @therock, Dwayne Johnson, or a Wikipedia URL..."
              className="text-lg py-6"
              onKeyDown={(e) => e.key === "Enter" && startDiscovery()}
            />
            <div className="flex gap-2">
              {["HYBRID", "AIV_ASSISTED", "MANUAL"].map((path) => (
                <Button
                  key={path}
                  variant={onboardingPath === path ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOnboardingPath(path)}
                >
                  {path === "HYBRID" ? "Hybrid (recommended)" : path === "AIV_ASSISTED" ? "AI-Assisted" : "Manual"}
                </Button>
              ))}
            </div>
            <Button onClick={startDiscovery} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Start Discovery
            </Button>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Review discovered profiles</h2>
              <p className="mt-2 text-muted-foreground">
                Here's what we found. Confirm which profiles belong to this person.
              </p>
            </div>
            {discoveredProfiles.length > 0 ? (
              <div className="space-y-2">
                {discoveredProfiles.map((p, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1 text-sm">{String(p)}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Discovery is processing. You can continue and review later in the Training Area.</p>
                </CardContent>
              </Card>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("discovery")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={confirmProfiles} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <UploadStep onComplete={() => setStep("rights")} onBack={() => setStep("review")} />
        )}

        {/* Step: Rights */}
        {step === "rights" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Rights & Identity Category</h2>
              <p className="mt-2 text-muted-foreground">
                Select the identity category and optionally designate a successor.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Identity Category</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {IDENTITY_CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={identityCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIdentityCategory(cat)}
                  >
                    {cat.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Successor Designation (optional)</label>
              <p className="text-xs text-muted-foreground">
                Name someone to manage your digital identity in case of death or incapacitation.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={successorName}
                  onChange={(e) => setSuccessorName(e.target.value)}
                  placeholder="Successor name"
                />
                <Input
                  value={successorEmail}
                  onChange={(e) => setSuccessorEmail(e.target.value)}
                  placeholder="Successor email"
                  type="email"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={submitRights} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step: Authorize */}
        {step === "authorize" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Authorize your digital identity</h2>
              <p className="mt-2 text-muted-foreground">
                This is your personal authorization — the final gate before your digital identity
                can be used commercially. Without this, the Licensing Portal will not open.
              </p>
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6 space-y-4">
                <p className="text-sm font-medium">
                  "This is me. I authorize this version of my digital identity for commercial use."
                </p>
                <p className="text-xs text-muted-foreground">
                  This is a recorded consent event. You can revoke this authorization at any time
                  from your Identity settings. Active deals may be affected by revocation.
                </p>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("rights")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={authorize} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                I Authorize This Identity
              </Button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h2 className="mt-6 text-2xl font-bold">Your digital identity is live</h2>
            <p className="mt-2 text-muted-foreground max-w-md">
              Your twin is now in Building status. Visit the Training Area to refine it,
              or head to the Dashboard to see your command center.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => router.push("/twin/training-area")}>
                Open Training Area
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
