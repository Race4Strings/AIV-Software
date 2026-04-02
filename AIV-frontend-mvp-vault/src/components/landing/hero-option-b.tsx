"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export interface HeroOptionProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  auroraOpacity: number;
}

const BOTTOM_WORDS = ["Capture", "Certify", "Protect", "License"] as const;

const STATEMENT_WORDS = ["Capture.", "Certify.", "Protect.", "License."] as const;

export function HeroOptionB({
  onRequestAccess,
  onHowItWorks,
}: HeroOptionProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      {/* Main centered content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0 }}
          className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-10 backdrop-blur-sm"
        >
          <Lock className="h-3.5 w-3.5 text-white/50" />
          <span className="text-xs font-medium text-white/50 tracking-widest uppercase">
            Identity Infrastructure
          </span>
        </motion.div>

        {/* "A" letterform anchor with pulsing border */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] hero-option-b-anchor"
        >
          <span className="text-xl font-bold text-white/80 select-none">
            A
          </span>
        </motion.div>

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-6 max-w-lg text-center text-sm font-medium uppercase tracking-[0.1em] text-white/30 sm:text-base"
        >
          Identity Infrastructure for the AI Economy
        </motion.p>

        {/* Supporting line — staggered words */}
        <div className="mb-14 flex items-center justify-center gap-3 text-sm tracking-wider text-white/20">
          {STATEMENT_WORDS.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.15 }}
            >
              {word}
            </motion.span>
          ))}
        </div>

        {/* CTA — outline only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={onRequestAccess}
            className="cursor-pointer rounded-xl border border-white/10 bg-transparent px-8 py-4 text-sm font-medium uppercase tracking-wider text-white transition-[border-color,background-color] duration-200 hover:border-white/20 hover:bg-white/[0.03]"
          >
            Request Early Access
          </button>

          {/* How it works link */}
          <button
            onClick={onHowItWorks}
            className="mt-6 cursor-pointer bg-transparent border-none text-xs text-white/25 transition-colors duration-200 hover:text-white/40"
          >
            Learn how it works &rarr;
          </button>
        </motion.div>
      </div>

      {/* Bottom grounding bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.8 }}
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

      {/* Pulsing border animation for the "A" anchor */}
      <style jsx>{`
        .hero-option-b-anchor {
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: border-pulse 4s ease-in-out infinite;
        }

        @keyframes border-pulse {
          0%,
          100% {
            border-color: rgba(255, 255, 255, 0.08);
          }
          50% {
            border-color: rgba(255, 255, 255, 0.15);
          }
        }
      `}</style>
    </div>
  );
}
