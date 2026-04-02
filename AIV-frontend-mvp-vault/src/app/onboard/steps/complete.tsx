"use client";

import { useRouter } from "next/navigation";
import { Shield, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CompleteStepProps } from "../types";

export function CompleteStep({
  isManager,
  showButtons,
  profileDraft,
}: CompleteStepProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] flex-1 text-center p-6 animate-in fade-in duration-700">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"][i % 5],
              animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
              animationDelay: `${Math.random() * 1}s`,
            }}
          />
        ))}
      </div>
      <div className="rounded-full bg-primary/10 p-6 mb-6">
        <Shield className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold">Your identity is ready</h1>
      <p className="mt-2 text-lg text-muted-foreground">Your digital identity is now protected and building.</p>
      <p className="mt-3 text-sm text-muted-foreground max-w-md">
        Your identity is secured with cryptographic verification and blockchain-anchored proof of ownership. Your Licensing Portal is open.
      </p>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {isManager
          ? "One more step: have the talent complete Precision Tuning to calibrate their digital twin with maximum accuracy."
          : "One more step: a quick session to help your twin understand the real you — not just the public you."}
      </p>
      {showButtons && (
        <div className="flex flex-col gap-3 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Button size="lg" onClick={() => router.push("/calibration")}>
            <Brain className="h-4 w-4 mr-2" /> Start Precision Tuning
          </Button>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            I&apos;ll do this later &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
