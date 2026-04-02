"use client";

import { cn } from "@/lib/utils";
import { Bot, User, GraduationCap, Wrench } from "lucide-react";

type Mode = "ASSISTANT" | "DIGITAL_SELF" | "TRAINING" | "REFINEMENT";

const MODE_CONFIG: Record<Mode, { label: string; icon: typeof Bot; description: string }> = {
  ASSISTANT: {
    label: "Assistant",
    icon: Bot,
    description: "Platform help, deal status, revenue",
  },
  DIGITAL_SELF: {
    label: "Digital Self",
    icon: User,
    description: "Talk to your twin",
  },
  TRAINING: {
    label: "Training",
    icon: GraduationCap,
    description: "Add info, find interviews",
  },
  REFINEMENT: {
    label: "Refinement",
    icon: Wrench,
    description: "Correct and fine-tune",
  },
};

interface ModeSwitcherProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean;
}

export function ModeSwitcher({ currentMode, onModeChange, disabled }: ModeSwitcherProps) {
  const activeConfig = MODE_CONFIG[currentMode];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1" role="tablist" aria-label="Assistant mode">
        {(Object.keys(MODE_CONFIG) as Mode[]).map((mode) => {
          const config = MODE_CONFIG[mode];
          const Icon = config.icon;
          const isActive = currentMode === mode;

          return (
            <button
              key={mode}
              role="tab"
              aria-selected={isActive}
              aria-label={`${config.label}: ${config.description}`}
              onClick={() => onModeChange(mode)}
              disabled={disabled}
              title={config.description}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[44px] text-xs font-medium transition-[color,background-color,box-shadow]",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground px-1">{activeConfig.description}</p>
    </div>
  );
}
