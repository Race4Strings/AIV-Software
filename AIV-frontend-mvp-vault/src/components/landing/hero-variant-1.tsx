"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import VariableProximity from "@/components/ui/VariableProximity";

interface HeroVariantProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
}

export function HeroVariant1({
  containerRef,
  onRequestAccess,
  onHowItWorks,
}: HeroVariantProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      {/* Identity Infrastructure Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 mb-8 backdrop-blur-sm"
      >
        <Lock className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white/60 tracking-widest uppercase">
          Identity Infrastructure
        </span>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mb-7"
      >
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight">
          <VariableProximity
            label="Own Your Digital Identity"
            fromFontVariationSettings="'wght' 800"
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
        transition={{ duration: 0.6, delay: 0.6 }}
        className="text-lg sm:text-xl text-white/60 max-w-[540px] mb-12 leading-relaxed"
      >
        Capture, certify, and license your digital identity with cryptographic
        proof-of-ownership and automated deal management.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={onRequestAccess}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-blue-600/25 transition-[transform,box-shadow,background-color] duration-150 hover:shadow-blue-500/30 active:scale-[0.97] cursor-pointer"
        >
          Request Early Access &rarr;
        </Button>
        <Button
          onClick={onHowItWorks}
          variant="outline"
          className="border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 hover:bg-white/[0.04] px-8 py-6 text-base font-medium rounded-xl bg-transparent transition-[transform,color,border-color,background-color] duration-150 active:scale-[0.97] cursor-pointer"
        >
          See How It Works
        </Button>
      </motion.div>

      {/* Spacer */}
      <div className="mt-16" />
    </div>
  );
}
