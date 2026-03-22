"use client";

import { useOnboarding } from "./onboarding-context";
import { TextStep } from "./text-step";
import { VideoStep } from "./video-step";
import { ResearchReview } from "./research-review";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, ArrowRight, Mic, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import apiClient from "@/lib/api/client";
import { motion, AnimatePresence } from "framer-motion";

const STEP_PROGRESS: Record<string, number> = {
  welcome: 0,
  q1: 10,
  q2: 25,
  q3: 40,
  q4: 55,
  q5: 65,
  q6: 75,
  "research-review": 90,
  processing: 95,
  complete: 100,
};

const slideVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" as const } },
};

export function OnboardingFlow() {
  const { step, startOnboarding, isLoading } = useOnboarding();
  const router = useRouter();
  const { setTheme } = useTheme();
  const progress = STEP_PROGRESS[step] ?? 0;

  const [isCheckingTwin, setIsCheckingTwin] = useState(true);

  // Check if user already has a twin, if so, skip onboarding
  useEffect(() => {
    apiClient.get("/twins")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          router.push("/");
        } else {
          setIsCheckingTwin(false);
        }
      })
      .catch(() => {
        setIsCheckingTwin(false);
      });
  }, [router]);

  // Redirect to dashboard after completion
  useEffect(() => {
    if (step === "complete") {
      const timer = setTimeout(() => router.push("/"), 4000);
      return () => clearTimeout(timer);
    }
  }, [step, router]);

  // Switch to dark theme when onboarding begins
  const handleGetStarted = async () => {
    setTheme("dark");
    await startOnboarding();
  };

  if (isCheckingTwin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
           className="size-10 rounded-full border-2 border-primary border-t-transparent"
        />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Setup...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Progress bar */}
      {step !== "welcome" && step !== "complete" && step !== "processing" && (
        <div className="w-full h-1.5 bg-muted sticky top-0 z-50 overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      )}

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-12 flex flex-col justify-center overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full flex justify-center"
          >
            {step === "welcome" && (
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <Image
                  src="/aiv.svg"
                  alt="AIV"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
                <h1 className="text-3xl font-bold">Create Your Digital Twin</h1>
                <p className="text-muted-foreground max-w-md text-balance">
                  AIV will guide you through 6 quick steps to build your
                  ALCM, your digital twin&apos;s identity foundation.
                  Takes about 3 to 5 minutes.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <Mic className="size-3.5" /> Microphone required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Video className="size-3.5" /> Camera required
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60 max-w-sm text-balance">
                  Please be in a quiet environment for accurate voice and identity capture.
                </p>
                <Button size="lg" onClick={handleGetStarted} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="size-4 mr-2" />
                  )}
                  Get Started
                </Button>
              </div>
            )}

            {step === "q1" && <TextStep stepNumber={1} nextStep="q2" />}
            {step === "q2" && <TextStep stepNumber={2} nextStep="q3" />}
            {step === "q3" && <TextStep stepNumber={3} nextStep="q4" />}
            {step === "q4" && <VideoStep stepNumber={4} nextStep="q5" />}
            {step === "q5" && <VideoStep stepNumber={5} nextStep="q6" />}
            {step === "q6" && <VideoStep stepNumber={6} nextStep="research-review" />}
            {step === "research-review" && <ResearchReview />}

            {step === "processing" && (
              <div className="flex flex-col items-center justify-center text-center space-y-8 w-full max-w-md mx-auto">
                <div className="relative size-32">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-primary/40"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-b-2 border-primary/60"
                  />
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center blur-sm"
                  />
                  <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center backdrop-blur-md">
                    <Image src="/aiv.svg" alt="AIV" width={40} height={40} className="opacity-80 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">Weaving your ALCM</h1>
                  <p className="text-muted-foreground whitespace-pre-wrap h-12 flex items-center justify-center">
                    {"Synthesizing identity points...\nTraining initial voice model..."}
                  </p>
                </div>
              </div>
            )}

            {step === "complete" && (
              <div className="flex flex-col items-center justify-center text-center space-y-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 200 }}
                  className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center relative border border-emerald-500/30"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full bg-emerald-500/30"
                  />
                  <CheckCircle className="w-12 h-12 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </motion.div>
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold tracking-tight">Digital Twin Initiated</h1>
                  <p className="text-lg text-muted-foreground max-w-md text-balance">
                    Your unique ALCM profile has been established. Redirecting to your dashboard to meet your twin...
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
