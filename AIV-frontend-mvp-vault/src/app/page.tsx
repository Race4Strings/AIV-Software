"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Brain, Shield, Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";
import { SignalNotifications, MobileSignalNotifications } from "@/components/landing/signal-notification";
import Aurora from "@/components/ui/Aurora";
import { HeroFinal } from "@/components/landing/hero-final";

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
    description: "Brands and platforms license your identity through automated deal management with terms you control.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Mouse-triggered Aurora with shake intensity
  const [auroraOpacity, setAuroraOpacity] = useState(0.05);
  const mouseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastMouseRef = useRef({ x: 0, y: 0, time: 0 });
  const velocityRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const last = lastMouseRef.current;
    const dt = now - last.time;

    if (dt > 0 && dt < 100) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      // Smooth velocity with decay
      velocityRef.current = velocityRef.current * 0.7 + speed * 0.3;
    }

    lastMouseRef.current = { x: e.clientX, y: e.clientY, time: now };

    // Map velocity to opacity: gentle movement = 0.2, fast shaking = 0.5, cap at 0.55
    const targetOpacity = Math.min(0.55, 0.15 + velocityRef.current * 0.3);
    setAuroraOpacity(targetOpacity);

    if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => {
      velocityRef.current = 0;
      setAuroraOpacity(0.05);
    }, 600);
  }, []);

  useEffect(() => {
    return () => { if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current); };
  }, []);

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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="dark relative min-h-[100dvh] overflow-hidden bg-[oklch(0.09_0.01_262)]"
    >
      {/* Mouse-reactive Aurora — brightness scales with mouse speed */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          opacity: auroraOpacity,
          transition: auroraOpacity > 0.1
            ? "opacity 400ms ease-out"
            : "opacity 1200ms ease-in",
        }}
      >
        <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
      </div>

      {/* Subtle static glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="max-w-[1920px] mx-auto relative">

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/aiv-light.svg" alt="AIV" width={36} height={14} priority className="opacity-70 hover:opacity-100 transition-opacity duration-200" />
          </Link>
          <button
            onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
            className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none tracking-wider uppercase"
          >
            Sign In
          </button>
        </header>

        {/* Signal Notifications — Desktop */}
        <SignalNotifications side="left" />
        <SignalNotifications side="right" />

        {/* Hero */}
        <HeroFinal
          containerRef={containerRef}
          onRequestAccess={handleRequestAccess}
          onHowItWorks={() => setHowItWorksOpen(true)}
        />

        {/* Signal Notifications — Mobile */}
        <MobileSignalNotifications />

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
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[oklch(0.11_0.012_262)]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-8 pt-8 pb-2">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">How It Works</h2>
                    <p className="mt-2 text-sm text-white/35">
                      From discovery to licensing — your identity, captured, protected, and monetized.
                    </p>
                  </div>
                  <button
                    onClick={() => setHowItWorksOpen(false)}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-8 py-6">
                  {HOW_IT_WORKS_STEPS.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary/70" />
                          </div>
                          <span className="text-[10px] font-mono text-white/20 tracking-wider">{item.step}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white/90 mb-1.5">{item.title}</h3>
                        <p className="text-[12px] text-white/35 leading-relaxed">{item.description}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="px-8 pb-8 pt-2">
                  <Button
                    onClick={() => { setHowItWorksOpen(false); handleRequestAccess(); }}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 text-sm font-medium rounded-xl shadow-lg shadow-primary/15 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer"
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
