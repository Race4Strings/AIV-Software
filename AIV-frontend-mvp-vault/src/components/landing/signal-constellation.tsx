"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400", glow: "rgba(59,130,246,0.6)" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400", glow: "rgba(16,185,129,0.6)" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400", glow: "rgba(239,68,68,0.6)" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400", glow: "rgba(245,158,11,0.6)" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400", glow: "rgba(168,85,247,0.6)" },
};

/* ── Static point positions (percentage-based, avoiding center hero) ── */
const BASE_POSITIONS = [
  { x: 8, y: 15 },   // top-left
  { x: 88, y: 20 },  // top-right
  { x: 6, y: 65 },   // bottom-left
  { x: 90, y: 60 },  // bottom-right
  { x: 15, y: 40 },  // mid-left
];

/* ── ConstellationPill (expanded state) ── */
function ConstellationPill({ signal }: { signal: Signal }) {
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", damping: 20, stiffness: 260 }}
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl cursor-default overflow-hidden"
      style={{ minWidth: 260, maxWidth: 280 }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
          <Icon className={`h-3 w-3 ${colors.text}`} />
        </div>
        <span className="text-[11px] font-medium text-white/70 truncate">{signal.title}</span>
        {signal.badge && (
          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
        )}
      </div>
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
      </div>
    </motion.div>
  );
}

/* ── Helpers ── */
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/* ── ConstellationSignals ── */
export function ConstellationSignals() {
  const [signalIndices, setSignalIndices] = useState([0, 1, 2, 3, 4]);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [driftOffsets, setDriftOffsets] = useState(
    BASE_POSITIONS.map(() => ({ dx: 0, dy: 0 }))
  );
  const [lineOpacity, setLineOpacity] = useState(0.05);
  const counterRef = useRef(5);
  const rotationRef = useRef(0);

  // Slow drift: points move slightly every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setDriftOffsets((prev) =>
        prev.map((offset) => ({
          dx: Math.max(-2, Math.min(2, offset.dx + (Math.random() - 0.5) * 1.2)),
          dy: Math.max(-2, Math.min(2, offset.dy + (Math.random() - 0.5) * 1.2)),
        }))
      );
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Line opacity pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLineOpacity(0.03 + Math.random() * 0.05);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotate one dot's signal content every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      const dotIdx = rotationRef.current % 5;
      rotationRef.current++;
      const newSigIdx = counterRef.current % SIGNALS.length;
      counterRef.current++;

      setSignalIndices((prev) => {
        const next = [...prev];
        next[dotIdx] = newSigIdx;
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute current positions
  const positions = useMemo(
    () =>
      BASE_POSITIONS.map((base, i) => ({
        x: base.x + driftOffsets[i].dx,
        y: base.y + driftOffsets[i].dy,
      })),
    [driftOffsets]
  );

  // Compute lines: connect points within 30% distance of each other
  const lines = useMemo(() => {
    const result: { from: number; to: number }[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (distance(positions[i], positions[j]) < 30) {
          result.push({ from: i, to: j });
        }
      }
    }
    return result;
  }, [positions]);

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      {/* SVG layer for connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {lines.map(({ from, to }, i) => (
          <motion.line
            key={`${from}-${to}`}
            x1={`${positions[from].x}%`}
            y1={`${positions[from].y}%`}
            x2={`${positions[to].x}%`}
            y2={`${positions[to].y}%`}
            stroke="white"
            strokeWidth={1}
            animate={{ opacity: lineOpacity }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {/* Points */}
      {positions.map((pos, i) => {
        const signal = SIGNALS[signalIndices[i]];
        const colors = ACCENT_COLORS[signal.accentColor];
        const isHovered = hoveredPoint === i;

        return (
          <div
            key={i}
            className="absolute pointer-events-auto"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isHovered ? 40 : 31,
            }}
            onMouseEnter={() => setHoveredPoint(i)}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <AnimatePresence mode="wait">
              {isHovered ? (
                <ConstellationPill key={`pill-${i}-${signalIndices[i]}`} signal={signal} />
              ) : (
                <motion.div
                  key={`dot-${i}-${signalIndices[i]}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative cursor-pointer"
                >
                  {/* Glow ring */}
                  <div
                    className="absolute inset-0 rounded-full blur-sm"
                    style={{
                      width: 14,
                      height: 14,
                      marginLeft: -4,
                      marginTop: -4,
                      backgroundColor: colors.glow,
                      opacity: 0.3,
                    }}
                  />
                  {/* Core dot */}
                  <div
                    className={`w-[6px] h-[6px] rounded-full ${colors.dot}`}
                    style={{
                      boxShadow: `0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}`,
                    }}
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
