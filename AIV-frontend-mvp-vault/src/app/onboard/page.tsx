"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api/onboarding";
import { STEPS, TOTAL_STEPS, ALL_CONSENTS, DISCOVERY_STAGES, getErrorMsg } from "./constants";
import { DiscoveryStep } from "./steps/discovery";
import { ReviewStep } from "./steps/review";
import { AssetsStep } from "./steps/assets";
import { ConsentsStep } from "./steps/consents";
import { AuthorizeStep } from "./steps/authorize";
import { CompleteStep } from "./steps/complete";
import { ProgressBar } from "./progress-bar";

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

  // Step 3: Identity Classification + Consents (multi-select, max 3)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
        const session = await onboardingApi.getActiveSession();
        if (cancelled || !session) { setInitialLoading(false); return; }
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
      const res = await onboardingApi.start(discoveryInput.trim());
      setSessionId(res.id);
      setTwinId(res.twin_id || "");
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
        const res = await onboardingApi.getDiscoveryResults(sessionId);
        if (cancelled) return;
        setDiscoveryResults(res);
        if (res.status === "ready") {
          setDiscoveryPolling(false);
          setIsMockData(!!res.mock);
          const twin = res.twin || {};
          setProfileDraft({
            display_name: (twin.display_name as string) || discoveryInput.split("/").pop()?.replace("@", "").trim() || "",
            bio: (twin.bio as string) || "",
          });
          // Pre-populate categories from detection (user can change in Step 3)
          const detected = (res.detected_categories as string[]) || [];
          if (detected.length > 0 && selectedCategories.length === 0) {
            setSelectedCategories(detected.slice(0, 3));
          }
        }
      } catch {
        // Keep polling
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    // Timeout after 90 seconds — stop polling and show what we have
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setDiscoveryPolling(false);
        setIsMockData(true);
        toast.error("Discovery is taking longer than expected. You can continue with what we have and enrich your profile later in the Training Area.");
      }
    }, 90000);
    return () => { cancelled = true; clearInterval(interval); clearTimeout(timeout); };
  }, [discoveryPolling, sessionId, discoveryInput]);


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
      <CompleteStep
        isManager={isManager}
        showButtons={showButtons}
        profileDraft={profileDraft}
      />
    );
  }

  return (
    <div className="dark mx-auto max-w-2xl p-6 min-h-[100dvh]">
      <ProgressBar currentStep={step} steps={STEPS} totalSteps={TOTAL_STEPS} authorized={authorized} />

      {/* Safety message — shown on step 0 */}
      {step === 0 && (
        <p className="text-xs text-muted-foreground text-center mb-6">
          You can leave at any time and continue from where you left off.
        </p>
      )}

      {step === 0 && (
        <DiscoveryStep
          discoveryInput={discoveryInput}
          setDiscoveryInput={setDiscoveryInput}
          loading={loading}
          isManager={isManager}
          startDiscovery={startDiscovery}
        />
      )}

      {step === 1 && (
        <ReviewStep
          sessionId={sessionId}
          twinId={twinId}
          discoveryInput={discoveryInput}
          discoveryResults={discoveryResults}
          discoveryPolling={discoveryPolling}
          discoveryStage={discoveryStage}
          isMockData={isMockData}
          profileDraft={profileDraft}
          loading={loading}
          setStep={setStep}
          setLoading={setLoading}
          setProfileDraft={setProfileDraft}
          setDiscoveryResults={setDiscoveryResults}
        />
      )}

      {step === 2 && (
        <AssetsStep
          sessionId={sessionId}
          files={files}
          setFiles={setFiles}
          setStep={setStep}
        />
      )}

      {step === 3 && (
        <ConsentsStep
          sessionId={sessionId}
          discoveryResults={discoveryResults}
          selectedCategories={selectedCategories}
          setSelectedCategories={setSelectedCategories}
          cloneType={cloneType}
          setCloneType={setCloneType}
          consents={consents}
          setConsents={setConsents}
          profileDraft={profileDraft}
          isManager={isManager}
          loading={loading}
          setLoading={setLoading}
          setStep={setStep}
        />
      )}

      {step === 4 && (
        <AuthorizeStep
          sessionId={sessionId}
          profileDraft={profileDraft}
          cloneType={cloneType}
          consents={consents}
          files={files}
          discoveryResults={discoveryResults}
          isMockData={isMockData}
          isManager={isManager}
          loading={loading}
          setLoading={setLoading}
          setStep={setStep}
          setAuthorized={setAuthorized}
          setShowButtons={setShowButtons}
        />
      )}
    </div>
  );
}
