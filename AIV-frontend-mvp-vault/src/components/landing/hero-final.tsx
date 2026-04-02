"use client";

import { motion } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroFinalProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  variant?: 1 | 2 | 3;
}

const spring = { type: "spring" as const, damping: 25, stiffness: 300 };

const DESCRIPTIONS = {
  1: "AIV certifies, protects, and helps you monetize your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and automated licensing.",
  2: "The first platform where high-profile talent captures, certifies, and licenses their digital identity — with full control over every guardrail and every deal.",
  3: "Your identity, assembled from your public presence. Your rules, enforced by custom guardrails. Your licensing, managed and monetized on your terms.",
} as const;

const PROCESS_STEPS = [
  { word: "Capture", icon: Fingerprint },
  { word: "Protect", icon: Shield },
  { word: "License", icon: Briefcase },
] as const;

export function HeroFinal({ onRequestAccess, onHowItWorks, variant = 1 }: HeroFinalProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
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

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.6 }}
        className="text-lg sm:text-xl text-white/50 max-w-[540px] mb-12 leading-relaxed"
      >
        {DESCRIPTIONS[variant]}
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={onRequestAccess}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer"
        >
          Request Early Access &rarr;
        </Button>
        <Button
          onClick={onHowItWorks}
          variant="outline"
          className="border-white/10 text-white/50 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.03] px-8 py-6 text-base font-medium rounded-xl bg-transparent transition-[transform,color,border-color,background-color] duration-150 active:scale-[0.97] cursor-pointer"
        >
          See How It Works
        </Button>
      </motion.div>

      {/* Capture. Protect. License. — shown below buttons on variant 2 only */}
      {variant === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="flex items-center gap-6 mt-10"
        >
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.word}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 1.1 + i * 0.1 }}
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

      <div className="mt-16" />
    </div>
  );
}
