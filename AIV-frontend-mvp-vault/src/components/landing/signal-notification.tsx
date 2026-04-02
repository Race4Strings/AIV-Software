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

// Left and right positions — capped at 65% top so expansion stays in bounds
const LEFT_SPOTS = [
  { top: "18%", left: "2%" },
  { top: "38%", left: "3%" },
  { top: "58%", left: "2%" },
];
const RIGHT_SPOTS = [
  { top: "22%", right: "2%" },
  { top: "42%", right: "3%" },
  { top: "62%", right: "2%" },
];

function jitter(pos: { top: string; left?: string; right?: string }) {
  const jY = Math.floor(Math.random() * 8) - 4;
  const result: Record<string, string> = { top: `${parseInt(pos.top) + jY}%` };
  if (pos.left) result.left = pos.left;
  if (pos.right) result.right = pos.right;
  return result;
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
              <p className="text-[10px] text-white/40 leading-relaxed">{signal.description}</p>
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
  const [currentIdx, setCurrentIdx] = useState(0); // sequential index into SIGNALS
  const [leftSignal, setLeftSignal] = useState<{ idx: number; pos: Record<string, string> } | null>(null);
  const [rightSignal, setRightSignal] = useState<{ idx: number; pos: Record<string, string> } | null>(null);
  const pausedRef = useRef(false);

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    setCurrentIdx(prev => {
      const next = (prev + 1) % SIGNALS.length;
      // Alternate: even indices go left, odd go right
      if (next % 2 === 0) {
        setLeftSignal({ idx: next, pos: jitter(LEFT_SPOTS[Math.floor(Math.random() * LEFT_SPOTS.length)]) });
      } else {
        setRightSignal({ idx: next, pos: jitter(RIGHT_SPOTS[Math.floor(Math.random() * RIGHT_SPOTS.length)]) });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    // Stagger initial appearance
    const t1 = setTimeout(() => {
      setLeftSignal({ idx: 0, pos: jitter(LEFT_SPOTS[1]) });
    }, 1500);
    const t2 = setTimeout(() => {
      setRightSignal({ idx: 1, pos: jitter(RIGHT_SPOTS[0]) });
      setCurrentIdx(1);
    }, 3000);

    // Rotate every 3.5-5s
    const interval = setInterval(() => {
      if (!pausedRef.current) advance();
    }, 3500 + Math.random() * 1500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(interval); };
  }, [advance]);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
        <div className="absolute pointer-events-auto" style={LEFT_SPOTS[1]}>
          <SignalPill signal={SIGNALS[0]} />
        </div>
        <div className="absolute pointer-events-auto" style={RIGHT_SPOTS[0]}>
          <SignalPill signal={SIGNALS[1]} />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      <AnimatePresence>
        {leftSignal && (
          <motion.div key={`left-${leftSignal.idx}`} className="absolute pointer-events-auto" style={leftSignal.pos}
            initial={{ opacity: 0, scale: 0.85, x: -16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -16 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}>
            <SignalPill signal={SIGNALS[leftSignal.idx]} onHover={handleHover} onLeave={handleLeave} />
          </motion.div>
        )}
        {rightSignal && (
          <motion.div key={`right-${rightSignal.idx}`} className="absolute pointer-events-auto" style={rightSignal.pos}
            initial={{ opacity: 0, scale: 0.85, x: 16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}>
            <SignalPill signal={SIGNALS[rightSignal.idx]} onHover={handleHover} onLeave={handleLeave} />
          </motion.div>
        )}
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
