"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Check, X, Pencil, Save, Loader2 } from "lucide-react";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

interface Props {
  twin: Twin;
  onUpdate?: () => Promise<void>;
}

export function TwinTabGovernance({ twin, onUpdate }: Props) {
  const governance = twin.governance || {};
  const entries = Object.entries(governance).filter(([, v]) => v !== null && v !== undefined);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ ...governance });

  const startEdit = () => {
    if (entries.length === 0) {
      setForm({
        no_go_topics: "",
        behavioral_tone: "",
        usage_restrictions: "",
        content_boundaries: ""
      });
    } else {
      setForm({ ...governance });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateTwin(twin.id, { governance: form });
    setSaving(false);
    if (result) {
      toast.success("Governance rules updated");
      setEditing(false);
      onUpdate?.();
    } else {
      toast.error("Failed to update governance");
    }
  };

  if (entries.length === 0 && !editing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="size-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Set your boundaries</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Define what your digital twin can and can&apos;t do. Set usage boundaries and behavioral guardrails.
        </p>
        <Button className="mt-6" onClick={startEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Define Governance Rules
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Editing Governance Rules</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="mr-1 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          {Object.entries(form).map(([key, value]) => {
            const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const isBool = typeof value === "boolean";
            return (
              <div key={key} className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                {isBool ? (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, [key]: !value })}
                    className="shrink-0"
                  >
                    {value ? <Check className="size-4 text-green-500" /> : <X className="size-4 text-red-500" />}
                  </button>
                ) : (
                  <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  {!isBool && (
                    <Input
                      className="mt-1"
                      value={Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "")}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
      {entries.map(([key, value]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const isBool = typeof value === "boolean";
        return (
          <div key={key} className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            {isBool ? (
              value ? <Check className="size-4 shrink-0 text-green-500" /> : <X className="size-4 shrink-0 text-red-500" />
            ) : (
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">{label}</p>
              {!isBool && (
                <p className="text-xs text-muted-foreground">
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
