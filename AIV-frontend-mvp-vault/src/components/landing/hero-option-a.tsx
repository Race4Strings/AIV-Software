"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import VariableProximity from "@/components/ui/VariableProximity";

export interface HeroOptionProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  auroraOpacity: number;
}

const springTransition = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
};

export function HeroOptionA({
  containerRef,
  onRequestAccess,
  onHowItWorks,
}: HeroOptionProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      {/* Identity Infrastructure Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm"
      >
        <Lock className="h-3.5 w-3.5 text-white/50" />
        <span className="text-xs font-medium text-white/50 tracking-widest uppercase">
          Identity Infrastructure
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className="mb-7"
      >
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight"
        >
          <VariableProximity
            label="Own Your Digital Identity"
            fromFontVariationSettings="'wght' 600"
            toFontVariationSettings="'wght' 900"
            containerRef={containerRef}
            radius={150}
            falloff="gaussian"
            className="font-[Roboto_Flex]"
            style={{ fontFamily: "'Roboto Flex', sans-serif" }}
          />
        </h1>
      </motion.div>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="text-lg text-white/50 leading-relaxed max-w-[520px] mb-12"
      >
        Your identity, captured and certified.
        <br className="hidden sm:block" />{" "}
        Your rules, enforced by custom guardrails.
        <br className="hidden sm:block" />{" "}
        Your licensing, managed on your terms.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={onRequestAccess}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] duration-150 hover:shadow-xl active:scale-[0.97] cursor-pointer"
        >
          Request Early Access{" "}
          <span className="ml-1" aria-hidden="true">
            &rarr;
          </span>
        </Button>
        <Button
          onClick={onHowItWorks}
          variant="outline"
          className="border-white/10 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/[0.04] px-8 py-6 text-base font-medium rounded-xl bg-transparent transition-[transform,color,border-color,background-color] duration-150 active:scale-[0.97] cursor-pointer"
        >
          See How It Works
        </Button>
      </motion.div>
    </div>
  );
}
