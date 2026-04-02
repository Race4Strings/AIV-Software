"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  FileText, Globe, Shield, Lock, DollarSign,
  BookOpen, Clock, BarChart3, Fingerprint, Users,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ICONS = { FileText, Globe, Shield, Lock, DollarSign, BookOpen, Clock, BarChart3, Fingerprint, Users };

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

// Fixed sequential order — always rotates through these in order
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

// 4 CORNER zones — far from center content, far from each other.
// Hero content occupies ~25-75% width and ~20-65% height.
// Signals live OUTSIDE this zone in the four corners.
//
// Layout (viewport):
//   [Slot 0]                    [Slot 1]
//        ┌──── HERO CONTENT ────┐
//        │   Badge              │
//        │   Headline           │
//        │   Description        │
//        │   CTA                │
//        └──────────────────────┘
//   [Slot 2]                    [Slot 3]
//
const SLOT_POSITIONS: Record<string, string>[][] = [
  // Slot 0: TOP-LEFT corner (6-12% top, 2-8% left)
  [
    { top: "6%", left: "2%" },
    { top: "8%", left: "5%" },
    { top: "10%", left: "3%" },
    { top: "7%", left: "7%" },
    { top: "12%", left: "2%" },
  ],
  // Slot 1: TOP-RIGHT corner (6-12% top, 2-8% right)
  [
    { top: "7%", right: "2%" },
    { top: "9%", right: "6%" },
    { top: "6%", right: "4%" },
    { top: "11%", right: "3%" },
    { top: "8%", right: "7%" },
  ],
  // Slot 2: BOTTOM-LEFT corner (72-82% top, 2-8% left)
  [
    { top: "72%", left: "2%" },
    { top: "75%", left: "6%" },
    { top: "78%", left: "3%" },
    { top: "74%", left: "7%" },
    { top: "80%", left: "2%" },
  ],
  // Slot 3: BOTTOM-RIGHT corner (72-82% top, 2-8% right)
  [
    { top: "73%", right: "3%" },
    { top: "76%", right: "6%" },
    { top: "79%", right: "2%" },
    { top: "75%", right: "7%" },
    { top: "82%", right: "4%" },
  ],
];

function pickFromSlot(slotIndex: number): Record<string, string> {
  const variants = SLOT_POSITIONS[slotIndex];
  return variants[Math.floor(Math.random() * variants.length)];
}

function SignalPill({ signal, onHover, onLeave }: { signal: Signal; onHover?: () => void; onLeave?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [mouseProgress, setMouseProgress] = useState(0);
  const pillRef = useRef<HTMLDivElement>(null);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];
  const barWidth = useMotionValue(0);
  const springWidth = useSpring(barWidth, { damping: 20, stiffness: 100 });
  const barWidthStr = useTransform(springWidth, (v) => `${v}%`);

  function handleMove(e: React.MouseEvent) {
    if (!pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setMouseProgress(p);
    barWidth.set(p * (signal.metricPercent ?? 70));
  }

  useEffect(() => {
    if (hovered) barWidth.set(signal.metricPercent ?? 70);
    else { barWidth.set(0); setMouseProgress(0); }
  }, [hovered, barWidth, signal.metricPercent]);

  function getDynamic(): string {
    if (!signal.metric || !hovered) return signal.metric || "";
    const base = signal.metric;
    if (base.startsWith("$")) {
      const num = parseFloat(base.replace(/[$,K]/g, "")) * (base.includes("K") ? 1000 : 1);
      const scaled = Math.round(num * (0.35 + mouseProgress * 0.65));
      if (scaled >= 1000) return `$${(scaled / 1000).toFixed(scaled >= 10000 ? 0 : 1)}K`;
      return `$${scaled.toLocaleString()}`;
    }
    if (base.includes("%")) {
      const num = parseInt(base);
      const floor = signal.id === "misuse" ? 70 : 50;
      return `${Math.round(floor + (num - floor) * mouseProgress)}%`;
    }
    if (base.startsWith("Step")) return `Step ${Math.max(1, Math.round(1 + mouseProgress * 4))}/5`;
    if (base === "Sealed") return ["Pending", "Hashing", "Anchoring", "Confirming", "Sealed"][Math.min(4, Math.round(mouseProgress * 4))];
    const num = parseInt(base);
    if (!isNaN(num)) return `${Math.max(1, Math.round(num * (0.15 + mouseProgress * 0.85)))}`;
    return base;
  }

  return (
    <motion.div ref={pillRef}
      onMouseEnter={() => { setHovered(true); onHover?.(); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
      onMouseMove={handleMove}
      layout
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden"
      style={{ minWidth: hovered ? 260 : 180, maxWidth: 280 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}>
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
            exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="overflow-hidden">
            <div className="px-3 pb-3 pt-0.5">
              <p className="text-[11px] text-white/40 leading-relaxed">{signal.description}</p>
              {signal.metric && (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white font-mono tabular-nums">{getDynamic()}</span>
                  {signal.metricLabel && <span className="text-[9px] text-white/30 uppercase tracking-wider">{signal.metricLabel}</span>}
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
    </motion.div>
  );
}

export function SignalNotifications() {
  const reducedMotion = useReducedMotion();
  type Slot = { id: string; signalIdx: number; pos: Record<string, string>; side: "left" | "right" };
  const [slots, setSlots] = useState<Slot[]>([]);
  const pausedRef = useRef(false);
  const signalCounterRef = useRef(0);
  const stepRef = useRef(0); // tracks which action to take next

  // The schedule: a simple queue of timed actions.
  // Steps 0-3: add one signal each (staggered entry)
  // Steps 4+: rotate one signal (replace oldest)
  const tick = useCallback(() => {
    if (pausedRef.current) return;

    const step = stepRef.current;
    stepRef.current++;

    if (step < 4) {
      // Staggered entry: add signal to slot [step]
      const sigIdx = signalCounterRef.current;
      signalCounterRef.current = (sigIdx + 1) % SIGNALS.length;
      const pos = pickFromSlot(step);
      setSlots(prev => [...prev, { id: `${step}-${sigIdx}`, signalIdx: sigIdx, pos, side: step % 2 === 0 ? "left" : "right" }]);
    } else {
      // Rotation: replace the oldest signal, pick new variant from its slot
      setSlots(prev => {
        if (prev.length === 0) return prev;
        const oldestIdx = 0;
        const slotIndex = prev.length > 0 ? (step - 4 + oldestIdx) % 4 : 0;
        const remaining = prev.slice(1);
        const sigIdx = signalCounterRef.current;
        signalCounterRef.current = (sigIdx + 1) % SIGNALS.length;
        const pos = pickFromSlot(slotIndex);
        const side: "left" | "right" = slotIndex % 2 === 0 ? "left" : "right";
        return [...remaining, { id: `${step}-${sigIdx}`, signalIdx: sigIdx, pos, side }];
      });
    }
  }, []);

  useEffect(() => {
    // ONE interval. First tick at 2s, then every 2s. Nothing else.
    const timer = setInterval(() => tick(), 2000);
    return () => clearInterval(timer);
  }, [tick]);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
        {[0, 1, 2, 3].map(g => (
          <div key={g} className="absolute pointer-events-auto" style={SLOT_POSITIONS[g][0]}>
            <SignalPill signal={SIGNALS[g]} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      <AnimatePresence>
        {slots.map((slot) => (
          <motion.div key={slot.id} className="absolute pointer-events-auto" style={slot.pos}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}>
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
