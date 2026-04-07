"use client";

import {
  Loader2, CheckCircle2, Sparkles, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { humanizeEnum } from "@/lib/humanize";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api/onboarding";
import { updateTwin } from "@/lib/api/twins";
import { DISCOVERY_STAGES, HEALTH_LABELS, getErrorMsg } from "../constants";
import type { ReviewStepProps } from "../types";

export function ReviewStep({
  sessionId,
  twinId,
  discoveryResults,
  discoveryPolling,
  discoveryStage,
  isMockData,
  profileDraft,
  loading,
  setStep,
  setLoading,
  setProfileDraft,
  onSkipDiscovery,
}: ReviewStepProps) {
  const health = discoveryResults?.health as Record<string, number> | undefined;

  async function confirmProfile() {
    setLoading(true);
    try {
      if (twinId && (profileDraft.display_name || profileDraft.bio)) {
        try {
          await updateTwin(twinId, {
            display_name: profileDraft.display_name,
            bio: profileDraft.bio,
          });
        } catch (err: unknown) {
          toast.error(getErrorMsg(err, "Failed to save profile changes. You can update this later."));
        }
      }
      await onboardingApi.confirmProfiles(sessionId, (discoveryResults?.discovered_profiles as string[]) || []);
      setStep(2);
    } catch {
      toast.error("Failed to confirm profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-bold">Your foundation profile</h2>
        <p className="mt-2 text-muted-foreground">
          Here's what we assembled from public sources. You can deepen and refine everything in the Training Area after setup.
        </p>
      </div>

      {discoveryPolling && !isMockData ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1.5 text-center">
              {DISCOVERY_STAGES.map((stage, i) => (
                <p
                  key={stage}
                  className={`text-sm transition-[color,opacity] duration-500 ${
                    i === discoveryStage ? "text-foreground font-medium" :
                    i < discoveryStage ? "text-success" :
                    "text-muted-foreground/30"
                  }`}
                >
                  {i < discoveryStage && <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" />}
                  {stage}
                </p>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">This typically takes 15–30 seconds. Your data stays private.</p>
            {discoveryStage >= 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onSkipDiscovery?.()}
              >
                Continue with what we have so far
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground/60"
              onClick={() => setStep(0)}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
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
                <Input
                  value={profileDraft.display_name || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, display_name: e.target.value })}
                  className="mt-0.5 text-lg font-medium"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea
                  value={profileDraft.bio || ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                  className="mt-0.5 text-sm"
                  placeholder="A short bio about yourself"
                  rows={3}
                />
              </div>

              {/* Wikipedia summary */}
              {(() => {
                const wiki = (discoveryResults?.twin as Record<string, unknown> | undefined)?.wikipedia as Record<string, string> | undefined;
                return wiki?.extract ? (
                  <div className="pt-3 border-t border-border/30">
                    <Label className="text-xs text-muted-foreground">Wikipedia</Label>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{wiki.extract}</p>
                  </div>
                ) : null;
              })()}

              {/* Gemini-synthesized profile */}
              {(discoveryResults?.twin as Record<string, unknown>)?.gemini_profile && (() => {
                const gp = (discoveryResults?.twin as Record<string, unknown>)?.gemini_profile as Record<string, unknown>;
                return (
                  <div className="pt-3 border-t border-border/30 space-y-2">
                    {(gp.known_for as string[])?.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Known For</Label>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {(gp.known_for as string[]).slice(0, 5).map((item: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {(gp.career_highlights as string[])?.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Career Highlights</Label>
                        <ul className="mt-1 space-y-0.5">
                          {(gp.career_highlights as string[]).slice(0, 4).map((item: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Social profiles found */}
              {((discoveryResults?.twin as Record<string, unknown>)?.social_profiles as Array<Record<string, string>>)?.length > 0 && (
                <div className="pt-3 border-t border-border/30">
                  <Label className="text-xs text-muted-foreground">Social Profiles Found</Label>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {((discoveryResults?.twin as Record<string, unknown>)?.social_profiles as Array<Record<string, string>>).slice(0, 6).map((profile, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {profile.domain?.replace("www.", "") || "Link"}
                      </Badge>
                    ))}
                  </div>
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
                        <div className="text-xs font-medium text-muted-foreground">{meta?.label || key}</div>
                        <div className="text-xs text-muted-foreground/60 mt-0.5">{meta?.desc}</div>
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
                    {(discoveryResults?.detected_categories as string[])?.map((cat: string) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {humanizeEnum(cat)}
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
        <Button onClick={confirmProfile} disabled={loading || discoveryPolling} variant="secondary" className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Confirm Profile
        </Button>
      </div>
    </div>
  );
}
