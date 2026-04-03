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
  { id: "deal-inquiry", icon: "FileText", title: "New Deal Inquiry", description: "A brand wants to license your voice for a global campaign.", badge: "Review", accentColor: "blue", metric: "$250K", metricLabel: "Deal Value", metricPercent: 95 },
  { id: "revenue", icon: "DollarSign", title: "Revenue Received", description: "Your latest licensing deal payment has been processed.", badge: "Settled", accentColor: "green", metric: "$87,500", metricLabel: "Net Payment", metricPercent: 92 },
  { id: "misuse", icon: "Shield", title: "Misuse Blocked", description: "Unauthorized use detected, flagged, and evidence sealed.", badge: "Protected", accentColor: "red", metric: "3", metricLabel: "Blocked", metricPercent: 95 },
  { id: "verified", icon: "Lock", title: "Identity Verified", description: "A brand verified your identity before licensing.", accentColor: "purple", metric: "47", metricLabel: "Verifications", metricPercent: 90 },
  { id: "twin-updated", icon: "BookOpen", title: "Twin Updated", description: "New data from your latest podcast was processed.", accentColor: "amber", metric: "97%", metricLabel: "Accuracy", metricPercent: 97 },
  { id: "contract", icon: "Clock", title: "Contract Ready", description: "Your voice licensing contract is ready for signature.", badge: "Sign", accentColor: "blue", metric: "Step 5/5", metricLabel: "Progress", metricPercent: 100 },
  { id: "cross-platform", icon: "Globe", title: "Cross-Platform Ready", description: "Your identity governed across every integration.", badge: "Live", accentColor: "green", metric: "6", metricLabel: "Platforms", metricPercent: 95 },
  { id: "profile", icon: "Fingerprint", title: "Identity Certified", description: "Certified with blockchain-anchored proof of ownership.", accentColor: "purple", metric: "Sealed", metricLabel: "Blockchain", metricPercent: 100 },
  { id: "marketplace", icon: "BarChart3", title: "Brand Interest", description: "Brands exploring identity licensing through AIV.", accentColor: "blue", metric: "14", metricLabel: "Inquiries", metricPercent: 92 },
];

const ACCENT_COLORS: Record<string, { dot: string; bg: string; text: string; badge: string }> = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500/15 text-blue-400" },
  green: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", badge: "bg-red-500/15 text-red-400" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500/15 text-amber-400" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-400" },
};

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
      style={{ minWidth: hovered ? 240 : 170, maxWidth: 260 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
          <Icon className={`h-2.5 w-2.5 ${colors.text}`} />
        </div>
        <span className="text-[10px] font-medium text-white/70 truncate">{signal.title}</span>
        {signal.badge && !hovered && (
          <span className={`ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge} shrink-0`}>{signal.badge}</span>
        )}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden">
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function OrbitalSignals() {
  const [signalIndices, setSignalIndices] = useState([0, 1, 2]);
  const [angle, setAngle] = useState(0);
  const counterRef = useRef(3);
  const pausedRef = useRef(false);

  // Slow rotation
  useEffect(() => {
    const anim = setInterval(() => {
      if (!pausedRef.current) setAngle(a => a + 0.15); // ~0.15deg per 16ms = ~60s full rotation
    }, 16);
    return () => clearInterval(anim);
  }, []);

  // Rotate signal content every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setSignalIndices(prev => {
        const next = [...prev];
        const slot = (counterRef.current - 3) % 3;
        next[slot] = counterRef.current % SIGNALS.length;
        counterRef.current++;
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleHover = useCallback(() => { pausedRef.current = true; }, []);
  const handleLeave = useCallback(() => { pausedRef.current = false; }, []);

  // Ellipse: 38% of viewport width, 30% height
  const rx = 38; // % of viewport width / 2
  const ry = 30; // % of viewport height / 2

  return (
    <div className="hidden lg:block fixed inset-0 z-30 pointer-events-none">
      {signalIndices.map((sigIdx, i) => {
        const baseAngle = angle + i * 120;
        const rad = (baseAngle * Math.PI) / 180;
        const x = 50 + rx * Math.cos(rad); // center at 50%
        const y = 50 + ry * Math.sin(rad); // center at 50%

        return (
          <div key={i} className="absolute pointer-events-auto" style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}>
            <AnimatePresence mode="wait">
              <motion.div key={sigIdx}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}>
                <OrbitalPill signal={SIGNALS[sigIdx]} onHover={handleHover} onLeave={handleLeave} />
              </motion.div>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
