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

// Generate a random position for a given side within allowed ranges.
// Vertical: 10-75% (wide spread above and below hero).
// Horizontal: 4-14% from edge (not too close to edge, not too close to center).
function randomPosition(side: "left" | "right"): Record<string, string> {
  const top = 8 + Math.floor(Math.random() * 74); // 8-82% (expanded bottom)
  const horiz = 3 + Math.floor(Math.random() * 16); // 3-19% (closer to middle allowed)
  return side === "left" ? { top: `${top}%`, left: `${horiz}%` } : { top: `${top}%`, right: `${horiz}%` };
}

// ALL signals must have minimum 20% vertical gap from each other — no exceptions.
// This prevents any visual proximity regardless of which side they're on.
function isFarEnough(a: Record<string, string>, b: Record<string, string>): boolean {
  const aTop = parseInt(a.top || "0");
  const bTop = parseInt(b.top || "0");
  return Math.abs(aTop - bTop) >= 20;
}

// Generate a position that's far from all existing positions
function safePosition(side: "left" | "right", existing: Record<string, string>[]): Record<string, string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pos = randomPosition(side);
    if (existing.every(ex => isFarEnough(pos, ex))) return pos;
  }
  // Fallback: just return a random one
  return randomPosition(side);
}

// Zone assignments: which side each zone uses
const ZONE_SIDES: ("left" | "right")[] = ["left", "right", "left", "right"];

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
  const currentIdxRef = useRef(0);
  type Slot = { idx: number; pos: Record<string, string>; group: number };
  const [slots, setSlots] = useState<Slot[]>([]);
  const pausedRef = useRef(false);

  // Add one signal to a specific group (side)
  const addToGroup = useCallback((group: number) => {
    const next = currentIdxRef.current;
    currentIdxRef.current = (next + 1) % SIGNALS.length;
    const side = ZONE_SIDES[group] || "left";
    setSlots(prev => {
      const otherPositions = prev.filter(s => s.group !== group).map(s => s.pos);
      const pos = safePosition(side, otherPositions);
      return [...prev.filter(s => s.group !== group), { idx: next, pos, group }];
    });
  }, []);

  // Rotate: replace oldest group's signal with safe distance from remaining
  const advance = useCallback(() => {
    if (pausedRef.current) return;
    setSlots(prev => {
      if (prev.length === 0) return prev;
      const oldest = prev[0];
      const next = currentIdxRef.current;
      currentIdxRef.current = (next + 1) % SIGNALS.length;
      const side = ZONE_SIDES[oldest.group] || "left";
      const remaining = prev.slice(1);
      const pos = safePosition(side, remaining.map(s => s.pos));
      return [...remaining, { idx: next, pos, group: oldest.group }];
    });
  }, []);

  useEffect(() => {
    // Stagger: one by one so user focuses on center first
    const t1 = setTimeout(() => addToGroup(0), 1500);
    const t2 = setTimeout(() => addToGroup(1), 3000);
    const t3 = setTimeout(() => addToGroup(2), 4500);
    const t4 = setTimeout(() => addToGroup(3), 6000);

    // Rotate every 3.5-5s
    const interval = setInterval(() => {
      if (!pausedRef.current) advance();
    }, 2000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearInterval(interval); };
  }, [addToGroup, advance]);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
        {[0, 1, 2, 3].map(g => (
          <div key={g} className="absolute pointer-events-auto" style={randomPosition(ZONE_SIDES[g])}>
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
          <motion.div key={`${slot.group}-${slot.idx}`} className="absolute pointer-events-auto" style={slot.pos}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}>
            <SignalPill signal={SIGNALS[slot.idx]} onHover={handleHover} onLeave={handleLeave} />
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
