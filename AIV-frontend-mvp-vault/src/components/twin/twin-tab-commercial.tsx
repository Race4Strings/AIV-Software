"use client";

import { useState } from "react";
import { JsonCardDisplay } from "@/components/shared/json-card-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Pencil, Save, X, Loader2 } from "lucide-react";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

interface Props {
  twin: Twin;
  onUpdate?: () => Promise<void>;
}

export function TwinTabCommercial({ twin, onUpdate }: Props) {
  const terms = twin.commercial_terms || {};
  const hasData = Object.keys(terms).length > 0;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ ...terms });

  const startEdit = () => {
    if (!hasData) {
      setForm({
        base_rate: "",
        availability: "",
        preferred_deal_types: "",
        exclusions: "",
        licensing_preferences: ""
      });
    } else {
      setForm({ ...terms });
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateTwin(twin.id, { commercial_terms: form });
    setSaving(false);
    if (result) {
      toast.success("Commercial terms updated");
      setEditing(false);
      onUpdate?.();
    } else {
      toast.error("Failed to update commercial terms");
    }
  };

  if (!hasData && !editing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <DollarSign className="size-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Define your commercial terms</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Set up your rates, availability, and preferred deal types to let AIV negotiate on your behalf.
        </p>
        <Button className="mt-6" onClick={startEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Add Commercial Terms
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Editing Commercial Terms</h3>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(form).map(([key, value]) => {
            const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={key} className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            );
          })}
        </div>
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
      <JsonCardDisplay data={terms} />
    </div>
  );
}
