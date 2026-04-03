"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  { id: "deal-inquiry", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a global campaign.", badge: "Review", accentColor: "blue", metric: "$250K", metricLabel: "Deal Value", metricPercent: 95 },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest deal payment has been processed.", badge: "Settled", accentColor: "green", metric: "$87,500", metricLabel: "Net Payment", metricPercent: 92 },
  { id: "misuse", icon: "Shield", title: "Misuse Blocked", description: "Unauthorized use detected and evidence sealed.", badge: "Protected", accentColor: "red", metric: "3", metricLabel: "Blocked", metricPercent: 95 },
  { id: "verified", icon: "Lock", title: "Identity Verified", description: "A brand verified your identity before licensing.", accentColor: "purple", metric: "47", metricLabel: "Verifications", metricPercent: 90 },
  { id: "twin-updated", icon: "BookOpen", title: "Twin Updated", description: "New data from your latest podcast processed.", accentColor: "amber", metric: "97%", metricLabel: "Accuracy", metricPercent: 97 },
  { id: "contract", icon: "Clock", title: "Contract Ready", description: "Your voice licensing contract is ready to sign.", badge: "Sign", accentColor: "blue", metric: "Step 5/5", metricLabel: "Progress", metricPercent: 100 },
  { id: "cross-platform", icon: "Globe", title: "Cross-Platform Ready", description: "Identity governed across every integration.", badge: "Live", accentColor: "green", metric: "6", metricLabel: "Platforms", metricPercent: 95 },
  { id: "profile", icon: "Fingerprint", title: "Identity Certified", description: "Blockchain-anchored proof of ownership.", accentColor: "purple", metric: "Sealed", metricLabel: "Blockchain", metricPercent: 100 },
  { id: "marketplace", icon: "BarChart3", title: "Brand Interest", description: "Brands exploring licensing through AIV.", accentColor: "blue", metric: "14", metricLabel: "Inquiries", metricPercent: 92 },
];

const ACCENT_HEX: Record<string, string> = {
  blue: "#3b82f6", green: "#10b981", red: "#ef4444", amber: "#f59e0b", purple: "#8b5cf6",
};

const ACCENT_COLORS: Record<string, { dot: string; bg: string; text: string; badge: string }> = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

// 9 star positions — scattered around hero, avoiding center (25-65% vertical)
const STAR_POSITIONS = [
  { x: 8, y: 12 },   // top-left
  { x: 25, y: 8 },   // top-center-left
  { x: 78, y: 10 },  // top-right
  { x: 92, y: 18 },  // right-top
  { x: 6, y: 72 },   // bottom-left
  { x: 22, y: 80 },  // bottom-center-left
  { x: 55, y: 78 },  // bottom-center
  { x: 82, y: 75 },  // bottom-right
  { x: 93, y: 55 },  // right-mid
];

function StarDot({ signal, position, index }: { signal: Signal; position: { x: number; y: number }; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[signal.icon];
  const colors = ACCENT_COLORS[signal.accentColor];
  const hex = ACCENT_HEX[signal.accentColor] || "#3b82f6";

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%, -50%)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence mode="wait">
        {hovered ? (
          <motion.div key="expanded"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl cursor-default overflow-hidden"
            style={{ minWidth: 240, maxWidth: 260 }}>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
                <Icon className={`h-2.5 w-2.5 ${colors.text}`} />
              </div>
              <span className="text-[10px] font-medium text-white/70 truncate">{signal.title}</span>
              {signal.badge && (
                <span className={`ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
              )}
            </div>
            <div className="px-3 pb-2.5 pt-0.5">
              <p className="text-[10px] text-white/40 leading-relaxed">{signal.description}</p>
              {signal.metric && (
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-base font-bold text-white font-mono tabular-nums">{signal.metric}</span>
                  {signal.metricLabel && <span className="text-[8px] text-white/30 uppercase tracking-wider">{signal.metricLabel}</span>}
                </div>
              )}
              <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div className={`h-full rounded-full ${colors.dot}`}
                  initial={{ width: "0%" }} animate={{ width: `${signal.metricPercent ?? 70}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }} />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="dot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="cursor-pointer">
            {/* Glowing star dot */}
            <div className="relative">
              <div className="h-2 w-2 rounded-full"
                style={{ backgroundColor: hex, boxShadow: `0 0 8px ${hex}80, 0 0 16px ${hex}40` }} />
              {/* Subtle pulse */}
              <div className="absolute inset-0 h-2 w-2 rounded-full animate-ping"
                style={{ backgroundColor: hex, opacity: 0.2 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConstellationSignals() {
  // SVG lines between nearby stars
  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < STAR_POSITIONS.length; i++) {
      for (let j = i + 1; j < STAR_POSITIONS.length; j++) {
        const a = STAR_POSITIONS[i];
        const b = STAR_POSITIONS[j];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (dist < 35) { // Connect stars within 35% distance
          result.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        }
      }
    }
    return result;
  }, []);

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      {/* Constellation lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5 }}>
        {lines.map((line, i) => (
          <line key={i}
            x1={`${line.x1}%`} y1={`${line.y1}%`}
            x2={`${line.x2}%`} y2={`${line.y2}%`}
            stroke="white" strokeWidth="0.5" strokeOpacity="0.06"
            className="constellation-line" />
        ))}
      </svg>

      {/* Star dots — all 9 signals */}
      {SIGNALS.map((signal, i) => (
        <StarDot key={signal.id} signal={signal} position={STAR_POSITIONS[i]} index={i} />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes constellation-pulse { 0%,100%{stroke-opacity:0.04}50%{stroke-opacity:0.1} }
        .constellation-line{animation:constellation-pulse 4s ease-in-out infinite;animation-delay:calc(var(--i,0)*0.5s)}
      `}} />
    </div>
  );
}
