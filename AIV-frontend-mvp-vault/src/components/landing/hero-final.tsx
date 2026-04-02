"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroFinalProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  variant?: 1 | 2 | 3;
  hoveredSignal?: { title: string; description: string; metric?: string; metricLabel?: string } | null;
}

const spring = { type: "spring" as const, damping: 25, stiffness: 300 };

const PROCESS_STEPS = [
  { word: "Capture", icon: Fingerprint },
  { word: "Protect", icon: Shield },
  { word: "License", icon: Briefcase },
] as const;

export function HeroFinal({ onRequestAccess, onHowItWorks, variant = 1, hoveredSignal }: HeroFinalProps) {
  // Variant 3: dynamic center content from hovered signal
  const showSignalContent = variant === 3 && hoveredSignal;

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center pointer-events-none">
      {/* Identity Infrastructure Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm"
      >
        <Lock className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white/50 tracking-widest uppercase">
          Identity Infrastructure
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.4 }}
        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-7"
      >
        Own Your Digital Identity
      </motion.h1>

      {/* ─── VARIANT 1: Capture. Protect. License. with icons ─── */}
      {variant === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex items-center gap-6 mb-12"
        >
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.word}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5 text-white/20" />
                <span className="text-sm text-white/30 tracking-wider font-medium">
                  {step.word}.
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ─── VARIANT 2: Personal description ─── */}
      {variant === 2 && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.6 }}
          className="text-lg sm:text-xl text-white/50 max-w-[540px] mb-12 leading-relaxed"
        >
          Your identity, assembled from your public presence. Your rules, enforced by custom guardrails. Your licensing, managed and monetized on your terms.
        </motion.p>
      )}

      {/* ─── VARIANT 3: Dynamic center (signal-driven) ─── */}
      {variant === 3 && (
        <div className="mb-12 h-[80px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {showSignalContent ? (
              <motion.div
                key={hoveredSignal.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3"
              >
                <p className="text-base text-white/60 max-w-md leading-relaxed">{hoveredSignal.description}</p>
                {hoveredSignal.metric && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white font-mono tabular-nums">{hoveredSignal.metric}</span>
                    {hoveredSignal.metricLabel && (
                      <span className="text-xs text-white/30 tracking-wider uppercase">{hoveredSignal.metricLabel}</span>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.p
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-lg text-white/35 max-w-md leading-relaxed"
              >
                Hover a signal to explore what AIV does for you.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.8 }}
        className={`pointer-events-auto ${variant === 3 ? "flex flex-col items-center gap-4" : "flex flex-col sm:flex-row gap-3"}`}
      >
        <Button
          onClick={onRequestAccess}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer"
        >
          Request Early Access &rarr;
        </Button>
        {variant === 3 ? (
          <button
            onClick={onHowItWorks}
            className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider pointer-events-auto"
          >
            See how it works &rarr;
          </button>
        ) : (
          <Button
            onClick={onHowItWorks}
            variant="outline"
            className="border-white/10 text-white/50 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.03] px-8 py-6 text-base font-medium rounded-xl bg-transparent transition-[transform,color,border-color,background-color] duration-150 active:scale-[0.97] cursor-pointer"
          >
            See How It Works
          </Button>
        )}
      </motion.div>

      <div className="mt-16" />
    </div>
  );
}
