"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Search, Brain, Shield, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import VariableProximity from "@/components/ui/VariableProximity";
import { SignalCard, MobileSignalCarousel } from "@/components/landing/signal-card";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);

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

  function handleSeeHowItWorks() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ backgroundColor: "#041030" }}
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <Link href="/">
          <img src="/aiv.svg" alt="AIV" className="h-6 w-auto" />
        </Link>
        <button
          onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
          className="text-sm font-medium text-white/60 hover:text-white transition-colors"
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
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-6"
        >
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-white/70 tracking-wide">Identity Infrastructure</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
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
          className="text-lg sm:text-xl text-white/50 max-w-xl mb-10 leading-relaxed"
        >
          Own your identity in the AI economy. AIV certifies, protects, and licenses your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and a global licensing rail that generates recurring revenue on autopilot.
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-blue-600/20"
          >
            Request Early Access &rarr;
          </Button>
          <Button
            onClick={handleSeeHowItWorks}
            variant="outline"
            className="border-white/15 text-white/70 hover:text-white hover:border-white/30 px-8 py-6 text-base font-medium rounded-xl bg-transparent"
          >
            See How It Works
          </Button>
        </motion.div>

        {/* Spacer — social proof removed until substantiated */}
        <div className="mt-16" />
      </div>

      {/* Signal Cards — Mobile (bottom carousel) */}
      <div className="lg:hidden">
        <MobileSignalCarousel />
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="relative z-10 px-6 py-24 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">How It Works</h2>
          <p className="mt-4 text-white/40 max-w-xl mx-auto">
            From discovery to revenue — your identity, captured, protected, and licensed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Search,
              step: "01",
              title: "Discover",
              description: "We scan 400+ platforms to assemble your public presence — interviews, social media, articles, and media appearances.",
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
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-xs font-mono text-white/30">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button
            onClick={handleRequestAccess}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-blue-600/20"
          >
            Request Early Access &rarr;
          </Button>
        </div>
      </div>

      {/* Early Access Modal */}
      <EarlyAccessModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStep={modalInitialStep}
      />
    </div>
  );
}
