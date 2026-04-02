"use client";

import { motion } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalEntity } from "./digital-entity";

export interface HeroFinalProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
}

const spring = { type: "spring" as const, damping: 25, stiffness: 300 };

const PROCESS_STEPS = [
  { word: "Capture", icon: Fingerprint },
  { word: "Protect", icon: Shield },
  { word: "License", icon: Briefcase },
] as const;

export function HeroFinal({ onRequestAccess, onHowItWorks }: HeroFinalProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      {/* Digital Entity */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.1 }}
        className="mb-6"
      >
        <DigitalEntity size={72} />
      </motion.div>

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
        className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-8"
      >
        Own Your Digital Identity
      </motion.h1>

      {/* Supporting — Capture. Protect. License. with icons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="flex items-center gap-6 mb-10"
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

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.9 }}
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

      <div className="mt-16" />
    </div>
  );
}
