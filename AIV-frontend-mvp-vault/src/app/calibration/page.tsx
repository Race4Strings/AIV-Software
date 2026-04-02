"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Brain } from "lucide-react";
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
  { value: 1, label: "Strongly Disagree", abbrev: "SD" },
  { value: 2, label: "Disagree", abbrev: "D" },
  { value: 3, label: "Neutral", abbrev: "N" },
  { value: 4, label: "Agree", abbrev: "A" },
  { value: 5, label: "Strongly Agree", abbrev: "SA" },
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

  // Group items into pages of ~10 (by domain order: 12 items per domain → show 2 pages per domain, 6 items each — or 10 items per page across domains)
  // Simple approach: chunk items into pages of 10
  const ITEMS_PER_PAGE = 10;
  const pages = items.reduce<CalibrationItem[][]>((acc, item, i) => {
    const pageIdx = Math.floor(i / ITEMS_PER_PAGE);
    if (!acc[pageIdx]) acc[pageIdx] = [];
    acc[pageIdx].push(item);
    return acc;
  }, []);
  const totalPages = pages.length;

  // Track per-item responses as a map for the current page
  const [pageResponses, setPageResponses] = useState<Record<number, number>>({});
  // Persistent store: pageIndex → { itemNumber → value } — survives navigation
  const [allResponses, setAllResponses] = useState<Record<number, Record<number, number>>>({});

  // Keyboard shortcuts: press 1-5 to answer the next unanswered item
  useEffect(() => {
    if (phase !== "tuning") return;
    const currentPage = pages[currentIndex];
    if (!currentPage) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num < 1 || num > 5) return;
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Find the first unanswered item on the current page
      const nextUnanswered = currentPage.find((item) => pageResponses[item.item] === undefined);
      if (nextUnanswered) {
        setPageResponses((prev) => ({ ...prev, [nextUnanswered.item]: num }));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [phase, pages, currentIndex, pageResponses]);

  // Handle setting an answer for one item on the current page
  const setItemResponse = useCallback((itemNum: number, value: number) => {
    setPageResponses((prev) => ({ ...prev, [itemNum]: value }));
  }, []);

  // Handle submitting the current page (save + advance)
  const handlePageSubmit = useCallback(async () => {
    if (!calId || !twinId) return;
    const currentPage = pages[currentIndex];
    if (!currentPage) return;

    // Check all items on page are answered
    const unanswered = currentPage.filter((item) => pageResponses[item.item] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Please answer all ${currentPage.length} statements before continuing.`);
      return;
    }

    setSaving(true);
    // Build complete response list from allResponses (all pages) + current page
    const merged = { ...allResponses, [currentIndex]: { ...pageResponses } };
    const newResponses: { item: number; value: number }[] = [];
    for (let p = 0; p <= currentIndex; p++) {
      const pageData = merged[p];
      if (pageData) {
        for (const [itemNum, value] of Object.entries(pageData)) {
          newResponses.push({ item: Number(itemNum), value });
        }
      }
    }
    setResponses(newResponses);
    await saveResponses(twinId, calId, newResponses);
    setSaving(false);

    // Persist current page answers before navigating
    setAllResponses((prev) => ({ ...prev, [currentIndex]: { ...pageResponses } }));

    if (currentIndex + 1 >= totalPages) {
      // All pages done — trigger scoring
      setPhase("completing");
      const result = await completeCalibration(twinId, calId);
      if (result) {
        setPhase("done");
      } else {
        toast.error("Scoring failed. Your responses are saved — try again later.");
        router.push("/dashboard");
      }
    } else {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Restore next page's answers if they exist (user went forward, back, forward)
      setAllResponses((prev) => {
        setPageResponses(prev[nextIndex] ? { ...prev[nextIndex] } : {});
        return prev;
      });
    }
  }, [calId, twinId, pages, currentIndex, totalPages, pageResponses, allResponses, responses, router]);

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
            60 quick statements across 6 pages. Takes about 5 minutes.
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

  // ── TUNING SESSION (10 items per page) ──
  const currentPage = pages[currentIndex] || [];
  const answeredOnPage = currentPage.filter((item) => pageResponses[item.item] !== undefined).length;
  // Per-item progress: all items from completed pages + answered items on current page
  const completedItemsFromPrevPages = currentIndex * ITEMS_PER_PAGE;
  const totalItems = items.length || 1;
  const progress = ((completedItemsFromPrevPages + answeredOnPage) / totalItems) * 100;
  const currentDomain = currentPage[0]?.domain_label || "";

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
          Page {currentIndex + 1} of {totalPages} &middot; {answeredOnPage}/{currentPage.length} answered
        </div>
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          I&apos;ll do this later &rarr;
        </button>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="w-full max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Domain header */}
              {currentDomain && (
                <div className="text-center mb-6">
                  <p className="text-xs text-primary font-medium uppercase tracking-widest">{currentDomain}</p>
                </div>
              )}

              {/* Scale legend */}
              <div className="flex justify-between mb-4 text-[10px] text-muted-foreground">
                {SCALE_LABELS.map(({ value, label, abbrev }) => (
                  <span key={value} className="text-center flex-1">{value} = {label}</span>
                ))}
              </div>

              {/* Items list */}
              <div className="space-y-3">
                {currentPage.map((item) => {
                  const selected = pageResponses[item.item];
                  return (
                    <div
                      key={item.item}
                      className={`rounded-lg border p-4 transition-colors ${
                        selected !== undefined ? "border-primary/20 bg-primary/[0.02]" : "border-border"
                      }`}
                    >
                      <p className="text-sm mb-3">
                        <span className="text-muted-foreground">I am someone who </span>
                        <span className="font-medium">{item.text.toLowerCase()}</span>
                      </p>
                      <div className="flex gap-2">
                        {SCALE_LABELS.map(({ value, label, abbrev }) => (
                          <button
                            key={value}
                            onClick={() => setItemResponse(item.item, value)}
                            className={`
                              flex-1 min-h-[2.75rem] rounded-lg border text-sm font-medium transition-all duration-150
                              flex flex-col items-center justify-center gap-0.5 py-1
                              ${selected === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              }
                            `}
                            title={label}
                          >
                            <span>{value}</span>
                            <span className="text-[9px] leading-none font-normal">{abbrev}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="mt-6 flex gap-3">
                {currentIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Save current page answers before going back
                      setAllResponses((prev) => {
                        const updated = { ...prev, [currentIndex]: { ...pageResponses } };
                        const prevIndex = currentIndex - 1;
                        // Restore previous page's answers
                        setPageResponses(updated[prevIndex] ? { ...updated[prevIndex] } : {});
                        return updated;
                      });
                      setCurrentIndex((i) => i - 1);
                    }}
                    disabled={saving}
                    className="py-5 text-base px-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={handlePageSubmit}
                  disabled={saving || answeredOnPage < currentPage.length}
                  className="flex-1 py-5 text-base"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {currentIndex + 1 >= totalPages ? "Complete Precision Tuning" : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              {answeredOnPage < currentPage.length && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Answer all {currentPage.length} statements to continue
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
