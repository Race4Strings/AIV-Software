"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  FileText, Globe, Shield, Lock, DollarSign,
  BookOpen, Clock, BarChart3, Fingerprint,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ICONS = { FileText, Globe, Shield, Lock, DollarSign, BookOpen, Clock, BarChart3, Fingerprint };

interface Signal {
  id: string;
  icon: keyof typeof ICONS;
  title: string;
  description: string;
  badge?: string;
  accentColor: "blue" | "green" | "red" | "amber" | "purple";
  metric?: string;
  metricLabel?: string;
  metricPercent?: number;
}

const SIGNALS: Signal[] = [
  { id: "deal-inquiry", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a global campaign. Terms match your pre-approved rules.", badge: "Review", accentColor: "blue", metric: "$250K", metricLabel: "Deal Value", metricPercent: 95 },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest licensing deal payment has been processed and settled to your account.", badge: "Settled", accentColor: "green", metric: "$87,500", metricLabel: "Net Payment", metricPercent: 92 },
  { id: "misuse", icon: "Shield", title: "Misuse Blocked", description: "An unauthorized use of your likeness was detected, flagged, and evidence sealed automatically.", badge: "Protected", accentColor: "red", metric: "3", metricLabel: "Blocked This Week", metricPercent: 95 },
  { id: "verified", icon: "Lock", title: "Identity Verified", description: "A Fortune 500 brand verified your certified identity before finalizing a licensing agreement.", accentColor: "purple", metric: "47", metricLabel: "Verifications", metricPercent: 90 },
  { id: "twin-updated", icon: "BookOpen", title: "Twin Updated", description: "Your digital twin just got sharper. New data from your latest podcast was processed.", accentColor: "amber", metric: "97%", metricLabel: "Accuracy", metricPercent: 97 },
  { id: "contract", icon: "Clock", title: "Contract Ready", description: "Your team's contract for a voice licensing deal is ready for signature.", badge: "Sign", accentColor: "blue", metric: "Step 5/5", metricLabel: "Progress", metricPercent: 100 },
  { id: "cross-platform", icon: "Globe", title: "Cross-Platform Ready", description: "Your identity is governed by your rules across every integration — voice, video, and text.", badge: "Live", accentColor: "green", metric: "6", metricLabel: "Platforms", metricPercent: 95 },
  { id: "profile", icon: "Fingerprint", title: "Identity Certified", description: "Your digital identity has been certified with blockchain-anchored proof of ownership.", accentColor: "purple", metric: "Sealed", metricLabel: "Blockchain", metricPercent: 100 },
  { id: "marketplace", icon: "BarChart3", title: "Brand Interest", description: "New brands in your vertical are exploring identity licensing through the AIV marketplace.", accentColor: "blue", metric: "14", metricLabel: "Inquiries This Month", metricPercent: 92 },
];

const ACCENT_COLORS = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Positioning
type NumPos = { top: number; left?: number; right?: number };

function randomNumPos(): NumPos {
  const top = 10 + Math.random() * 75;
  const side = Math.random() > 0.5 ? "left" : "right";
  const h = 4 + Math.random() * 14; // 4-18% from edge — keeps signals away from center hero
  return side === "left" ? { top, left: h } : { top, right: h };
}

function inCenterZone(p: NumPos): boolean {
  return p.top >= 25 && p.top <= 65;
}

function dist2D(a: NumPos, b: NumPos): number {
  const dy = Math.abs(a.top - b.top);
  const aX = a.left ?? (100 - (a.right ?? 0));
  const bX = b.left ?? (100 - (b.right ?? 0));
  return Math.sqrt((aX - bX) ** 2 + dy ** 2);
}

function findSafe(existing: NumPos[]): NumPos | null {
  for (let i = 0; i < 80; i++) {
    const c = randomNumPos();
    if (inCenterZone(c)) continue;
    if (existing.some(e => dist2D(c, e) < 20)) continue;
    return c;
  }
  return null;
}

function toStyle(p: NumPos): Record<string, string> {
  const s: Record<string, string> = { top: `${p.top.toFixed(1)}%` };
  if (p.left !== undefined) s.left = `${p.left.toFixed(1)}%`;
  if (p.right !== undefined) s.right = `${p.right.toFixed(1)}%`;
  return s;
}

const STATIC_POSITIONS = [
  { top: "13%", left: "5%" },
  { top: "15%", right: "7%" },
  { top: "74%", left: "8%" },
];

function getDynamic(signal: Signal, progress: number): string {
  if (!signal.metric) return "";
  const base = signal.metric;
  if (base.startsWith("$")) {
    const num = parseFloat(base.replace(/[$,K]/g, "")) * (base.includes("K") ? 1000 : 1);
    const scaled = Math.round(num * (0.35 + progress * 0.65));
    if (scaled >= 1000) return `$${(scaled / 1000).toFixed(scaled >= 10000 ? 0 : 1)}K`;
    return `$${scaled.toLocaleString()}`;
  }
  if (base.includes("%")) {
    const num = parseInt(base);
    const floor = signal.id === "misuse" ? 70 : 50;
    return `${Math.round(floor + (num - floor) * progress)}%`;
  }
  if (base.startsWith("Step")) return `Step ${Math.max(1, Math.round(1 + progress * 4))}/5`;
  if (base === "Sealed") return ["Pending", "Hashing", "Anchoring", "Confirming", "Sealed"][Math.min(4, Math.round(progress * 4))];
  const num = parseInt(base);
  if (!isNaN(num)) return `${Math.max(1, Math.round(num * (0.15 + progress * 0.85)))}`;
  return base;
}

function SignalPill({ signal, onHover, onLeave }: { signal: Signal; onHover?: () => void; onLeave?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [metricDisplay, setMetricDisplay] = useState(signal.metric || "");
  const pillRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];
  const barWidth = useMotionValue(0);
  const springWidth = useSpring(barWidth, { damping: 28, stiffness: 220 });
  const barWidthStr = useTransform(springWidth, (v) => `${v}%`);

  function handleMove(e: React.MouseEvent) {
    if (!pillRef.current || !hovered) return;
    const rect = pillRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    progressRef.current = p;
    barWidth.set(p * (signal.metricPercent ?? 70));
    const next = getDynamic(signal, p);
    if (next !== metricDisplay) setMetricDisplay(next);
  }

  useEffect(() => {
    if (hovered) {
      barWidth.set(signal.metricPercent ?? 70);
      setMetricDisplay(signal.metric || "");
    } else {
      barWidth.set(0);
      progressRef.current = 0;
      setMetricDisplay(signal.metric || "");
    }
  }, [hovered, barWidth, signal.metricPercent, signal.metric]);

  return (
    <div ref={pillRef}
      onMouseEnter={() => { setHovered(true); onHover?.(); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
      onMouseMove={handleMove}
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden transition-[min-width] duration-300 ease-out"
      style={{ minWidth: hovered ? 260 : 180, maxWidth: 280 }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-3 w-3 ${colors.text}`} />
        </div>
        <span className="text-[11px] font-medium text-white/70 truncate">{signal.title}</span>
        {signal.badge && !hovered && (
          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
        )}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: "spring", damping: 25, stiffness: 300,
              opacity: { duration: 0.25, ease: "easeIn" },
            }}
            className="overflow-hidden">
            <div className="px-3 pb-3 pt-0.5">
              <p className="text-[11px] text-white/50 leading-relaxed">{signal.description}</p>
              {signal.metric && (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white font-mono tabular-nums">{metricDisplay}</span>
                  {signal.metricLabel && <span className="text-[9px] text-white/40 uppercase tracking-wider">{signal.metricLabel}</span>}
                </div>
              )}
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div className={`h-full rounded-full ${colors.dot}`} style={{ width: barWidthStr }} />
              </div>
              {signal.badge && (
                <span className={`mt-2 inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>{signal.badge}</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ROTATION_MS = 3500;

export function SignalNotifications() {
  const reducedMotion = useReducedMotion();
  type Slot = { id: string; signalIdx: number; pos: Record<string, string>; numPos: NumPos; side: "left" | "right" };
  const [slots, setSlots] = useState<Slot[]>([]);
  const pausedRef = useRef(false);
  const signalCounterRef = useRef(0);
  const stepRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shuffle signal order on mount so returning visitors see different sequences
  const shuffledOrder = useMemo(() => shuffle(SIGNALS.map((_, i) => i)), []);

  const nextSignalIdx = useCallback(() => {
    const idx = shuffledOrder[signalCounterRef.current % shuffledOrder.length];
    signalCounterRef.current++;
    return idx;
  }, [shuffledOrder]);

  const addSignal = useCallback(() => {
    setSlots(prev => {
      if (prev.length >= 3) return prev;
      const existing = prev.map(s => s.numPos);
      const numPos = findSafe(existing);
      if (!numPos) return prev;
      const sigIdx = nextSignalIdx();
      const step = stepRef.current++;
      const side: "left" | "right" = numPos.left !== undefined ? "left" : "right";
      return [...prev, { id: `s-${step}-${sigIdx}`, signalIdx: sigIdx, pos: toStyle(numPos), numPos, side }];
    });
  }, [nextSignalIdx]);

  const rotateOldest = useCallback(() => {
    if (pausedRef.current) return;
    setSlots(prev => {
      if (prev.length === 0) return prev;
      const remaining = prev.slice(1);
      const existing = remaining.map(s => s.numPos);
      const numPos = findSafe(existing);
      if (!numPos) return remaining;
      const sigIdx = nextSignalIdx();
      const step = stepRef.current++;
      const side: "left" | "right" = numPos.left !== undefined ? "left" : "right";
      return [...remaining, { id: `s-${step}-${sigIdx}`, signalIdx: sigIdx, pos: toStyle(numPos), numPos, side }];
    });
  }, [nextSignalIdx]);

  // Start the rotation interval (used after stagger and after hover grace period)
  const startRotation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) rotateOldest();
    }, ROTATION_MS);
  }, [rotateOldest]);

  useEffect(() => {
    // Staggered entry with slight variance
    const t1 = setTimeout(addSignal, 1800);
    const t2 = setTimeout(addSignal, 3600);
    const t3 = setTimeout(addSignal, 6000);
    // Start rotation AFTER all 3 signals have appeared (no race condition)
    const t4 = setTimeout(startRotation, 7200);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [addSignal, startRotation]);

  const handleHover = useCallback(() => {
    pausedRef.current = true;
  }, []);

  // Grace period: restart interval fresh on leave, guaranteeing a full cycle before next swap
  const handleLeave = useCallback(() => {
    pausedRef.current = false;
    startRotation();
  }, [startRotation]);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none" aria-hidden="true">
        {STATIC_POSITIONS.map((pos, g) => (
          <div key={g} className="absolute pointer-events-auto" style={pos}>
            <SignalPill signal={SIGNALS[g]} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none" aria-hidden="true">
      <AnimatePresence>
        {slots.map((slot) => (
          <motion.div key={slot.id} className="absolute pointer-events-auto" style={slot.pos}
            initial={{ opacity: 0, scale: 0.82, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -10, filter: "blur(2px)" }}
            transition={{ type: "spring", damping: 20, stiffness: 260, mass: 0.6 }}>
            <SignalPill signal={SIGNALS[slot.signalIdx]} onHover={handleHover} onLeave={handleLeave} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function MobileSignalNotifications() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % SIGNALS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lg:hidden flex justify-center px-6 pb-6">
      <AnimatePresence mode="wait">
        <motion.div key={currentIndex}
          initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="max-w-[280px] w-full">
          <SignalPill signal={SIGNALS[currentIndex]} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
