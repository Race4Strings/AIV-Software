"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchTwins } from "@/lib/api/twins";
import {
  startCalibration,
  saveResponses,
  completeCalibration,
  getCalibrationStatus,
  type CalibrationItem,
  type CalibrationRecord,
} from "@/lib/api/calibration";

// ──────────────────────────────────────────────────────
// Scale labels
// ──────────────────────────────────────────────────────

const SCALE_LABELS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

// ──────────────────────────────────────────────────────
// Domain framing map
// ──────────────────────────────────────────────────────

const DOMAIN_FRAMING: Record<string, string> = {
  "Extraversion": "How you engage with people",
  "Agreeableness": "How you relate to others",
  "Conscientiousness": "How you approach work",
  "Neuroticism": "How you handle pressure",
  "Negative Emotionality": "How you handle pressure",
  "Open-Mindedness": "How you explore ideas",
  "Openness": "How you explore ideas",
  "Openness to Experience": "How you explore ideas",
};

function getDomainFraming(domain: string): string {
  return DOMAIN_FRAMING[domain] || domain;
}

// ──────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────

type Phase = "intro" | "tuning" | "completing" | "done";

export default function CalibrationPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [items, setItems] = useState<CalibrationItem[]>([]);
  const [calId, setCalId] = useState<string | null>(null);
  const [twinId, setTwinId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<{ item: number; value: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // All responses stored by item number
  const [allResponses, setAllResponses] = useState<Record<number, number>>({});
  // Track which button was just selected for highlight animation
  const [justSelected, setJustSelected] = useState<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user + twin from localStorage, check for existing calibration
  useEffect(() => {
    async function init() {
      try {
        const twins = await fetchTwins();
        const tid = twins?.[0]?.id;
        if (!tid) {
          router.push("/twin");
          return;
        }
        setTwinId(tid);

        // Check for existing in-progress calibration
        const status = await getCalibrationStatus(tid);
        if (status.completed) {
          router.push("/dashboard");
          return;
        }
        if (status.has_calibration && status.calibration_id && status.progress > 0) {
          const result = await startCalibration(tid, "RESUME");
          if (result) {
            setItems(result.items);
            setCalId(status.calibration_id);
            setCurrentIndex(status.progress);
            setResponses([]);
            setPhase("tuning");
          }
        }
      } catch {
        // Silent — will show intro
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // Start a fresh calibration session
  const handleStart = useCallback(async () => {
    if (!twinId) return;
    setLoading(true);
    const result = await startCalibration(twinId);
    if (result) {
      setItems(result.items);
      setCalId(result.calibration.id);
      setCurrentIndex(0);
      setResponses([]);
      setPhase("tuning");
    } else {
      toast.error("Could not start Precision Tuning. Please try again.");
    }
    setLoading(false);
  }, [twinId]);

  const totalItems = items.length || 60;
  const currentItem = items[currentIndex] || null;

  // Save responses and advance to next item (or complete)
  const advanceToNext = useCallback(async (updatedResponses: Record<number, number>) => {
    if (!calId || !twinId) return;

    const isLastItem = currentIndex >= items.length - 1;

    // Build response list from all responses
    const responseList: { item: number; value: number }[] = [];
    for (const [itemNum, value] of Object.entries(updatedResponses)) {
      responseList.push({ item: Number(itemNum), value });
    }
    setResponses(responseList);

    // Save every item (auto-save)
    setSaving(true);
    await saveResponses(twinId, calId, responseList);
    setSaving(false);

    if (isLastItem) {
      setPhase("completing");
      const result = await completeCalibration(twinId, calId);
      if (result) {
        setPhase("done");
      } else {
        toast.error("Scoring failed. Your responses are saved — try again later.");
        router.push("/dashboard");
      }
    } else {
      setDirection("forward");
      setCurrentIndex((i) => i + 1);
    }
  }, [calId, twinId, currentIndex, items.length, router]);

  // Handle selecting a response value
  const handleSelect = useCallback((value: number) => {
    if (!currentItem || saving) return;

    // Clear any pending advance timer
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

    const updated = { ...allResponses, [currentItem.item]: value };
    setAllResponses(updated);
    setJustSelected(value);

    // Auto-advance after 300ms highlight
    advanceTimerRef.current = setTimeout(() => {
      setJustSelected(null);
      advanceToNext(updated);
    }, 300);
  }, [currentItem, saving, allResponses, advanceToNext]);

  // Keyboard shortcuts: press 1-5
  useEffect(() => {
    if (phase !== "tuning" || !currentItem) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num < 1 || num > 5) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      handleSelect(num);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, currentItem, handleSelect]);

  // Go back to previous item
  const handleBack = useCallback(() => {
    if (currentIndex <= 0 || saving) return;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setJustSelected(null);
    setDirection("back");
    setCurrentIndex((i) => i - 1);
  }, [currentIndex, saving]);

  const handleSkip = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── INTRO SCREEN ──
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-lg text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Brain className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Make your twin sharper.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your digital twin is built from public data — interviews, posts,
              articles. This quick session (about 5 minutes) helps it understand the{" "}
              <span className="text-foreground font-medium">real you</span> — not just
              the public you.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            60 quick statements, one at a time. Takes about 5 minutes.
            Tap how strongly you agree or disagree.
            Your responses are saved automatically — you can pause and resume anytime.
          </p>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full text-base" onClick={handleStart}>
              Start Precision Tuning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll do this later &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETING SCREEN ──
  if (phase === "completing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Processing your responses...</p>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ──
  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-lg text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Your twin just got sharper.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Your responses are recorded. As your twin processes more data,
              we&apos;ll compare its understanding against yours and surface any gaps.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Your assistant will notify you when comparison results are available.
          </p>

          <Button
            size="lg"
            className="w-full text-base"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── TUNING SESSION (one item per screen) ──
  if (!currentItem) return null;

  const progress = ((currentIndex + 1) / totalItems) * 100;
  const itemsRemaining = totalItems - (currentIndex + 1);
  const secondsRemaining = itemsRemaining * 5;
  const minutesRemaining = Math.ceil(secondsRemaining / 60);
  const domainFraming = getDomainFraming(currentItem.domain_label || "");
  const selectedValue = allResponses[currentItem.item];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} of {totalItems}
          {itemsRemaining > 0 && (
            <span> &middot; ~{minutesRemaining} min remaining</span>
          )}
        </div>
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          I&apos;ll do this later &rarr;
        </button>
      </div>

      {/* Item content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: direction === "forward" ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === "forward" ? -50 : 50 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-8"
            >
              {/* Domain framing */}
              {domainFraming && (
                <div className="text-center">
                  <p className="text-xs text-primary uppercase tracking-widest font-medium">
                    {domainFraming}
                  </p>
                </div>
              )}

              {/* Statement */}
              <div className="text-center px-4">
                <p className="text-2xl leading-relaxed">
                  <span className="text-muted-foreground">I am someone who </span>
                  <span className="font-medium">{currentItem.text.toLowerCase()}</span>
                </p>
              </div>

              {/* Keyboard hint on first item (desktop only) */}
              {currentIndex === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center hidden sm:block">
                  Tip: Press 1-5 on your keyboard to answer quickly
                </p>
              )}

              {/* Response buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {SCALE_LABELS.map(({ value, label }) => {
                  const isSelected = selectedValue === value;
                  const isJustSelected = justSelected === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSelect(value)}
                      disabled={saving}
                      className={`
                        flex-1 min-h-[4rem] rounded-lg border text-sm font-medium
                        transition-all duration-150
                        flex items-center justify-center gap-2 px-4 py-3
                        ${isJustSelected
                          ? "border-primary bg-primary text-primary-foreground scale-[1.03]"
                          : isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }
                      `}
                    >
                      <span className="text-base font-semibold">{value}</span>
                      <span className="text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Back button */}
              {currentIndex > 0 && (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    disabled={saving}
                    className="text-muted-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
