"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Brain, Shield, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalCard, MobileSignalCarousel } from "@/components/landing/signal-card";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";
import Aurora from "@/components/ui/Aurora";
import { HeroVariant1 } from "@/components/landing/hero-variant-1";
import { HeroVariant2 } from "@/components/landing/hero-variant-2";
import { HeroVariant3 } from "@/components/landing/hero-variant-3";
import { HeroVariant4 } from "@/components/landing/hero-variant-4";

const HOW_IT_WORKS_STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Discover",
    description: "We assemble your public presence — interviews, social media, articles, and media appearances — into a structured identity foundation.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Build",
    description: "Our identity engine models your communication style, values, and personality into a structured, licensable profile.",
  },
  {
    icon: Shield,
    step: "03",
    title: "Protect",
    description: "Your identity is verified with blockchain-anchored proof of ownership and continuous misuse monitoring.",
  },
  {
    icon: Briefcase,
    step: "04",
    title: "License",
    description: "Brands and platforms license your identity through automated deal management. You earn recurring revenue.",
  },
];

type HeroVariant = 1 | 2 | 3 | 4;

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [activeVariant, setActiveVariant] = useState<HeroVariant>(1);

  useEffect(() => {
    if (!howItWorksOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHowItWorksOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [howItWorksOpen]);

  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user && JSON.parse(user)?.id) {
        router.replace("/dashboard");
      }
    } catch {}
  }, [router]);

  function handleRequestAccess() {
    setModalInitialStep(0);
    setModalOpen(true);
  }

  const variantProps = {
    containerRef,
    onRequestAccess: handleRequestAccess,
    onHowItWorks: () => setHowItWorksOpen(true),
  };

  // Variant 4 has its own background — skip Aurora for it
  const showAurora = activeVariant !== 4;

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[100dvh] overflow-hidden ${activeVariant === 4 ? "bg-[oklch(0.08_0.01_262)]" : "bg-[oklch(0.11_0.015_262)]"}`}
    >
      {/* Aurora animated background (not for Variant 4) */}
      {showAurora && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-45">
          <Aurora colorStops={["#0f2a5e", "#3b82f6", "#0f2a5e"]} amplitude={1.0} blend={0.6} speed={0.4} />
        </div>
      )}

      {/* Subtle radial glow (not for Variant 4) */}
      {showAurora && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: activeVariant === 3
              ? "radial-gradient(ellipse 40% 60% at 30% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)"
              : "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(59,130,246,0.08) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Variant 4 has its own subtle bottom gradient */}
      {activeVariant === 4 && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: "linear-gradient(to top, rgba(59,130,246,0.03) 0%, transparent 50%)",
          }}
        />
      )}

      <div className="max-w-[1920px] mx-auto relative">

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/aiv.svg" alt="AIV" width={72} height={24} priority />
          </Link>
          <button
            onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
            className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            Sign In
          </button>
        </header>

        {/* Signal Cards — Desktop (Variants 1 & 2 only) */}
        {(activeVariant === 1 || activeVariant === 2) && (
          <div className="hidden lg:block">
            <SignalCard side="left" />
            <SignalCard side="right" />
          </div>
        )}

        {/* Hero Content — switches based on active variant */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeVariant}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeVariant === 1 && <HeroVariant1 {...variantProps} />}
            {activeVariant === 2 && <HeroVariant2 {...variantProps} />}
            {activeVariant === 3 && <HeroVariant3 {...variantProps} />}
            {activeVariant === 4 && <HeroVariant4 {...variantProps} />}
          </motion.div>
        </AnimatePresence>

        {/* Signal Cards — Mobile (Variants 1 & 2 only) */}
        {(activeVariant === 1 || activeVariant === 2) && (
          <div className="lg:hidden">
            <MobileSignalCarousel />
          </div>
        )}

        {/* ─── Variant Selector (floating pill bar) ─── */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-black/80 backdrop-blur-xl px-2 py-1.5 shadow-2xl shadow-black/40">
          {([1, 2, 3, 4] as HeroVariant[]).map((v) => (
            <button
              key={v}
              onClick={() => setActiveVariant(v)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeVariant === v
                  ? "bg-white text-black shadow-sm"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              }`}
            >
              {v === 1 && "Corrected"}
              {v === 2 && "Elevated"}
              {v === 3 && "Asymmetric"}
              {v === 4 && "Minimal"}
            </button>
          ))}
        </div>

        {/* How It Works Modal */}
        <AnimatePresence>
          {howItWorksOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label="How It Works"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setHowItWorksOpen(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[oklch(0.13_0.015_262)]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-8 pt-8 pb-2">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How It Works</h2>
                    <p className="mt-2 text-sm text-white/40">
                      From discovery to revenue — your identity, captured, protected, and licensed.
                    </p>
                  </div>
                  <button
                    onClick={() => setHowItWorksOpen(false)}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors duration-150 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-8 py-6">
                  {HOW_IT_WORKS_STEPS.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 + i * 0.08 }}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-[11px] font-mono text-white/25 tracking-wider">{item.step}</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                        <p className="text-[13px] text-white/45 leading-relaxed">{item.description}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="px-8 pb-8 pt-2">
                  <Button
                    onClick={() => { setHowItWorksOpen(false); handleRequestAccess(); }}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-5 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer"
                  >
                    Request Early Access &rarr;
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <EarlyAccessModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialStep={modalInitialStep}
        />

      </div>
    </div>
  );
}
