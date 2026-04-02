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

const springTransition = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
};

export function HeroVariant2({
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
        transition={springTransition}
        className="flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 mb-8 backdrop-blur-sm"
      >
        {/* Pulsing blue dot */}
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        <Lock className="h-3.5 w-3.5 text-primary/70" />
        <span className="text-xs font-medium text-primary/70 tracking-widest uppercase">
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
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08]"
          style={{ letterSpacing: "-0.03em" }}
        >
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

      {/* Subheadline — three distinct phrases */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="text-lg sm:text-xl text-white/60 max-w-[540px] mb-12 leading-relaxed"
      >
        Your identity, captured and certified.
        <br className="hidden sm:block" />{" "}
        Your rules enforced by guardrails.
        <br className="hidden sm:block" />{" "}
        Your revenue, automated through licensing.
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
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-7 text-base font-medium rounded-xl shadow-lg shadow-primary/25 transition-[transform,box-shadow,background-color] duration-150 hover:shadow-blue-500/30 hover:shadow-xl active:scale-[0.97] cursor-pointer"
          style={{
            boxShadow:
              "0 10px 25px -5px rgba(59,130,246,0.25), 0 0 20px -5px rgba(59,130,246,0.15)",
          }}
        >
          Request Early Access{" "}
          <span className="ml-1" aria-hidden="true">
            &rarr;
          </span>
        </Button>
        <Button
          onClick={onHowItWorks}
          variant="outline"
          className="border-white/[0.15] text-white/60 hover:text-white hover:border-white/30 hover:bg-white/[0.04] px-8 py-7 text-base font-medium rounded-xl bg-transparent transition-[transform,color,border-color,background-color] duration-150 active:scale-[0.97] cursor-pointer"
        >
          See How It Works
        </Button>
      </motion.div>

      {/* Animated gradient separator line */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ ...springTransition, delay: 0.45 }}
        className="mt-12 w-full max-w-md"
      >
        <div className="hero-gradient-line h-px w-full" />
      </motion.div>

      {/* CSS animation for the gradient line */}
      <style jsx>{`
        .hero-gradient-line {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(59, 130, 246, 0.15) 15%,
            rgba(59, 130, 246, 0.5) 35%,
            rgba(96, 165, 250, 0.7) 50%,
            rgba(59, 130, 246, 0.5) 65%,
            rgba(59, 130, 246, 0.15) 85%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: gradient-shift 4s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0% {
            background-position: 100% 0;
          }
          50% {
            background-position: 0% 0;
          }
          100% {
            background-position: 100% 0;
          }
        }
      `}</style>

      {/* Spacer */}
      <div className="mt-8" />
    </div>
  );
}
