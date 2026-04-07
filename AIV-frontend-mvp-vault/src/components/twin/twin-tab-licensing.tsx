"use client";

import { useState } from "react";
import { DollarSign, Pencil, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PillEditor } from "@/components/shared/pill-editor";
import { toast } from "sonner";
import { guardrailsApi } from "@/lib/api/guardrails";

interface TwinTabLicensingProps {
  twinId: string;
  licensingRules: Record<string, unknown> | null;
  category: string;
  categoryHints: Record<string, string>;
  onLicensingChange: (config: Record<string, unknown>) => void;
}

export function TwinTabLicensing({
  twinId,
  licensingRules,
  category,
  categoryHints,
  onLicensingChange,
}: TwinTabLicensingProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const startEdit = () => {
    if (licensingRules) {
      setDraft({
        pricing_floor: (licensingRules.pricing_floor as number) || 0,
        exclusivity_available: (licensingRules.exclusivity_available as boolean) || false,
        default_grace_period_hours: (licensingRules.default_grace_period_hours as number) || 48,
        territory_restrictions: (licensingRules.territory_restrictions as string[]) || [],
        blacklisted_use_cases: (licensingRules.blacklisted_use_cases as string[]) || [],
        permitted_use_cases: (licensingRules.permitted_use_cases as string[]) || [],
        currency: (licensingRules.currency as string) || "USD",
      });
    } else {
      setDraft({
        pricing_floor: 25000,
        exclusivity_available: false,
        default_grace_period_hours: 48,
        territory_restrictions: [],
        blacklisted_use_cases: [],
        permitted_use_cases: [],
        currency: "USD",
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await guardrailsApi.updateLicensingRules(twinId, draft);
      onLicensingChange((result as any).config || result);
      setEditing(false);
      toast.success("Licensing rules updated (new version created)");
    } catch {
      toast.error("Failed to save licensing rules");
    }
    setSaving(false);
  };

  if (!licensingRules && !editing) {
    return (
      <div className="space-y-4 mt-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No licensing rules configured yet</p>
            <p className="text-sm mt-1">Set pricing floors, territory restrictions, and deal parameters to control how your identity is licensed.</p>
            <Button className="mt-3" onClick={startEdit}>Configure Rules</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rules = licensingRules || {};

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Define the commercial parameters for licensing your identity. These rules are checked against every deal submission.</p>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save licensing rules?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This creates a new version and takes effect immediately on all deal evaluations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>Save changes</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Top metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pricing Floor */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Pricing Floor</div>
            <p className="text-xs text-muted-foreground mt-0.5">Minimum deal value accepted</p>
            {editing ? (
              <>
                <Input
                  type="number"
                  min={0}
                  className="mt-2"
                  value={draft.pricing_floor as number}
                  onChange={(e) => setDraft({ ...draft, pricing_floor: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground/60 mt-1">Typical range for {category}: {categoryHints[category] || "$10K-$100K"}</p>
              </>
            ) : (
              <div className="text-2xl font-bold font-mono tabular-nums mt-2">${((rules.pricing_floor as number) || 0).toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        {/* Exclusivity */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Exclusivity</div>
            <p className="text-xs text-muted-foreground mt-0.5">Whether exclusive deals are offered</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-3">
                <Switch checked={draft.exclusivity_available as boolean} onCheckedChange={(v) => setDraft({ ...draft, exclusivity_available: v })} />
                <Label className="text-sm">{draft.exclusivity_available ? "Available" : "Not available"}</Label>
              </div>
            ) : (
              <div className="text-lg font-medium mt-2">{(rules.exclusivity_available as boolean) ? "Available" : "Not available"}</div>
            )}
          </CardContent>
        </Card>

        {/* Grace Period */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Grace Period</div>
            <p className="text-xs text-muted-foreground mt-0.5">Time buffer when you update your profile during active deals</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-3">
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={draft.default_grace_period_hours as number}
                  onChange={(e) => setDraft({ ...draft, default_grace_period_hours: parseInt(e.target.value) || 48 })}
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            ) : (
              <div className="text-lg font-medium font-mono tabular-nums mt-2">{(rules.default_grace_period_hours as number) || 48}h</div>
            )}
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Currency</div>
            <p className="text-xs text-muted-foreground mt-0.5">Default currency for deal pricing</p>
            {editing ? (
              <Select
                value={(draft.currency as string) || "USD"}
                onValueChange={(v) => setDraft({ ...draft, currency: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium mt-2">{String(rules.currency || "USD")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blacklisted use cases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Blacklisted Use Cases</CardTitle>
          <CardDescription>Industries or use cases that are prohibited from licensing your identity</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <PillEditor
              items={(draft.blacklisted_use_cases as string[]) || []}
              onChange={(items) => setDraft({ ...draft, blacklisted_use_cases: items })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {((rules.blacklisted_use_cases as string[]) || []).length > 0
                ? ((rules.blacklisted_use_cases as string[]) || []).map((t) => <Badge key={t} variant="destructive">{t}</Badge>)
                : <span className="text-sm text-muted-foreground italic">No blacklisted use cases</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permitted use cases */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Permitted Use Cases</CardTitle>
          <CardDescription>Explicitly allowed industries or use cases for licensing</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <PillEditor
              items={(draft.permitted_use_cases as string[]) || []}
              onChange={(items) => setDraft({ ...draft, permitted_use_cases: items })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {((rules.permitted_use_cases as string[]) || []).length > 0
                ? ((rules.permitted_use_cases as string[]) || []).map((t) => <Badge key={t} className="bg-success/10 text-success border-success/20">{t}</Badge>)
                : <span className="text-sm text-muted-foreground italic">All use cases permitted (except blacklisted)</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territory restrictions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Territory Restrictions</CardTitle>
          <CardDescription>Geographic restrictions on where deals can operate</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <PillEditor
              items={(draft.territory_restrictions as string[]) || []}
              onChange={(items) => setDraft({ ...draft, territory_restrictions: items })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {((rules.territory_restrictions as string[]) || []).length > 0
                ? ((rules.territory_restrictions as string[]) || []).map((t) => <Badge key={t} variant="outline">{t}</Badge>)
                : <Badge className="bg-success/10 text-success">Global -- No restrictions</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
