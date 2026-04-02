"use client";

import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Step {
  label: string;
  icon: LucideIcon;
}

interface ProgressBarProps {
  currentStep: number;
  steps: Step[];
  totalSteps: number;
  authorized?: boolean;
}

export function ProgressBar({ currentStep, steps, totalSteps, authorized = false }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep || authorized;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color] duration-300 ${
                isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                isActive ? "border-primary bg-primary/10 text-primary" :
                "border-border text-muted-foreground"
              }`}>
                {isDone && !isActive ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-500" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${((authorized ? totalSteps : currentStep) / totalSteps) * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-center">Step {currentStep + 1} of {totalSteps}</p>
    </div>
  );
}
