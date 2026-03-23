"use client";

import { useOnboard } from "./onboard-context";
import { IntroStep } from "./steps/intro";
import { VideoCaptureStep } from "./steps/video-capture";
import { ProcessingStep } from "./steps/processing";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";

export function OnboardWizard() {
  const { step } = useOnboard();

  const getProgress = () => {
    switch (step) {
      case "intro":
        return 0;
      case "video":
        return 50;
      case "processing":
        return 75;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "video":
        return "1 / 2";
      case "processing":
        return "2 / 2";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Progress Bar */}
      {step !== "intro" && step !== "complete" && (
        <div className="w-full h-2 bg-muted sticky top-0 z-50">
          <Progress value={getProgress()} className="h-full rounded-none" />
        </div>
      )}

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        {step === "intro" && <IntroStep />}
        {step === "video" && <VideoCaptureStep stepLabel={getStepNumber()} />}
        {step === "processing" && <ProcessingStep />}
        {step === "complete" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold">Person Created Successfully!</h1>
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
