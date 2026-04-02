"use client";

import { useState } from "react";
import { Shield, Pencil, Save, X } from "lucide-react";
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
import { guardrailsApi, type GuardrailConfig } from "@/lib/api/guardrails";

interface TwinTabGuardrailsProps {
  twinId: string;
  guardrails: GuardrailConfig | null;
  onGuardrailsChange: (config: GuardrailConfig) => void;
}

export function TwinTabGuardrails({ twinId, guardrails, onGuardrailsChange }: TwinTabGuardrailsProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const startEdit = () => {
    if (guardrails) {
      setDraft({
        blocked_topics: guardrails.blocked_topics || [],
        restricted_topics: Array.isArray(guardrails.restricted_topics) ? guardrails.restricted_topics : [],
        humor_permitted: guardrails.humor_permitted,
        require_ai_disclosure: guardrails.require_ai_disclosure,
        language: (guardrails as Record<string, unknown>).language || "",
        formality: (guardrails as Record<string, unknown>).formality || "neutral",
        controversy_threshold: (guardrails as Record<string, unknown>).controversy_threshold || "low",
      });
    } else {
      setDraft({
        blocked_topics: [],
        restricted_topics: [],
        humor_permitted: true,
        require_ai_disclosure: true,
        language: "",
        formality: "neutral",
        controversy_threshold: "low",
      });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await guardrailsApi.update(twinId, draft);
      onGuardrailsChange(result.config || result);
      setEditing(false);
      toast.success("Guardrails updated (new version created)");
    } catch {
      toast.error("Failed to save guardrails");
    }
    setSaving(false);
  };

  if (!guardrails && !editing) {
    return (
      <div className="space-y-4 mt-4">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No guardrails configured yet</p>
            <p className="text-sm mt-1">Set up behavioral rules to control what your twin can and cannot say.</p>
            <Button className="mt-3" onClick={startEdit}>Configure Guardrails</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Control what your twin can and cannot say. These rules are enforced on every generated output.</p>
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
                  <AlertDialogTitle>Save guardrails?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This creates a new version and takes effect immediately on all generated outputs.
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

      {/* Blocked Topics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Blocked Topics</CardTitle>
          <CardDescription>Topics your twin will never discuss or engage with</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <PillEditor
              items={(draft.blocked_topics as string[]) || []}
              onChange={(items) => setDraft({ ...draft, blocked_topics: items })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(guardrails!.blocked_topics || []).length > 0
                ? guardrails!.blocked_topics.map((t) => <Badge key={t} variant="destructive">{t}</Badge>)
                : <span className="text-sm text-muted-foreground italic">No blocked topics configured</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restricted Topics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Restricted Topics</CardTitle>
          <CardDescription>Topics your twin will handle with extra caution and disclaimers</CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <PillEditor
              items={(draft.restricted_topics as string[]) || []}
              onChange={(items) => setDraft({ ...draft, restricted_topics: items })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(() => {
                const topics = guardrails!.restricted_topics;
                const arr = Array.isArray(topics) ? topics : [];
                return arr.length > 0
                  ? arr.map((t: string) => <Badge key={t} variant="outline" className="border-amber-500/40 text-amber-600">{t}</Badge>)
                  : <span className="text-sm text-muted-foreground italic">No restricted topics configured</span>;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Humor */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Humor</div>
            <p className="text-xs text-muted-foreground mt-0.5">Whether your twin can use humor in responses</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-3">
                <Switch checked={draft.humor_permitted as boolean} onCheckedChange={(v) => setDraft({ ...draft, humor_permitted: v })} />
                <Label className="text-sm">{draft.humor_permitted ? "Permitted" : "Restricted"}</Label>
              </div>
            ) : (
              <div className="text-lg font-medium mt-2">{guardrails!.humor_permitted ? "Permitted" : "Restricted"}</div>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
              {(editing ? draft.humor_permitted : guardrails!.humor_permitted)
                ? "Your twin may use appropriate humor and wit in responses."
                : "Your twin will maintain a professional, serious tone at all times."}
            </p>
          </CardContent>
        </Card>

        {/* AI Disclosure */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">AI Disclosure</div>
            <p className="text-xs text-muted-foreground mt-0.5">Must disclose that responses are AI-generated</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-3">
                <Switch checked={draft.require_ai_disclosure as boolean} onCheckedChange={(v) => setDraft({ ...draft, require_ai_disclosure: v })} />
                <Label className="text-sm">{draft.require_ai_disclosure ? "Required" : "Optional"}</Label>
              </div>
            ) : (
              <div className="text-lg font-medium mt-2">{guardrails!.require_ai_disclosure ? "Required" : "Optional"}</div>
            )}
            <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
              {(editing ? draft.require_ai_disclosure : guardrails!.require_ai_disclosure)
                ? "Every response will include a note that it was AI-generated."
                : "Responses will not include an AI-generation disclosure."}
            </p>
          </CardContent>
        </Card>

        {/* Config Version */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Config Version</div>
            <p className="text-xs text-muted-foreground mt-0.5">Every change creates a new version for audit</p>
            <div className="text-lg font-medium font-mono tabular-nums mt-2">v{guardrails?.version ?? 1}</div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Language</div>
            <p className="text-xs text-muted-foreground mt-0.5">Allowed response languages (comma-separated codes)</p>
            {editing ? (
              <Input
                className="mt-2"
                value={(draft.language as string) || ""}
                onChange={(e) => setDraft({ ...draft, language: e.target.value })}
                placeholder="en, es, fr"
              />
            ) : (
              <div className="text-lg font-medium mt-2">
                {(guardrails as Record<string, unknown>)?.language
                  ? String((guardrails as Record<string, unknown>).language)
                  : <span className="text-sm text-muted-foreground italic">Any</span>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formality */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Formality</div>
            <p className="text-xs text-muted-foreground mt-0.5">Tone register for generated responses</p>
            {editing ? (
              <Select
                value={(draft.formality as string) || "neutral"}
                onValueChange={(v) => setDraft({ ...draft, formality: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="very_formal">Very Formal</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium mt-2 capitalize">
                {String((guardrails as Record<string, unknown>)?.formality || "neutral").replace(/_/g, " ")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controversy Threshold */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium">Controversy Threshold</div>
            <p className="text-xs text-muted-foreground mt-0.5">How the twin handles controversial topics</p>
            {editing ? (
              <Select
                value={(draft.controversy_threshold as string) || "low"}
                onValueChange={(v) => setDraft({ ...draft, controversy_threshold: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avoid_all">Avoid All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="text-lg font-medium mt-2 capitalize">
                {String((guardrails as Record<string, unknown>)?.controversy_threshold || "low").replace(/_/g, " ")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
