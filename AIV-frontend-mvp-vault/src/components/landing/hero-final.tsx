"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase, Search, Brain, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroFinalProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  variant?: 1 | 2 | 3;
}

const spring = { type: "spring" as const, damping: 25, stiffness: 300 };

const PROCESS_STEPS = [
  { word: "Capture", icon: Fingerprint },
  { word: "Protect", icon: Shield },
  { word: "License", icon: Briefcase },
] as const;

const REVEAL_STEPS = [
  { icon: Search, label: "Discover", desc: "Your public presence assembled from across the web" },
  { icon: Fingerprint, label: "Capture", desc: "Communication style, values, and personality structured" },
  { icon: Brain, label: "Build", desc: "Identity engine models a licensable digital profile" },
  { icon: Shield, label: "Certify", desc: "Blockchain-anchored cryptographic proof of ownership" },
  { icon: Lock, label: "Protect", desc: "Continuous misuse monitoring and enforcement" },
  { icon: Briefcase, label: "License", desc: "Automated deal management with terms you control" },
  { icon: Globe, label: "Deploy", desc: "Cross-platform delivery governed by your guardrails" },
];

export function HeroFinal({ onRequestAccess, onHowItWorks, variant = 1 }: HeroFinalProps) {
  const [showMotion, setShowMotion] = useState(false);
  const [motionStage, setMotionStage] = useState(0);
  const [motionComplete, setMotionComplete] = useState(false);
  const escRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Motion graphic stages for variant 3 overlay
  useEffect(() => {
    if (!showMotion || motionComplete) return;
    setMotionStage(0);
    const t1 = setTimeout(() => setMotionStage(1), 800);
    const t2 = setTimeout(() => setMotionStage(2), 2200);
    const t3 = setTimeout(() => { setMotionStage(3); setMotionComplete(true); }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showMotion, motionComplete]);

  // Escape to close motion overlay
  useEffect(() => {
    if (!showMotion) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMotion(false); };
    escRef.current = handler;
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showMotion]);

  function handleHowItWorks() {
    if (variant === 3) {
      setShowMotion(true);
      if (motionComplete) setMotionStage(3); // skip animation if already seen
    } else {
      onHowItWorks();
    }
  }

  return (
    <>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center pointer-events-none">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-white/50 tracking-widest uppercase">Identity Infrastructure</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.4 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-7">
          Own Your Digital Identity
        </motion.h1>

        {/* ─── VARIANT 1: Clean paragraph ─── */}
        {variant === 1 && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.6 }}
            className="text-lg sm:text-xl text-white/50 max-w-[540px] mb-10 leading-relaxed">
            The first identity infrastructure purpose-built for high-profile talent. Capture, certify, and license your digital identity — with full control over every guardrail and every deal.
          </motion.p>
        )}

        {/* ─── VARIANT 2: Paragraph (not stacked) + icons below CTA ─── */}
        {variant === 2 && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.6 }}
            className="text-lg sm:text-xl text-white/45 max-w-[560px] mb-10 leading-relaxed">
            Your identity, assembled and certified. Your rules, enforced by custom guardrails. Your licensing, automated on your terms — built for athletes, musicians, actors, executives, and creators.
          </motion.p>
        )}

        {/* ─── VARIANT 3: Description paragraph ─── */}
        {variant === 3 && (
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.6 }}
            className="text-lg sm:text-xl text-white/50 max-w-[540px] mb-10 leading-relaxed">
            Where high-profile talent captures, certifies, and licenses their digital identity. The first system purpose-built for the AI economy.
          </motion.p>
        )}

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.8 }}
          className="pointer-events-auto flex flex-col items-center gap-4">
          <Button onClick={onRequestAccess}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer">
            Request Early Access &rarr;
          </Button>
          <button onClick={handleHowItWorks}
            className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider pointer-events-auto">
            See how it works &rarr;
          </button>
        </motion.div>

        {/* Variant 2: Capture. Protect. License. below buttons */}
        {variant === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.0 }}
            className="flex items-center gap-6 mt-8">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div key={step.word} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 1.1 + i * 0.1 }} className="flex items-center gap-1.5">
                <step.icon className="h-3.5 w-3.5 text-white/20" />
                <span className="text-sm text-white/25 tracking-wider font-medium">{step.word}.</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-16" />
      </div>

      {/* ─── VARIANT 3: Motion graphic overlay ─── */}
      <AnimatePresence>
        {showMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[oklch(0.06_0.01_262)]/95 backdrop-blur-xl"
          >
            {/* Close button + back text */}
            <div className="absolute top-6 left-6 flex items-center gap-3 pointer-events-auto">
              <button onClick={() => setShowMotion(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors duration-150 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => setShowMotion(false)}
                className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider">
                Back to home
              </button>
            </div>

            {/* Animation content */}
            <div className="max-w-3xl w-full px-6">
              {/* Stage 0: 3 icons only */}
              {motionStage === 0 && (
                <motion.div className="flex items-center justify-center gap-10">
                  {PROCESS_STEPS.map((s, i) => (
                    <motion.div key={s.word} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring, delay: i * 0.15 }}>
                      <s.icon className="h-8 w-8 text-white/30" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Stage 1: icons + words */}
              {motionStage === 1 && (
                <motion.div className="flex items-center justify-center gap-8">
                  {PROCESS_STEPS.map((s, i) => (
                    <motion.div key={s.word} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring, delay: i * 0.12 }} className="flex items-center gap-2.5">
                      <s.icon className="h-6 w-6 text-white/30" />
                      <span className="text-lg text-white/50 tracking-wider font-medium">{s.word}.</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Stage 2: expanding to full breakdown */}
              {motionStage === 2 && (
                <motion.div className="space-y-3">
                  <p className="text-center text-sm text-white/30 mb-6 tracking-wider uppercase">How It Works</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {REVEAL_STEPS.slice(0, 6).map((item, i) => (
                      <motion.div key={item.label} initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ ...spring, delay: i * 0.08 }}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="flex items-center gap-2.5 mb-2">
                          <item.icon className="h-4 w-4 text-white/25" />
                          <span className="text-sm text-white/50 font-medium">{item.label}</span>
                        </div>
                        <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stage 3: final static state (complete breakdown) */}
              {motionStage >= 3 && (
                <div className="space-y-3">
                  <p className="text-center text-sm text-white/30 mb-6 tracking-wider uppercase">How It Works</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {REVEAL_STEPS.map((item, i) => (
                      <motion.div key={item.label} initial={motionComplete ? {} : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: motionComplete ? 0 : i * 0.06 }}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors duration-200">
                        <div className="flex items-center gap-2.5 mb-2">
                          <item.icon className="h-4 w-4 text-white/25" />
                          <span className="text-sm text-white/50 font-medium">{item.label}</span>
                        </div>
                        <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center mt-8">
                    <Button onClick={() => { setShowMotion(false); onRequestAccess(); }}
                      className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 text-sm font-medium rounded-xl shadow-lg shadow-primary/15 active:scale-[0.97] cursor-pointer">
                      Request Early Access &rarr;
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
