"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
}

const SIGNALS: Signal[] = [
  { id: "deal-inquiry", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a global campaign. Terms match your pre-approved rules.", badge: "Review", accentColor: "blue", metric: "$45K", metricLabel: "Deal Value" },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest licensing deal payment has been processed and settled to your account.", badge: "Settled", accentColor: "green", metric: "$12,500", metricLabel: "Net Payment" },
  { id: "misuse", icon: "Shield", title: "Misuse Blocked", description: "An unauthorized use of your likeness was detected, flagged, and evidence sealed automatically.", badge: "Protected", accentColor: "red" },
  { id: "verified", icon: "Lock", title: "Identity Verified", description: "A Fortune 500 brand verified your certified identity before finalizing a licensing agreement.", accentColor: "purple", metric: "47", metricLabel: "Verifications" },
  { id: "twin-updated", icon: "BookOpen", title: "Twin Updated", description: "Your digital twin just got sharper. New data from your latest podcast was processed.", accentColor: "amber" },
  { id: "contract", icon: "Clock", title: "Contract Ready", description: "Your team's contract for a voice licensing deal is ready for signature.", badge: "Sign", accentColor: "blue" },
  { id: "cross-platform", icon: "Globe", title: "Cross-Platform Ready", description: "Your identity is governed by your rules across every integration — voice, video, and text.", badge: "Live", accentColor: "green" },
  { id: "profile", icon: "Fingerprint", title: "Identity Certified", description: "Your digital identity has been certified with blockchain-anchored proof of ownership.", accentColor: "purple", metric: "97%", metricLabel: "Accuracy" },
  { id: "marketplace", icon: "BarChart3", title: "Brand Interest", description: "New brands in your vertical are exploring identity licensing through the AIV marketplace.", accentColor: "blue", metric: "8", metricLabel: "Inquiries" },
];

const ACCENT_COLORS = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

// Predefined positions around the edges — scattered, never center, never overlapping
const POSITIONS = [
  { top: "15%", left: "3%" },   // top-left
  { top: "38%", left: "2%" },   // mid-left
  { top: "65%", left: "4%" },   // bottom-left
  { top: "12%", right: "3%" },  // top-right
  { top: "42%", right: "2%" },  // mid-right
  { top: "68%", right: "4%" },  // bottom-right
  { top: "85%", left: "15%" },  // bottom-left-center
  { top: "8%", right: "18%" },  // top-right-center
  { top: "82%", right: "12%" }, // bottom-right-center
];

function SignalPill({
  signal,
  onHoverStart,
  onHoverEnd,
}: {
  signal: Signal;
  onHoverStart?: (signal: Signal) => void;
  onHoverEnd?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];

  return (
    <motion.div
      onMouseEnter={() => { setHovered(true); onHoverStart?.(signal); }}
      onMouseLeave={() => { setHovered(false); onHoverEnd?.(); }}
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
              <div className="mt-2 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${colors.dot}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${55 + Math.floor(Math.random() * 35)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
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

export function SignalNotifications({
  onSignalHover,
  onSignalLeave,
}: {
  onSignalHover?: (signal: { title: string; description: string; metric?: string; metricLabel?: string }) => void;
  onSignalLeave?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);

  // Pick 3 random positions from the 9 available
  const activePositions = useMemo(() => {
    const shuffled = [...Array(POSITIONS.length).keys()].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const cycleSignals = useCallback(() => {
    const indices: number[] = [];
    const used = new Set<number>();
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * SIGNALS.length);
      if (!used.has(idx)) { used.add(idx); indices.push(idx); }
    }
    setVisibleIndices(indices);
  }, []);

  useEffect(() => {
    const initTimer = setTimeout(cycleSignals, 2000);
    const interval = setInterval(cycleSignals, 7000);
    return () => { clearTimeout(initTimer); clearInterval(interval); };
  }, [cycleSignals]);

  if (reducedMotion) {
    return (
      <div className="hidden lg:block">
        {SIGNALS.slice(0, 3).map((signal, i) => {
          const pos = POSITIONS[i];
          return (
            <div key={signal.id} className="fixed z-10" style={pos}>
              <SignalPill signal={signal} onHoverStart={onSignalHover} onHoverEnd={onSignalLeave} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="hidden lg:block">
      <AnimatePresence mode="popLayout">
        {visibleIndices.map((sigIdx, posSlot) => {
          const signal = SIGNALS[sigIdx];
          if (!signal) return null;
          const posIdx = activePositions[posSlot] ?? posSlot;
          const pos = POSITIONS[posIdx] ?? POSITIONS[0];
          return (
            <motion.div
              key={signal.id}
              className="fixed z-10"
              style={pos}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
            >
              <SignalPill signal={signal} onHoverStart={onSignalHover} onHoverEnd={onSignalLeave} />
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
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SIGNALS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lg:hidden flex justify-center px-6 pb-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="max-w-[280px] w-full"
        >
          <SignalPill signal={SIGNALS[currentIndex]} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
