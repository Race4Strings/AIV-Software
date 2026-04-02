"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase, Search, Brain, Globe } from "lucide-react";
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

// Variant 3: progressive reveal stages
const REVEAL_STAGES = [
  // Stage 0: just 3 icons
  null,
  // Stage 1: icons + short words
  null,
  // Stage 2: full breakdown
  [
    { icon: Search, label: "Discover", desc: "Public presence assembled" },
    { icon: Fingerprint, label: "Capture", desc: "Identity structured" },
    { icon: Brain, label: "Certify", desc: "Blockchain-anchored proof" },
    { icon: Shield, label: "Protect", desc: "Misuse monitored" },
    { icon: Briefcase, label: "License", desc: "Revenue automated" },
    { icon: Globe, label: "Deploy", desc: "Cross-platform ready" },
  ],
];

export function HeroFinal({ onRequestAccess, onHowItWorks, variant = 1 }: HeroFinalProps) {
  // Variant 3: animation stage (0 = icons only, 1 = icons + words, 2 = full breakdown, 3 = final static)
  const [revealStage, setRevealStage] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (variant !== 3 || animationComplete) return;
    const t1 = setTimeout(() => setRevealStage(1), 1500); // show words
    const t2 = setTimeout(() => setRevealStage(2), 3000); // show full breakdown
    const t3 = setTimeout(() => { setRevealStage(3); setAnimationComplete(true); }, 5500); // final state
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [variant, animationComplete]);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center pointer-events-none">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm"
      >
        <Lock className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white/50 tracking-widest uppercase">Identity Infrastructure</span>
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

      {/* ─── VARIANT 1: Clean description ─── */}
      {variant === 1 && (
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.6 }}
          className="text-lg sm:text-xl text-white/50 max-w-[540px] mb-10 leading-relaxed"
        >
          The first identity infrastructure purpose-built for high-profile talent. Capture, certify, and license your digital identity — with full control over every guardrail and every deal.
        </motion.p>
      )}

      {/* ─── VARIANT 2: Stacked + context ─── */}
      {variant === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.6 }}
          className="flex flex-col items-center gap-2 mb-10"
        >
          <p className="text-lg sm:text-xl text-white/45 leading-relaxed">Your identity, assembled and certified.</p>
          <p className="text-lg sm:text-xl text-white/45 leading-relaxed">Your rules, enforced by custom guardrails.</p>
          <p className="text-lg sm:text-xl text-white/45 leading-relaxed">Your licensing, automated on your terms.</p>
          <p className="text-sm text-white/25 mt-2">Built for athletes, musicians, actors, executives, and creators.</p>
        </motion.div>
      )}

      {/* ─── VARIANT 3: Progressive animation → static final ─── */}
      {variant === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mb-10"
        >
          {/* Stage 0: just 3 icons */}
          {revealStage === 0 && (
            <motion.div className="flex items-center gap-8">
              {PROCESS_STEPS.map((s, i) => (
                <motion.div key={s.word} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...spring, delay: i * 0.15 }}>
                  <s.icon className="h-6 w-6 text-white/30" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Stage 1: icons + words */}
          {revealStage === 1 && (
            <motion.div className="flex items-center gap-6">
              {PROCESS_STEPS.map((s, i) => (
                <motion.div key={s.word} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring, delay: i * 0.1 }} className="flex items-center gap-2">
                  <s.icon className="h-5 w-5 text-white/30" />
                  <span className="text-base text-white/40 tracking-wider font-medium">{s.word}.</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Stage 2: full breakdown (expanding) */}
          {revealStage === 2 && (
            <motion.div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {REVEAL_STAGES[2]!.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ ...spring, delay: i * 0.08 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <item.icon className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-xs text-white/40 font-medium">{item.label}</span>
                  <span className="text-[10px] text-white/20">— {item.desc}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Stage 3: final static state */}
          {revealStage >= 3 && (
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
              {REVEAL_STAGES[2]!.map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <item.icon className="h-3.5 w-3.5 text-white/25" />
                  <span className="text-xs text-white/40 font-medium">{item.label}</span>
                  <span className="text-[10px] text-white/20">— {item.desc}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* CTAs — all variants */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.8 }}
        className="pointer-events-auto flex flex-col items-center gap-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onRequestAccess}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer">
            Request Early Access &rarr;
          </Button>
        </div>
        <button onClick={onHowItWorks}
          className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider pointer-events-auto">
          See how it works &rarr;
        </button>
      </motion.div>

      {/* Variant 2: Capture. Protect. License. below buttons */}
      {variant === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="flex items-center gap-6 mt-8"
        >
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
  );
}
