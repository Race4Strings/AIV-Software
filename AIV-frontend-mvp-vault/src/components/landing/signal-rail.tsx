"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Globe, Shield, Lock, DollarSign,
  BookOpen, Clock, BarChart3, Fingerprint,
} from "lucide-react";

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

/* ── Rail Pill ── */
function RailPill({ signal, onHover, onLeave }: { signal: Signal; onHover?: () => void; onLeave?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];

  return (
    <motion.div
      onMouseEnter={() => { setHovered(true); onHover?.(); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
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
          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
        )}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0.5">
              <p className="text-[11px] text-white/40 leading-relaxed">{signal.description}</p>
              {signal.metric && (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white font-mono tabular-nums">{signal.metric}</span>
                  {signal.metricLabel && <span className="text-[9px] text-white/30 uppercase tracking-wider">{signal.metricLabel}</span>}
                </div>
              )}
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${colors.dot}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${signal.metricPercent ?? 70}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
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

/* ── Rail slot config ── */
interface RailSlot {
  side: "left" | "right";
  topPercent: number; // vertical position
  staggerDelay: number; // initial entry delay in seconds
}

const RAIL_SLOTS: RailSlot[] = [
  { side: "left", topPercent: 18, staggerDelay: 1.5 },
  { side: "left", topPercent: 55, staggerDelay: 3.0 },
  { side: "right", topPercent: 38, staggerDelay: 4.5 },
];

/* ── RailSignals ── */
export function RailSignals() {
  // Each slot tracks its current signal index and a unique key for AnimatePresence
  const [slotSignals, setSlotSignals] = useState<{ sigIdx: number; key: number }[]>([
    { sigIdx: 0, key: 0 },
    { sigIdx: 1, key: 1 },
    { sigIdx: 2, key: 2 },
  ]);
  const [visibleSlots, setVisibleSlots] = useState<boolean[]>([false, false, false]);
  const counterRef = useRef(3); // Next signal index
  const keyCounterRef = useRef(3);
  const pausedRef = useRef(false);
  const rotationSlotRef = useRef(0); // Which slot to rotate next

  // Staggered initial entry
  useEffect(() => {
    const timers = RAIL_SLOTS.map((slot, i) =>
      setTimeout(() => {
        setVisibleSlots((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, slot.staggerDelay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotation: every 2.5s, swap one slot's signal
  useEffect(() => {
    // Start rotation after all pills have entered (after 4.5s + buffer)
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        if (pausedRef.current) return;

        const slotIdx = rotationSlotRef.current % 3;
        rotationSlotRef.current++;

        // Hide the slot (slide out)
        setVisibleSlots((prev) => {
          const next = [...prev];
          next[slotIdx] = false;
          return next;
        });

        // After slide-out animation, swap signal and slide back in
        setTimeout(() => {
          const newSigIdx = counterRef.current % SIGNALS.length;
          counterRef.current++;
          const newKey = keyCounterRef.current++;

          setSlotSignals((prev) => {
            const next = [...prev];
            next[slotIdx] = { sigIdx: newSigIdx, key: newKey };
            return next;
          });

          setVisibleSlots((prev) => {
            const next = [...prev];
            next[slotIdx] = true;
            return next;
          });
        }, 500); // Brief pause between out and in
      }, 2500);

      return () => clearInterval(interval);
    }, 5500);

    return () => clearTimeout(startDelay);
  }, []);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      {RAIL_SLOTS.map((slot, i) => {
        const isVisible = visibleSlots[i];
        const { sigIdx, key } = slotSignals[i];
        const isLeft = slot.side === "left";

        return (
          <div
            key={i}
            className="absolute pointer-events-auto"
            style={{
              top: `${slot.topPercent}%`,
              ...(isLeft ? { left: "3%" } : { right: "3%" }),
            }}
          >
            <AnimatePresence mode="wait">
              {isVisible && (
                <motion.div
                  key={key}
                  initial={{ x: isLeft ? -300 : 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: isLeft ? -300 : 300, opacity: 0 }}
                  transition={{
                    type: "spring",
                    damping: 22,
                    stiffness: 180,
                    opacity: { duration: 0.3 },
                  }}
                >
                  <RailPill
                    signal={SIGNALS[sigIdx]}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
