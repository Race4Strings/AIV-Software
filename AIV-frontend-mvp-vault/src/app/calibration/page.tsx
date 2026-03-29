"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  startCalibration,
  saveResponses,
  completeCalibration,
  getCalibrationStatus,
  type CalibrationItem,
  type CalibrationRecord,
} from "@/lib/api/calibration";

// ──────────────────────────────────────────────────────
// Scale labels (shown once at top)
// ──────────────────────────────────────────────────────

const SCALE_LABELS = [
  { value: 1, label: "Disagree strongly" },
  { value: 2, label: "Disagree a little" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree a little" },
  { value: 5, label: "Agree strongly" },
];

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

  // Load user + twin from localStorage, check for existing calibration
  useEffect(() => {
    async function init() {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          router.push("/auth/signin");
          return;
        }
        const user = JSON.parse(userStr);
        const tid = user.twin_id;
        if (!tid) {
          router.push("/twin");
          return;
        }
        setTwinId(tid);

        // Check for existing in-progress calibration
        const status = await getCalibrationStatus(tid);
        if (status.completed) {
          // Already done — go to dashboard
          router.push("/dashboard");
          return;
        }
        if (status.has_calibration && status.calibration_id && status.progress > 0) {
          // Resume existing session
          const result = await startCalibration(tid, "RESUME");
          if (result) {
            setItems(result.items);
            setCalId(status.calibration_id);
            setCurrentIndex(status.progress);
            // Rebuild responses from progress (we'll re-fetch on save)
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

  // Handle item answer — auto-save + auto-advance
  const handleAnswer = useCallback(
    async (value: number) => {
      if (!calId || !twinId || !items[currentIndex]) return;

      const item = items[currentIndex];
      const newResponses = [...responses, { item: item.item, value }];
      setResponses(newResponses);
      setSaving(true);

      // Auto-save
      await saveResponses(twinId, calId, newResponses);
      setSaving(false);

      // Auto-advance or complete
      if (currentIndex + 1 >= items.length) {
        // All 60 done — trigger scoring
        setPhase("completing");
        const result = await completeCalibration(twinId, calId);
        if (result) {
          setPhase("done");
        } else {
          toast.error("Scoring failed. Your responses are saved — try again later.");
          router.push("/dashboard");
        }
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [calId, twinId, items, currentIndex, responses, router]
  );

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
              articles. This 10-minute session helps it understand the{" "}
              <span className="text-foreground font-medium">real you</span> — not just
              the public you.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            60 quick statements. Tap how strongly you agree or disagree.
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
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
  const currentItem = items[currentIndex];
  const progress = ((currentIndex) / items.length) * 100;

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

      {/* Skip link */}
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          I&apos;ll do this later &rarr;
        </button>
      </div>

      {/* Item display */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="space-y-12"
            >
              {/* Statement prefix + text */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  I am someone who...
                </p>
                <p className="text-2xl font-medium leading-snug">
                  {currentItem?.text}
                </p>
              </div>

              {/* 5-point scale */}
              <div className="flex justify-center gap-3">
                {SCALE_LABELS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleAnswer(value)}
                    disabled={saving}
                    className="group flex flex-col items-center gap-2 w-20"
                  >
                    <div
                      className={`
                        w-14 h-14 rounded-xl border-2 flex items-center justify-center
                        text-lg font-semibold transition-all duration-150
                        border-border bg-background text-muted-foreground
                        hover:border-primary hover:text-primary hover:bg-primary/5
                        active:scale-95 active:bg-primary active:text-primary-foreground
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {value}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="pb-8 text-center">
        <span className="text-xs text-muted-foreground">
          {saving ? "Saving..." : `${currentIndex + 1} of ${items.length}`}
        </span>
      </div>
    </div>
  );
}
