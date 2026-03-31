"use client";

import {
  UserCheck, ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api/onboarding";
import { ALL_CONSENTS, CLONE_TYPES, HEALTH_LABELS, getErrorMsg } from "../constants";
import type { AuthorizeStepProps } from "../types";

export function AuthorizeStep({
  sessionId,
  profileDraft,
  cloneType,
  consents,
  files,
  discoveryResults,
  isMockData,
  isManager,
  loading,
  setLoading,
  setStep,
  setAuthorized,
  setShowButtons,
}: AuthorizeStepProps) {
  const grantedConsents = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
  const health = discoveryResults?.health as Record<string, number> | undefined;

  async function submitGate2() {
    setLoading(true);
    try {
      const granted = Object.entries(consents).filter(([, v]) => v).map(([k]) => k);
      const res = await onboardingApi.authorizeGate2(sessionId, granted);
      setAuthorized(true);
      if (res.readiness_warnings?.length > 0) {
        toast.info(`Note: ${res.readiness_warnings.join(". ")}. You can improve in the Training Area.`);
      }
      setTimeout(() => setShowButtons(true), 2000);
    } catch (err: unknown) {
      toast.error(getErrorMsg(err, "Authorization failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
