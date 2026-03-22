"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { onboardingApi } from "@/lib/api/onboarding";
import { toast } from "sonner";

export type OnboardStep =
  | "welcome"
  | "q1" | "q2" | "q3"
  | "q4" | "q5" | "q6"
  | "research-review"
  | "processing"
  | "complete";

interface OnboardingContextType {
  step: OnboardStep;
  setStep: (step: OnboardStep) => void;
  sessionId: string | null;
  isLoading: boolean;
  // Q1-Q3 text responses
  responses: Record<string, Record<string, string>>;
  setResponse: (step: string, data: Record<string, string>) => void;
  // Q4-Q6 video recordings
  recordings: Record<string, Blob>;
  setRecording: (question: string, blob: Blob) => void;
  // Research
  researchData: Record<string, unknown> | null;
  researchStatus: "idle" | "pending" | "complete";
  // Actions
  startOnboarding: () => Promise<void>;
  submitTextStep: (stepNum: number, data: Record<string, string>) => Promise<void>;
  submitVideoStep: (stepNum: number, blob: Blob) => Promise<void>;
  triggerResearch: () => Promise<void>;
  pollResearch: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<OnboardStep>("welcome");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<Record<string, Record<string, string>>>({});
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});
  const [researchData, setResearchData] = useState<Record<string, unknown> | null>(null);
  const [researchStatus, setResearchStatus] = useState<"idle" | "pending" | "complete">("idle");

  const setResponse = useCallback((stepKey: string, data: Record<string, string>) => {
    setResponses((prev) => ({ ...prev, [stepKey]: data }));
  }, []);

  const setRecording = useCallback((question: string, blob: Blob) => {
    setRecordings((prev) => ({ ...prev, [question]: blob }));
  }, []);

  const startOnboarding = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await onboardingApi.start();
      setSessionId(session.id);
      setStep("q1");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error("Session expired — please sign in again");
      } else {
        toast.error(`Failed to start onboarding: ${status || msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitTextStep = useCallback(
    async (stepNum: number, data: Record<string, string>) => {
      if (!sessionId) return;
      setIsLoading(true);
      try {
        await onboardingApi.submitStep(sessionId, stepNum, data);
        setResponse(String(stepNum), data);
      } catch {
        toast.error("Failed to save your response");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, setResponse]
  );

  const submitVideoStep = useCallback(
    async (stepNum: number, blob: Blob) => {
      if (!sessionId) return;
      setIsLoading(true);

      // Upload video for voice cloning on the FIRST video step (Q4)
      // so ElevenLabs has maximum time to process while user records Q5, Q6, and reviews research
      if (stepNum === 4) {
        try {
          await onboardingApi.submitVoice(sessionId, blob, `q${stepNum}.webm`);
          console.log("[Onboarding] Voice sample uploaded for cloning (Q4)");
        } catch (err) {
          console.warn("[Onboarding] Voice upload failed, continuing:", err);
        }
      }

      setRecording(`q${stepNum}`, blob);

      // Always advance the step counter regardless of upload success
      try {
        await onboardingApi.submitStep(sessionId, stepNum, { recorded: "true" });
      } catch {
        // Silently continue — step advancement is not critical for demo
      }
      setIsLoading(false);
    },
    [sessionId, setRecording]
  );

  const triggerResearch = useCallback(async () => {
    if (!sessionId) return;
    try {
      await onboardingApi.triggerResearch(sessionId);
      setResearchStatus("pending");
    } catch {
      console.error("Failed to trigger research");
    }
  }, [sessionId]);

  const pollResearch = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await onboardingApi.getResearch(sessionId);
      if (result.status === "complete") {
        setResearchData(result.data);
        setResearchStatus("complete");
      }
    } catch {
      // Silently retry on next poll
    }
  }, [sessionId]);

  const completeOnboarding = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await onboardingApi.complete(sessionId);
      setStep("complete");
      toast.success("Your digital twin has been created!");
    } catch {
      toast.error("Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return (
    <OnboardingContext.Provider
      value={{
        step, setStep, sessionId, isLoading,
        responses, setResponse,
        recordings, setRecording,
        researchData, researchStatus,
        startOnboarding, submitTextStep, submitVideoStep,
        triggerResearch, pollResearch, completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
