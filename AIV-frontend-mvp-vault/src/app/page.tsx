"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Search, Brain, Shield, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import VariableProximity from "@/components/ui/VariableProximity";
import { SignalCard, MobileSignalCarousel } from "@/components/landing/signal-card";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";

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

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Check if already authenticated → redirect to dashboard
  useEffect(() => {
    try {
      const user = localStorage.getItem("user");
      if (user && JSON.parse(user)?.id) {
        router.replace("/dashboard");
      }
    } catch {
      // Not logged in
    }
  }, [router]);

  function handleRequestAccess() {
    setModalInitialStep(0);
    setModalOpen(true);
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ backgroundColor: "#041030" }}
    >
      {/* Subtle radial glow behind hero */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <Link href="/">
          <img src="/aiv.svg" alt="AIV" className="h-6 w-auto" />
        </Link>
        <button
          onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
          className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
        >
          Sign In
        </button>
      </header>

      {/* Signal Cards — Desktop (floating on sides) */}
      <div className="hidden lg:block">
        <SignalCard side="left" />
        <SignalCard side="right" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
        {/* Identity Infrastructure Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm"
        >
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-white/60 tracking-widest uppercase">Identity Infrastructure</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-7"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight">
            <VariableProximity
              label="Own Your Digital Identity"
              fromFontVariationSettings="'wght' 400"
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
          className="text-lg sm:text-xl text-white/45 max-w-[540px] mb-12 leading-relaxed"
        >
          AIV certifies, protects, and helps you monetize your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and a global licensing rail that generates recurring revenue on autopilot.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={handleRequestAccess}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-500/30"
          >
            Request Early Access &rarr;
          </Button>
          <Button
            onClick={() => setHowItWorksOpen(true)}
            variant="outline"
            className="border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 hover:bg-white/[0.04] px-8 py-6 text-base font-medium rounded-xl bg-transparent transition-all duration-200"
          >
            See How It Works
          </Button>
        </motion.div>

        {/* Spacer */}
        <div className="mt-16" />
      </div>

      {/* Signal Cards — Mobile (bottom carousel) */}
      <div className="lg:hidden">
        <MobileSignalCarousel />
      </div>

      {/* How It Works Modal */}
      <AnimatePresence>
        {howItWorksOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setHowItWorksOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#0a1a3a]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-2">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How It Works</h2>
                  <p className="mt-2 text-sm text-white/40">
                    From discovery to revenue — your identity, captured, protected, and licensed.
                  </p>
                </div>
                <button
                  onClick={() => setHowItWorksOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors duration-150"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Steps Grid */}
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                          <Icon className="h-4.5 w-4.5 text-blue-400" />
                        </div>
                        <span className="text-[11px] font-mono text-white/25 tracking-wider">{item.step}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                      <p className="text-[13px] text-white/45 leading-relaxed">{item.description}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Modal Footer CTA */}
              <div className="px-8 pb-8 pt-2">
                <Button
                  onClick={() => { setHowItWorksOpen(false); handleRequestAccess(); }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 text-base font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-200"
                >
                  Request Early Access &rarr;
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Early Access Modal */}
      <EarlyAccessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStep={modalInitialStep}
      />
    </div>
  );
}
