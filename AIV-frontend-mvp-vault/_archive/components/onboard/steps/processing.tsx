"use client";

import { useOnboard } from "../onboard-context";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

const processingSteps = [
  { key: "video_saved", label: "Saving video" },
  { key: "frames_extracted", label: "Extracting frames" },
  { key: "audio_extracted", label: "Extracting audio" },
  { key: "transcription_complete", label: "Transcribing" },
  { key: "dimensions_extracted", label: "Analyzing personality" },
  { key: "voice_cloned", label: "Creating voice" },
  { key: "avatar_generated", label: "Generating avatar" },
  { key: "personality_synthesized", label: "Finalizing" },
] as const;

export function ProcessingStep() {
  const { onboardStatus } = useOnboard();

  const getCompletedCount = () => {
    if (!onboardStatus) return 0;
    return processingSteps.filter(
      (step) => onboardStatus[step.key as keyof typeof onboardStatus] === true
    ).length;
  };

  const getCurrentStep = () => {
    if (!onboardStatus) return processingSteps[0].label;

    for (const step of processingSteps) {
      if (onboardStatus[step.key as keyof typeof onboardStatus] !== true) {
        return step.label;
      }
    }
    return "Complete";
  };

  const progressPercentage =
    (getCompletedCount() / processingSteps.length) * 100;

  // Error state
  if (onboardStatus?.overall_status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center max-w-md mx-auto min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {onboardStatus.error ||
            "An error occurred while processing your video."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center max-w-md mx-auto min-h-[60vh] space-y-8 animate-in fade-in">
      {/* Loader */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-semibold">Creating Your Person</h2>
        <p className="text-sm text-muted-foreground">
          This may take a few minutes
        </p>
      </div>

      {/* Progress */}
      <div className="w-full space-y-3">
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          {getCurrentStep()}...
        </p>
      </div>
    </div>
  );
}
