"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Shield, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroVariantProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
}

const CAPABILITIES = [
  {
    icon: Fingerprint,
    title: "Identity Capture",
    description:
      "400+ platforms scraped. Your identity assembled automatically.",
  },
  {
    icon: Shield,
    title: "Cryptographic Proof",
    description:
      "Blockchain-anchored ownership. Tamper-proof certification.",
  },
  {
    icon: Briefcase,
    title: "Automated Licensing",
    description:
      "Deals negotiated. Revenue collected. You control the terms.",
  },
] as const;

export function HeroVariant3({
  onRequestAccess,
  onHowItWorks,
}: HeroVariantProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[oklch(0.11_0.015_262)]">
      {/* Asymmetric radial glow — shifted left */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 30% 50%, rgba(59,130,246,0.09) 0%, transparent 70%)",
        }}
      />

      {/* Split layout */}
      <div className="relative z-10 flex min-h-[100dvh] items-center">
        {/* Left — Text content (55%) */}
        <div className="flex w-full flex-col justify-center px-8 py-24 sm:px-12 lg:w-[55%] lg:pl-20 lg:pr-12 xl:pl-28">
          {/* Accent label */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6 text-xs font-semibold uppercase tracking-[0.12em] text-primary/60"
          >
            The Vault for AI Identity
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="mb-7 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "'Satoshi', sans-serif" }}
          >
            Your identity.
            <br />
            Your rules.
            <br />
            Your revenue.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
            className="mb-10 max-w-md text-base leading-relaxed text-white/40"
          >
            Capture, certify, and license your digital twin. Brands license
            access. You set every guardrail.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col items-start gap-4"
          >
            <Button
              onClick={onRequestAccess}
              className="cursor-pointer rounded-xl bg-blue-600 px-8 py-6 text-base font-medium text-white shadow-lg shadow-primary/20 transition-[transform,box-shadow,background-color] duration-150 hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.97]"
            >
              Request Early Access &rarr;
            </Button>
            <button
              onClick={onHowItWorks}
              className="cursor-pointer text-sm text-white/40 transition-colors duration-200 hover:text-white/60"
            >
              See how it works &rarr;
            </button>
          </motion.div>
        </div>

        {/* Right — Capability cards (45%) */}
        <div className="hidden w-[45%] flex-col justify-center gap-4 pr-12 lg:flex xl:pr-20">
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  damping: 22,
                  stiffness: 200,
                  delay: 0.3 + i * 0.1,
                }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 transition-[border-color,box-shadow] duration-300 hover:border-white/[0.12] hover:shadow-[0_0_24px_-6px_rgba(59,130,246,0.12)]"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {cap.title}
                  </h3>
                </div>
                <p className="text-[13px] leading-relaxed text-white/40">
                  {cap.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile capability cards — stacked below content on smaller screens */}
      <div className="flex flex-col gap-3 px-8 pb-16 sm:px-12 lg:hidden">
        {CAPABILITIES.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                damping: 22,
                stiffness: 200,
                delay: 0.3 + i * 0.1,
              }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {cap.title}
                </h3>
              </div>
              <p className="text-[13px] leading-relaxed text-white/40">
                {cap.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
