"use client";

import {
  ArrowRight, ArrowLeft, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api/onboarding";
import {
  PROFILE_CONSENTS, LICENSING_CONSENTS, IDENTITY_CATEGORIES, CLONE_TYPES, getErrorMsg,
} from "../constants";
import type { ConsentsStepProps } from "../types";

export function ConsentsStep({
  sessionId,
  discoveryResults,
  selectedCategories,
  setSelectedCategories,
  cloneType,
  setCloneType,
  consents,
  setConsents,
  profileDraft,
  isManager,
  loading,
  setLoading,
  setStep,
}: ConsentsStepProps) {
  function selectAllConsents(group: typeof PROFILE_CONSENTS | typeof LICENSING_CONSENTS) {
    const updates: Record<string, boolean> = {};
    group.forEach((c) => { updates[c.key] = true; });
    setConsents((prev: Record<string, boolean>) => ({ ...prev, ...updates }));
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
      await onboardingApi.submitRights(sessionId, {
        identity_category: selectedCategories.length > 0 ? selectedCategories : ["ENTERTAINMENT"],
        successor: null,
        consents: grantedConsents,
      });
      // Auto-approve Gate 1 (self-manager)
      await onboardingApi.approveGate1(sessionId);
      setStep(2);
    } catch (err: unknown) {
      toast.error(getErrorMsg(err, "Failed to save consents."));
    } finally {
      setLoading(false);
    }
  }

  return (
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
            <Label className="text-xs text-muted-foreground mb-1.5 block">Categories (select up to 3)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedCategories.map((cat) => {
                const label = IDENTITY_CATEGORIES.find((c) => c.key === cat)?.label || cat;
                return (
                  <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {label}
                    <button
                      type="button"
                      onClick={() => setSelectedCategories((prev: string[]) => prev.filter((c: string) => c !== cat))}
                      className="ml-0.5 text-primary/60 hover:text-primary"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val && !selectedCategories.includes(val) && selectedCategories.length < 3) {
                  setSelectedCategories((prev: string[]) => [...prev, val]);
                }
                e.target.value = "";
              }}
              disabled={selectedCategories.length >= 3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              <option value="">{selectedCategories.length >= 3 ? "Maximum 3 selected" : "Add category..."}</option>
              {IDENTITY_CATEGORIES.filter((cat) => !selectedCategories.includes(cat.key)).map((cat) => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
            {(discoveryResults?.detected_categories as string[] | undefined)?.length ? (
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: {(discoveryResults?.detected_categories as string[])?.slice(0, 3).map(c => c.replace("_", " ")).join(", ")}
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
                  <Checkbox checked={consents[c.key]} onCheckedChange={(v) => setConsents((prev: Record<string, boolean>) => ({ ...prev, [c.key]: !!v }))} className="mt-0.5" />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {c.label}
                      {"required" in c && c.required && <Badge variant="outline" className="ml-2 text-xs py-0">Required</Badge>}
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
                  <Checkbox checked={consents[c.key]} onCheckedChange={(v) => setConsents((prev: Record<string, boolean>) => ({ ...prev, [c.key]: !!v }))} className="mt-0.5" />
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
                  onCheckedChange={(v) => setConsents((prev: Record<string, boolean>) => ({ ...prev, _manager_auth: !!v }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Manager authorization</div>
                  <div className="text-xs text-muted-foreground">
                    I confirm I have received authorization from {profileDraft.display_name || "the talent"} to create and manage their digital identity on the AIV platform.
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 pl-7">
                Start with one client. You can add more from your dashboard.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-success">
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
        <Button variant="outline" onClick={() => setStep(0)} disabled={loading}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={submitConsentsAndGate1} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continue to authorization <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
