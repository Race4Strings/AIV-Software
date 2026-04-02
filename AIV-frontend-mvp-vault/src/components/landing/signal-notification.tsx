"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Globe, Shield, Lock, DollarSign,
  BookOpen, Clock, BarChart3, AlertTriangle, Users,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const ICONS = { FileText, Globe, Shield, Lock, DollarSign, BookOpen, Clock, BarChart3, AlertTriangle, Users };

interface Signal {
  id: string;
  icon: keyof typeof ICONS;
  title: string;
  description: string;
  badge?: string;
  accentColor: "blue" | "green" | "red" | "amber" | "purple";
}

const SIGNALS: Signal[] = [
  { id: "licensing", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a campaign. Terms match your pre-approved rules.", badge: "Review", accentColor: "blue" },
  { id: "protection", icon: "Shield", title: "Misuse Blocked", description: "An unauthorized use of your likeness was detected and flagged. Evidence sealed.", badge: "Protected", accentColor: "red" },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest licensing deal payment has been processed and settled to your account.", badge: "Settled", accentColor: "green" },
  { id: "verification", icon: "Lock", title: "Identity Verified", description: "A brand verified your certified identity before finalizing a licensing agreement.", accentColor: "purple" },
  { id: "training", icon: "BookOpen", title: "Twin Updated", description: "Your digital twin just got sharper. New data from your latest interview was processed.", accentColor: "amber" },
  { id: "approval", icon: "Clock", title: "Contract Ready", description: "Your team's contract for a voice licensing deal is ready for signature.", badge: "Sign", accentColor: "blue" },
];

const ACCENT_COLORS = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

function SignalPill({ signal }: { signal: Signal }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      layout
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden"
      style={{ minWidth: hovered ? 260 : 180 }}
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
              <div className="mt-2 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${colors.dot}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${50 + Math.random() * 40}%` }}
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

export function SignalNotifications({ side }: { side: "left" | "right" }) {
  const reducedMotion = useReducedMotion();
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sideSignals = SIGNALS.filter((_, i) => side === "left" ? i % 2 === 0 : i % 2 !== 0);

  // Generate stable scattered positions once on mount
  const scatteredPositions = useMemo(() => {
    return sideSignals.map((_, i) => ({
      top: 20 + ((i * 17 + 7) % 50), // deterministic spread between 20%-70%
      offsetX: Math.round(((i * 13 + 3) % 20)), // 0-20px horizontal jitter
    }));
  }, [sideSignals.length]);

  const cycleSignals = useCallback(() => {
    // Show exactly 3 signals at a time (or fewer if not enough available)
    const count = 3;
    const indices: number[] = [];
    while (indices.length < Math.min(count, sideSignals.length)) {
      const idx = Math.floor(Math.random() * sideSignals.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    setVisibleIndices(indices);
  }, [sideSignals.length]);

  useEffect(() => {
    // Initial show after delay
    const initTimer = setTimeout(() => {
      cycleSignals();
    }, side === "left" ? 1500 : 2500);

    // Cycle every 6-8 seconds
    const interval = setInterval(() => {
      cycleSignals();
    }, 6000 + Math.random() * 2000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cycleSignals, side]);

  if (reducedMotion) {
    // Show first 2 signals statically, scattered
    return (
      <div
        className={`hidden lg:block fixed inset-y-0 z-10 ${
          side === "left" ? "left-6" : "right-6"
        }`}
        style={{ width: 280 }}
      >
        {sideSignals.slice(0, 2).map((signal, i) => (
          <div
            key={signal.id}
            className="absolute"
            style={{
              top: `${scatteredPositions[i]?.top ?? 30}%`,
              [side === "left" ? "left" : "right"]: `${scatteredPositions[i]?.offsetX ?? 0}px`,
            }}
          >
            <SignalPill signal={signal} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`hidden lg:block fixed inset-y-0 z-10 ${
        side === "left" ? "left-6" : "right-6"
      }`}
      style={{ width: 280 }}
    >
      <AnimatePresence mode="popLayout">
        {visibleIndices.map((idx) => {
          const signal = sideSignals[idx];
          if (!signal) return null;
          const pos = scatteredPositions[idx];
          return (
            <motion.div
              key={signal.id}
              className="absolute"
              style={{
                top: `${pos?.top ?? 30}%`,
                [side === "left" ? "left" : "right"]: `${pos?.offsetX ?? 0}px`,
              }}
              initial={{ opacity: 0, scale: 0.95, x: side === "left" ? -20 : 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: side === "left" ? -20 : 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
            >
              <SignalPill signal={signal} />
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
