"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GettingStartedProps {
  twinExists: boolean;
  twinHealthy: boolean;
  calibrationDone: boolean;
  certified: boolean;
  hasDeal: boolean;
}

const STORAGE_KEY = "aiv_getting_started_dismissed";

export function GettingStarted({ twinExists, twinHealthy, calibrationDone, certified, hasDeal }: GettingStartedProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  if (dismissed) return null;

  const steps = [
    { label: "Complete your identity profile", done: twinExists, href: "/twin" },
    { label: "Train your digital twin", done: twinHealthy, href: "/twin/training-area" },
    { label: "Complete Precision Tuning", done: calibrationDone, href: "/calibration" },
    { label: "Certify your identity", done: certified, href: "/twin/certification" },
    { label: "Create your first deal", done: hasDeal, href: "/deals" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) {
    // All done — auto-dismiss
    localStorage.setItem(STORAGE_KEY, "true");
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => { localStorage.setItem(STORAGE_KEY, "true"); setDismissed(true); }}
        aria-label="Dismiss getting started"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          Getting Started — {completedCount} of {steps.length} complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} className="h-1.5" />
        <div className="space-y-2">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.done ? "#" : step.href}
              className={`flex items-center gap-2.5 text-sm py-1 transition-colors ${
                step.done ? "text-success" : "text-foreground hover:text-primary"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={step.done ? "line-through opacity-60" : ""}>{step.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
