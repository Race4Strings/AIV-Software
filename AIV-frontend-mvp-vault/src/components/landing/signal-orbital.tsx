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

/* ── Orbital Pill ── */
function OrbitalPill({ signal, onHover, onLeave }: { signal: Signal; onHover?: () => void; onLeave?: () => void }) {
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

/* ── OrbitalSignals ── */
export function OrbitalSignals() {
  const [signalIndices, setSignalIndices] = useState([0, 1, 2]);
  const counterRef = useRef(3);
  const pausedRef = useRef(false);

  // Rotate signal content every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setSignalIndices((prev) => {
        const next = [...prev];
        // Replace the oldest slot (round-robin through the 3 positions)
        const slotToReplace = (counterRef.current - 3) % 3;
        next[slotToReplace] = counterRef.current % SIGNALS.length;
        counterRef.current++;
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  // 3 signals at 120-degree intervals on an elliptical orbit
  // The outer container rotates; each pill counter-rotates to stay upright
  const ORBIT_DURATION = 90; // seconds for full rotation

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      {/* Orbit container: centered, elliptical dimensions */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: "45vw",
          height: "35vh",
          animation: `orbital-spin ${ORBIT_DURATION}s linear infinite`,
        }}
      >
        {signalIndices.map((sigIdx, i) => {
          const angleDeg = i * 120; // 0, 120, 240 degrees
          // Position each signal on the ellipse edge using transform
          // We place them at a known angle on the ellipse perimeter
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 pointer-events-auto"
              style={{
                // Position on ellipse: translate to edge at the angle
                transform: `rotate(${angleDeg}deg) translateX(50%) rotate(-${angleDeg}deg)`,
                // Counter-rotate against parent orbit to keep pill upright
                animation: `orbital-counter-spin ${ORBIT_DURATION}s linear infinite`,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${i}-${sigIdx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                >
                  <OrbitalPill
                    signal={SIGNALS[sigIdx]}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes orbital-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbital-counter-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}
