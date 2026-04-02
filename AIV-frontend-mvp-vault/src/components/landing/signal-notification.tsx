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

// 4 slots framing the hero content. Closer than corners, but verified safe.
//
// Hero occupies 29-71% vertical (badge to "See how it works").
// Expanded pill = ~13% of viewport height.
// Upper slots: 8-16% top → expanded reaches max 29% (clears badge).
// Lower slots: 72-80% top → starts just below hero.
// Horizontal: 2-18% from edges for organic scatter.
//
const SLOT_POSITIONS: Record<string, string>[][] = [
  // Slot 0: upper-left (12-17% top, 4-12% left — away from edges)
  [
    { top: "12%", left: "4%" },
    { top: "14%", left: "8%" },
    { top: "13%", left: "11%" },
    { top: "16%", left: "5%" },
    { top: "15%", left: "9%" },
  ],
  // Slot 1: upper-right (13-18% top, 4-12% right)
  [
    { top: "13%", right: "5%" },
    { top: "15%", right: "9%" },
    { top: "14%", right: "7%" },
    { top: "17%", right: "11%" },
    { top: "16%", right: "4%" },
  ],
  // Slot 2: lower-left (72-77% top, 4-12% left)
  [
    { top: "72%", left: "5%" },
    { top: "74%", left: "9%" },
    { top: "73%", left: "7%" },
    { top: "76%", left: "11%" },
    { top: "75%", left: "4%" },
  ],
  // Slot 3: lower-right (73-78% top, 4-12% right)
  [
    { top: "73%", right: "4%" },
    { top: "76%", right: "8%" },
    { top: "74%", right: "6%" },
    { top: "77%", right: "11%" },
    { top: "75%", right: "5%" },
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
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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


// ─── AUTO-PLAY SIGNALS (Option 3) ───
export function AutoPlaySignalNotifications() {
  const reducedMotion = useReducedMotion();
  type Slot = { id: string; signalIdx: number; pos: Record<string, string>; side: "left" | "right" };
  const [slots, setSlots] = useState<Slot[]>([]);
  const [expandedSlotIdx, setExpandedSlotIdx] = useState(-1);
  const pausedRef = useRef(false);
  const signalCounterRef = useRef(0);
  const stepRef = useRef(0);

  const tick = useCallback(() => {
    if (pausedRef.current) return;
    const step = stepRef.current;
    stepRef.current++;
    if (step < 4) {
      const sigIdx = signalCounterRef.current;
      signalCounterRef.current = (sigIdx + 1) % SIGNALS.length;
      const pos = pickFromSlot(step);
      setSlots(prev => [...prev, { id: `${step}-${sigIdx}`, signalIdx: sigIdx, pos, side: step % 2 === 0 ? "left" : "right" }]);
    } else {
      setSlots(prev => {
        if (prev.length === 0) return prev;
        const slotIndex = (step - 4) % 4;
        const remaining = prev.slice(1);
        const sigIdx = signalCounterRef.current;
        signalCounterRef.current = (sigIdx + 1) % SIGNALS.length;
        const pos = pickFromSlot(slotIndex);
        return [...remaining, { id: `${step}-${sigIdx}`, signalIdx: sigIdx, pos, side: slotIndex % 2 === 0 ? "left" : "right" }];
      });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => tick(), 2000);
    return () => clearInterval(timer);
  }, [tick]);

  // Sequential auto-expand: cycle through slots 0→1→2→3→0...
  useEffect(() => {
    let idx = 0;
    const expandCycle = setInterval(() => {
      if (pausedRef.current) return;
      setExpandedSlotIdx(idx % 4);
      // Collapse after 1.5s
      setTimeout(() => setExpandedSlotIdx(-1), 1500);
      idx++;
    }, 2500);
    return () => clearInterval(expandCycle);
  }, []);

  const handleHover = useCallback(() => { pausedRef.current = true; setExpandedSlotIdx(-1); }, []);
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
        {slots.map((slot, slotArrayIdx) => {
          const isAutoExpanded = !pausedRef.current && slotArrayIdx === expandedSlotIdx;
          return (
            <motion.div key={slot.id} className="absolute pointer-events-auto" style={slot.pos}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}>
              <AutoExpandPill
                signal={SIGNALS[slot.signalIdx]}
                autoExpanded={isAutoExpanded}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function AutoExpandPill({ signal, autoExpanded, onHover, onLeave }: {
  signal: Signal; autoExpanded: boolean; onHover?: () => void; onLeave?: () => void;
}) {
  const [manualHovered, setManualHovered] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];
  const barWidth = useMotionValue(0);
  const springWidth = useSpring(barWidth, { damping: 20, stiffness: 100 });
  const barWidthStr = useTransform(springWidth, (v) => `${v}%`);
  const isExpanded = manualHovered || autoExpanded;

  useEffect(() => {
    barWidth.set(isExpanded ? (signal.metricPercent ?? 90) : 0);
  }, [isExpanded, barWidth, signal.metricPercent]);

  return (
    <motion.div ref={pillRef}
      onMouseEnter={() => { setManualHovered(true); onHover?.(); }}
      onMouseLeave={() => { setManualHovered(false); onLeave?.(); }}
      layout
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden"
      style={{ minWidth: isExpanded ? 260 : 180, maxWidth: 280 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-3 w-3 ${colors.text}`} />
        </div>
        <span className="text-[11px] font-medium text-white/70 truncate">{signal.title}</span>
        {signal.badge && !isExpanded && (
          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
        )}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden">
            <div className="px-3 pb-3 pt-0.5">
              <p className="text-[11px] text-white/40 leading-relaxed">{signal.description}</p>
              {signal.metric && (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white font-mono tabular-nums">{signal.metric}</span>
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
