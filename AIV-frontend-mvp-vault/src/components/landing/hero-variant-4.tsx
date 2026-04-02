"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";

interface HeroVariantProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
}

const BOTTOM_WORDS = ["Capture", "Certify", "Protect", "License"] as const;

export function HeroVariant4({
  onRequestAccess,
  onHowItWorks,
}: HeroVariantProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[oklch(0.08_0.01_262)]">
      {/* Subtle bottom gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(to top, rgba(59,130,246,0.03) 0%, transparent 40%)",
        }}
      />

      {/* Main centered content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {/* Extra top spacing for the "statement minimal" feel */}
        <div className="mt-8 sm:mt-12" />

        {/* "A" letterform anchor */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0 }}
          className="mb-12 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5"
        >
          <span className="text-2xl font-bold text-white/80 select-none">
            A
          </span>
        </motion.div>

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6 max-w-lg text-center text-sm font-medium uppercase tracking-[0.08em] text-white/35 sm:text-base"
        >
          Identity Infrastructure for the AI Economy
        </motion.p>

        {/* Supporting line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-14 text-center text-sm tracking-wider text-white/25"
        >
          Capture. Certify. Protect. License.
        </motion.p>

        {/* CTA — outline only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={onRequestAccess}
            className="cursor-pointer rounded-xl border border-white/12 bg-transparent px-8 py-4 text-sm font-medium uppercase tracking-wider text-white transition-[border-color,background-color] duration-200 hover:border-white/25 hover:bg-white/[0.03]"
          >
            Request Early Access
          </button>

          {/* How it works link */}
          <button
            onClick={onHowItWorks}
            className="mt-6 cursor-pointer text-xs text-white/25 transition-colors duration-200 hover:text-white/40"
          >
            Learn how it works &rarr;
          </button>
        </motion.div>
      </div>

      {/* Bottom grounding bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="relative z-10 flex items-center justify-center gap-6 border-t border-white/[0.04] px-6 py-5 sm:gap-10"
      >
        {BOTTOM_WORDS.map((word, i) => (
          <span
            key={word}
            className="text-[10px] uppercase tracking-[0.15em] text-white/15"
          >
            {i > 0 && (
              <span className="mr-6 sm:mr-10" aria-hidden="true">
                &middot;
              </span>
            )}
            {word}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
