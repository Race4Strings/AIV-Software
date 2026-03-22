"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Pencil, Save, X, Loader2 } from "lucide-react";
import { PillEditor } from "@/components/shared/pill-editor";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

interface Props {
  twin: Twin;
  onUpdate?: () => Promise<void>;
}

export function TwinTabPersonality({ twin, onUpdate }: Props) {
  const personality = (twin.alcm_data?.personality as Record<string, unknown>) || {};
  const entries = Object.entries(personality).filter(([, v]) => v !== null && v !== undefined);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formArrays, setFormArrays] = useState<Record<string, string[]>>({});
  const [formText, setFormText] = useState<Record<string, string>>({});

  const startEdit = () => {
    const arrays: Record<string, string[]> = {};
    const text: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (Array.isArray(v)) {
        arrays[k] = v.map(String);
      } else if (typeof v === "string" && v.length > 60) {
        text[k] = v;
      } else if (typeof v === "number") {
        text[k] = String(Math.round((v as number) * 100));
      } else {
        text[k] = String(v ?? "");
      }
    }
    setFormArrays(arrays);
    setFormText(text);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const original = (twin.alcm_data?.personality as Record<string, unknown>) || {};
    const updatedPersonality: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(formArrays)) {
      updatedPersonality[k] = v;
    }
    for (const [k, v] of Object.entries(formText)) {
      if (Array.isArray(original[k])) {
        updatedPersonality[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        const num = Number(v);
        if (!isNaN(num) && v.trim() !== "") {
          updatedPersonality[k] = num <= 1 ? num : num / 100;
        } else {
          updatedPersonality[k] = v;
        }
      }
    }

    const result = await updateTwin(twin.id, {
      alcm_data: { ...twin.alcm_data, personality: updatedPersonality },
    });
    setSaving(false);
    if (result) {
      toast.success("Personality profile updated");
      setEditing(false);
      onUpdate?.();
    } else {
      toast.error("Failed to update personality");
    }
  };

  if (entries.length === 0 && !editing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Brain className="size-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Build your personality</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Complete the on-camera questions during onboarding or talk to AIV to build your personality profile.
        </p>
        <Button className="mt-6" onClick={startEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Add Personality Traits
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Editing Personality</h3>
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

        {/* Array fields — pill editor */}
        {Object.entries(formArrays).map(([key, items]) => {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return (
            <div key={key} className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
              <PillEditor
                items={items}
                onChange={(updated) => setFormArrays({ ...formArrays, [key]: updated })}
              />
            </div>
          );
        })}

        {/* Text/number fields */}
        {Object.entries(formText).map(([key, value]) => {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const isLong = value.length > 60;
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
              {isLong ? (
                <Textarea
                  value={value}
                  onChange={(e) => setFormText({ ...formText, [key]: e.target.value })}
                  rows={4}
                  className="resize-y"
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) => setFormText({ ...formText, [key]: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </div>
      <div className="space-y-4">
        {entries.map(([key, value]) => {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          if (Array.isArray(value)) {
            return (
              <div key={key}>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {value.map((item, i) => (
                    <span key={i} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                      {String(item)}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
          if (typeof value === "string" && value.length > 60) {
            return (
              <div key={key} className="rounded-lg border bg-muted/50 p-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm leading-relaxed">{value}</p>
              </div>
            );
          }
          return (
            <span key={key} className="inline-flex mr-2 mb-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              {typeof value === "number" ? `${label}: ${Math.round(value * 100)}%` : `${label}: ${String(value)}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}
