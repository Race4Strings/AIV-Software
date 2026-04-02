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

const SIGNALS: Signal[] = [
  { id: "deal-inquiry", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a global campaign. Terms match your pre-approved rules.", badge: "Review", accentColor: "blue", metric: "$45K", metricLabel: "Deal Value", metricPercent: 72 },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest licensing deal payment has been processed and settled to your account.", badge: "Settled", accentColor: "green", metric: "$12,500", metricLabel: "Net Payment", metricPercent: 85 },
  { id: "misuse", icon: "Shield", title: "Misuse Blocked", description: "An unauthorized use of your likeness was detected, flagged, and evidence sealed automatically.", badge: "Protected", accentColor: "red", metricPercent: 100 },
  { id: "verified", icon: "Lock", title: "Identity Verified", description: "A Fortune 500 brand verified your certified identity before finalizing a licensing agreement.", accentColor: "purple", metric: "47", metricLabel: "Verifications", metricPercent: 82 },
  { id: "twin-updated", icon: "BookOpen", title: "Twin Updated", description: "Your digital twin just got sharper. New data from your latest podcast was processed.", accentColor: "amber", metric: "97%", metricLabel: "Accuracy", metricPercent: 97 },
  { id: "contract", icon: "Clock", title: "Contract Ready", description: "Your team's contract for a voice licensing deal is ready for signature.", badge: "Sign", accentColor: "blue", metricPercent: 60 },
  { id: "cross-platform", icon: "Globe", title: "Cross-Platform Ready", description: "Your identity is governed by your rules across every integration — voice, video, and text.", badge: "Live", accentColor: "green", metricPercent: 90 },
  { id: "profile", icon: "Fingerprint", title: "Identity Certified", description: "Your digital identity has been certified with blockchain-anchored proof of ownership.", accentColor: "purple", metric: "Certified", metricLabel: "Status", metricPercent: 100 },
  { id: "marketplace", icon: "BarChart3", title: "Brand Interest", description: "New brands in your vertical are exploring identity licensing through the AIV marketplace.", accentColor: "blue", metric: "8", metricLabel: "Inquiries", metricPercent: 65 },
];

const ACCENT_COLORS = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

// 6 positions: 2 left, 2 right, 1 top-corner, 1 bottom-corner
// Each has a jitter range so they don't sit in perfect alignment
function getJitteredPosition(base: { top: string; left?: string; right?: string }) {
  const jitterY = Math.floor(Math.random() * 6) - 3; // ±3%
  const jitterX = Math.floor(Math.random() * 2); // 0-1%
  const topNum = parseInt(base.top) + jitterY;
  const result: Record<string, string> = { top: `${topNum}%` };
  if (base.left) result.left = `${parseInt(base.left) + jitterX}%`;
  if (base.right) result.right = `${parseInt(base.right) + jitterX}%`;
  return result;
}

const BASE_POSITIONS = [
  { top: "18%", left: "2%" },
  { top: "55%", left: "3%" },
  { top: "82%", left: "2%" },
  { top: "20%", right: "2%" },
  { top: "52%", right: "3%" },
  { top: "78%", right: "2%" },
];

function SignalPill({
  signal,
  onHoverSignal,
  onLeaveSignal,
}: {
  signal: Signal;
  onHoverSignal?: () => void;
  onLeaveSignal?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];
  const barWidth = useMotionValue(0);
  const springWidth = useSpring(barWidth, { damping: 20, stiffness: 100 });
  const barWidthStr = useTransform(springWidth, (v) => `${v}%`);

  useEffect(() => {
    if (hovered) {
      // Animate to target with slight overshoot feel via spring
      barWidth.set(signal.metricPercent ?? 70);
    } else {
      barWidth.set(0);
    }
  }, [hovered, barWidth, signal.metricPercent]);

  return (
    <motion.div
      onMouseEnter={() => { setHovered(true); onHoverSignal?.(); }}
      onMouseLeave={() => { setHovered(false); onLeaveSignal?.(); }}
      layout
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden"
      style={{ minWidth: hovered ? 260 : 180, maxWidth: 280 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-3 w-3 ${colors.text}`} />
        </div>
        <span className="text-[11px] font-medium text-white/70 truncate">{signal.title}</span>
        {signal.badge && !hovered && (
          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>
            {signal.badge}
          </span>
        )}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0.5">
              <p className="text-[10px] text-white/40 leading-relaxed">{signal.description}</p>
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
                <span className={`mt-2 inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {signal.badge}
                </span>
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
  type SlotType = { signalIdx: number; pos: Record<string, string> };
  const [slots, setSlots] = useState<SlotType[]>([]);
  const usedSignalsRef = useRef(new Set<number>());
  const usedPosRef = useRef(new Set<number>());
  const pausedRef = useRef(false);

  const addSignal = useCallback(() => {
    if (pausedRef.current) return;
    setSlots(prev => {
      if (prev.length >= 3) return prev;

      // Pick signal not in use
      let sigIdx: number;
      let attempts = 0;
      do { sigIdx = Math.floor(Math.random() * SIGNALS.length); attempts++; }
      while (usedSignalsRef.current.has(sigIdx) && attempts < 20);
      usedSignalsRef.current.add(sigIdx);

      // Count left vs right in current slots
      const leftCount = prev.filter(s => "left" in s.pos).length;
      const rightCount = prev.filter(s => "right" in s.pos).length;

      // Pick position: avoid 3 on same side, prefer unused base positions
      const available = BASE_POSITIONS.map((p, i) => ({ p, i })).filter(x => {
        if (usedPosRef.current.has(x.i)) return false;
        const isLeft = "left" in x.p;
        if (isLeft && leftCount >= 2) return false;
        if (!isLeft && rightCount >= 2) return false;
        return true;
      });

      const pick = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : { p: BASE_POSITIONS[Math.floor(Math.random() * BASE_POSITIONS.length)], i: 0 };

      usedPosRef.current.add(pick.i);
      const jitteredPos = getJitteredPosition(pick.p);

      return [...prev, { signalIdx: sigIdx, pos: jitteredPos }];
    });
  }, []);

  const removeOldest = useCallback(() => {
    if (pausedRef.current) return;
    setSlots(prev => {
      if (prev.length === 0) return prev;
      const removed = prev[0];
      usedSignalsRef.current.delete(removed.signalIdx);
      // Find which base position this was closest to and free it
      const posTop = parseInt(removed.pos.top || "0");
      let closestIdx = 0;
      let closestDist = 999;
      BASE_POSITIONS.forEach((bp, i) => {
        const dist = Math.abs(parseInt(bp.top) - posTop);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      usedPosRef.current.delete(closestIdx);
      return prev.slice(1);
    });
  }, []);

  useEffect(() => {
    const t1 = setTimeout(addSignal, 1500);
    const t2 = setTimeout(addSignal, 3500);
    const t3 = setTimeout(addSignal, 5500);

    const interval = setInterval(() => {
      if (!pausedRef.current) {
        removeOldest();
        setTimeout(() => { if (!pausedRef.current) addSignal(); }, 800);
      }
    }, 6000 + Math.random() * 2000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(interval); };
  }, [addSignal, removeOldest]);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
        {SIGNALS.slice(0, 3).map((signal, i) => (
          <div key={signal.id} className="absolute pointer-events-auto"
            style={getJitteredPosition(BASE_POSITIONS[i * 2])}>
            <SignalPill signal={signal} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      <AnimatePresence>
        {slots.map((slot) => {
          const signal = SIGNALS[slot.signalIdx];
          if (!signal) return null;
          return (
            <motion.div
              key={signal.id}
              className="absolute pointer-events-auto"
              style={slot.pos}
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -8 }}
              transition={{ type: "spring", damping: 22, stiffness: 200 }}
            >
              <SignalPill signal={signal} onHoverSignal={handleHover} onLeaveSignal={handleLeave} />
            </motion.div>
          );
        })}
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
