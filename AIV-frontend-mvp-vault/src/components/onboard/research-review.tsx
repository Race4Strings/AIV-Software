"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PillEditor } from "@/components/shared/pill-editor";
import { useOnboarding } from "./onboarding-context";
import {
  CheckCircle, Loader2, Pencil, X, Save,
  User, Brain, Share2, Briefcase,
} from "lucide-react";

// Map ALCM section keys to display config
const SECTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  identity: {
    label: "Identity",
    icon: <User className="size-4" />,
    description: "Who they are, what they're known for, and what they stand for",
  },
  personality: {
    label: "Personality",
    icon: <Brain className="size-4" />,
    description: "Traits, communication style, and core values",
  },
  knowledge: {
    label: "Knowledge & Expertise",
    icon: <Brain className="size-4" />,
    description: "Career highlights, expertise, and achievements",
  },
  social_media: {
    label: "Social Presence",
    icon: <Share2 className="size-4" />,
    description: "Platforms, content style, and themes",
  },
  commercial: {
    label: "Commercial Profile",
    icon: <Briefcase className="size-4" />,
    description: "Brand partnerships and business ventures",
  },
};

/** Render a single value — string as text, array as badges */
function FieldValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground text-sm italic">None found</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">
            {String(item)}
          </Badge>
        ))}
      </div>
    );
  }
  if (typeof value === "string" && value.trim()) {
    return <p className="text-sm text-foreground leading-relaxed">{value}</p>;
  }
  return <span className="text-muted-foreground text-sm italic">Not available</span>;
}

/** Format a field key into a readable label */
function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Editable section card */
function SectionCard({
  sectionKey,
  data,
  onUpdate,
}: {
  sectionKey: string;
  data: Record<string, unknown>;
  onUpdate: (key: string, newData: Record<string, unknown>) => void;
}) {
  const config = SECTION_CONFIG[sectionKey] || {
    label: formatLabel(sectionKey),
    icon: <Brain className="size-4" />,
    description: "",
  };
  const [editing, setEditing] = useState(false);
  const [editArrays, setEditArrays] = useState<Record<string, string[]>>({});
  const [editText, setEditText] = useState<Record<string, string>>({});

  const startEdit = () => {
    const arrays: Record<string, string[]> = {};
    const text: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith("_")) continue;
      if (Array.isArray(v)) {
        arrays[k] = v.map(String);
      } else {
        text[k] = String(v ?? "");
      }
    }
    setEditArrays(arrays);
    setEditText(text);
    setEditing(true);
  };

  const saveEdit = () => {
    const updated: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(editArrays)) {
      updated[k] = v;
    }
    for (const [k, v] of Object.entries(editText)) {
      updated[k] = v;
    }
    onUpdate(sectionKey, updated);
    setEditing(false);
  };

  const fields = Object.entries(data).filter(([k]) => !k.startsWith("_") && !k.startsWith("raw_"));

  return (
    <div className="border rounded-xl p-5 space-y-4 bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-muted">{config.icon}</div>
          <div>
            <h3 className="text-sm font-semibold">{config.label}</h3>
            {config.description && (
              <p className="text-xs text-muted-foreground">{config.description}</p>
            )}
          </div>
        </div>
        {editing ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={saveEdit}>
              <Save className="size-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={startEdit}>
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {fields.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {formatLabel(key)}
            </label>
            {editing ? (
              Array.isArray(data[key]) ? (
                <PillEditor
                  items={editArrays[key] || []}
                  onChange={(updated) => setEditArrays((prev) => ({ ...prev, [key]: updated }))}
                />
              ) : (typeof value === "string" && value.length < 100) ? (
                <Input
                  value={editText[key] || ""}
                  onChange={(e) => setEditText((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="text-sm"
                />
              ) : (
                <Textarea
                  value={editText[key] || ""}
                  onChange={(e) => setEditText((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="text-sm"
                />
              )
            ) : (
              <FieldValue value={value} />
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No data found for this section</p>
        )}
      </div>
    </div>
  );
}

export function ResearchReview() {
  const { researchStatus, completeOnboarding, isLoading, researchData, pollResearch } = useOnboarding();
  const [localData, setLocalData] = useState<Record<string, unknown> | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync researchData to localData when complete
  useEffect(() => {
    if (researchStatus === "complete" && researchData && !localData) {
      setLocalData(researchData);
    }
  }, [researchStatus, researchData, localData]);

  // Poll for research completion
  useEffect(() => {
    if (researchStatus === "pending") {
      pollIntervalRef.current = setInterval(() => {
        pollResearch();
      }, 3000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [researchStatus, pollResearch]);

  // Progressive loading text
  const loadingMessages = [
    "Initializing research agents...",
    "Scanning unified identity profiles...",
    "Analyzing career history...",
    "Aggregating social presence...",
    "Cross-referencing achievements...",
    "Drafting core personality traits...",
    "Synthesizing knowledge graph...",
    "Finalizing profile data...",
  ];

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (researchStatus === "pending") {
      const interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 3500); // Change text every 3.5s
      return () => clearInterval(interval);
    }
  }, [researchStatus, loadingMessages.length]);

  if (researchStatus === "pending" || researchStatus === "idle") {
    // Show a "Proceed Anyway" button after 45 seconds of waiting
    const showSkip = loadingStep >= loadingMessages.length - 1;

    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-16 animate-in fade-in">
        <div className="relative size-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping duration-[3000ms]" />
          <div className="absolute inset-2 rounded-full border border-primary/50 animate-spin duration-1000" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">AIV is researching your profile</h2>
          <p className="text-sm text-primary animate-pulse h-6">
            {loadingMessages[loadingStep]}
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            This usually takes 15-30 seconds.
          </p>
        </div>

        {showSkip && (
          <div className="pt-4 animate-in fade-in zoom-in duration-700">
            <p className="text-xs text-muted-foreground mb-4">
              Research is taking longer than expected. You can proceed and manually edit your profile.
            </p>
            <Button
              variant="outline"
              onClick={() => completeOnboarding()}
              className="px-8"
            >
              Skip Research & Proceed
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Extract sections — skip internal keys, order them logically
  const SECTION_ORDER = ["identity", "personality", "knowledge", "social_media", "commercial"];
  const sections = localData
    ? SECTION_ORDER
      .filter((k) => localData[k] && typeof localData[k] === "object" && !Array.isArray(localData[k]))
      .map((k) => [k, localData[k]] as [string, Record<string, unknown>])
    : [];

  const handleSectionUpdate = (sectionKey: string, newData: Record<string, unknown>) => {
    if (!localData) return;
    setLocalData({ ...localData, [sectionKey]: newData });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <CheckCircle className="size-8 text-green-500 mx-auto" />
        <h2 className="text-2xl font-semibold">Review Your Profile</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what AIV found about you. Edit anything that&apos;s incorrect before we create your twin.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map(([key, value]) => (
          <SectionCard
            key={key}
            sectionKey={key}
            data={value as Record<string, unknown>}
            onUpdate={handleSectionUpdate}
          />
        ))}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No research data available yet. You can still create your twin.</p>
        </div>
      )}

      <Button
        onClick={completeOnboarding}
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <CheckCircle className="size-4 mr-2" />
        )}
        Create My Digital Twin
      </Button>
    </div>
  );
}
