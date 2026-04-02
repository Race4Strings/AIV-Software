"use client";

import { motion } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase } from "lucide-react";

export interface HeroOptionProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  auroraOpacity: number;
}

const CAPABILITY_ICONS = [
  { Icon: Fingerprint, label: "Capture" },
  { Icon: Shield, label: "Certify" },
  { Icon: Briefcase, label: "License" },
] as const;

export function HeroOptionC({
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

        {/* "A" letterform anchor with rotating border trace */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12 relative"
        >
          <div className="hero-option-c-anchor relative flex h-14 w-14 items-center justify-center rounded-2xl">
            <span className="text-xl font-bold text-white/80 select-none relative z-10">
              A
            </span>
          </div>
        </motion.div>

        {/* Statement */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-6 max-w-xl text-center text-sm font-medium uppercase tracking-[0.08em] text-white/30 sm:text-base"
        >
          Where High-Profile Talent Captures, Certifies, and Licenses Their
          Digital Identity
        </motion.p>

        {/* Supporting line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mb-14 text-center text-sm text-white/25"
        >
          The first identity infrastructure purpose-built for the AI economy.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={onRequestAccess}
            className="cursor-pointer rounded-xl border border-white/[0.12] bg-transparent px-8 py-4 text-sm font-medium uppercase tracking-wider text-white transition-[border-color,background-color] duration-200 hover:border-primary/30 hover:bg-primary/[0.03]"
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

        {/* Capability icons grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="mt-14 flex items-center gap-4"
        >
          {CAPABILITY_ICONS.map(({ Icon, label }, i) => (
            <motion.div
              key={label}
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.6,
              }}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.04]"
              title={label}
            >
              <Icon className="h-4 w-4 text-white/20" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Rotating border trace animation for the "A" anchor */}
      <style jsx>{`
        .hero-option-c-anchor {
          background: rgba(255, 255, 255, 0.03);
          position: relative;
          overflow: hidden;
        }

        .hero-option-c-anchor::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            transparent 60%,
            rgba(255, 255, 255, 0.15) 75%,
            rgba(255, 255, 255, 0.08) 85%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: border-rotate 8s linear infinite;
        }

        .hero-option-c-anchor::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        @keyframes border-rotate {
          to {
            --angle: 360deg;
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
