"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useOnboarding, type OnboardStep } from "./onboarding-context";
import { ArrowRight, Loader2 } from "lucide-react";

interface TextStepProps {
  stepNumber: 1 | 2 | 3;
  nextStep: OnboardStep;
}

const STEP_CONFIG = {
  1: {
    title: "Let's start with who you are",
    subtitle: "Tell AIV your name and what you do.",
    fields: [
      { key: "name", label: "Full Name", type: "input" as const, placeholder: "Your name" },
      { key: "category", label: "Professional Title / Category", type: "input" as const, placeholder: "e.g. Content Creator, Musician, Athlete" },
    ],
  },
  2: {
    title: "Where can people find you?",
    subtitle: "Share your social media handles so AIV can learn about your online presence.",
    fields: [
      { key: "instagram", label: "Instagram", type: "input" as const, placeholder: "@handle" },
      { key: "tiktok", label: "TikTok", type: "input" as const, placeholder: "@handle" },
      { key: "youtube", label: "YouTube", type: "input" as const, placeholder: "Channel name" },
      { key: "x", label: "X (Twitter)", type: "input" as const, placeholder: "@handle" },
      { key: "linkedin", label: "LinkedIn", type: "input" as const, placeholder: "Profile URL or name" },
    ],
  },
  3: {
    title: "Tell us about yourself",
    subtitle: "A brief bio — what are you known for?",
    fields: [
      { key: "bio", label: "Bio", type: "textarea" as const, placeholder: "What do you do? What are you passionate about? What should your digital twin know about you?" },
    ],
  },
};

export function TextStep({ stepNumber, nextStep }: TextStepProps) {
  const { submitTextStep, triggerResearch, setStep, isLoading } = useOnboarding();
  const config = STEP_CONFIG[stepNumber];
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Pre-fill name from signup data stored in localStorage
    if (stepNumber === 1) {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const u = parsed.data || parsed;
          if (u.name) return { name: String(u.name) } as Record<string, string>;
        }
      } catch { /* ignore */ }
    }
    return {} as Record<string, string>;
  });

  const handleSubmit = async () => {
    // Validate required fields for step 1
    if (stepNumber === 1 && !values.name?.trim()) return;

    await submitTextStep(stepNumber, values);

    // After Q3, trigger research in background
    if (stepNumber === 3) {
      await triggerResearch();
    }

    setStep(nextStep);
  };

  const isValid = stepNumber === 1 ? !!values.name?.trim() : true;

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Step {stepNumber} of 6
        </p>
        <h2 className="text-2xl font-semibold">{config.title}</h2>
        <p className="text-muted-foreground text-sm">{config.subtitle}</p>
      </div>

      <div className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea
                id={field.key}
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                rows={4}
              />
            ) : (
              <Input
                id={field.key}
                placeholder={field.placeholder}
                value={values[field.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : (
          <ArrowRight className="size-4 mr-2" />
        )}
        {stepNumber === 3 ? "Continue to Video Questions" : "Next"}
      </Button>
    </div>
  );
}
