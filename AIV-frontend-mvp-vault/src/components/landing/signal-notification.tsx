"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  { id: "licensing", icon: "FileText", title: "Licensing Activity", description: "Brand deals managed through automated pipelines with custom terms", badge: "LIVE", accentColor: "blue" },
  { id: "protection", icon: "Shield", title: "Identity Protection", description: "Continuous misuse monitoring with evidence logging and enforcement", badge: "Active", accentColor: "red" },
  { id: "verification", icon: "Lock", title: "Identity Verification", description: "Blockchain-anchored proof of ownership verified by brands and platforms", accentColor: "purple" },
  { id: "intelligence", icon: "BookOpen", title: "Profile Intelligence", description: "Behavioral modeling refined from your public presence and direct input", accentColor: "amber" },
  { id: "deployment", icon: "Globe", title: "Cross-Platform Ready", description: "Your identity governed by your rules across every integration", badge: "Ready", accentColor: "green" },
  { id: "marketplace", icon: "BarChart3", title: "Marketplace Demand", description: "Brands discovering and licensing identities through the AIV network", accentColor: "blue" },
  { id: "growth", icon: "Users", title: "Network Growth", description: "New brands joining the marketplace in your vertical", accentColor: "blue" },
  { id: "approval", icon: "Clock", title: "Deal Pipeline", description: "Inquiries qualified and routed through your pre-approved rules", badge: "Pending", accentColor: "amber" },
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
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const sideSignals = SIGNALS.filter((_, i) => side === "left" ? i % 2 === 0 : i % 2 !== 0);

  const cycleSignals = useCallback(() => {
    // Show 2-3 signals at a time, cycle through
    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
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
    // Show first 2 signals statically
    return (
      <div
        className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 flex-col gap-3 z-10 ${
          side === "left" ? "left-6" : "right-6"
        }`}
      >
        {sideSignals.slice(0, 2).map((signal) => (
          <SignalPill key={signal.id} signal={signal} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 flex-col gap-3 z-10 ${
        side === "left" ? "left-6" : "right-6"
      }`}
    >
      <AnimatePresence mode="popLayout">
        {visibleIndices.map((idx) => {
          const signal = sideSignals[idx];
          if (!signal) return null;
          return (
            <motion.div
              key={signal.id}
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
