"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Fingerprint, Shield, Briefcase, Search, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Aurora from "@/components/ui/Aurora";

export interface HeroFinalV2Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onOverlayChange?: (open: boolean) => void;
}

const smoothEase = [0.25, 0.1, 0.25, 1] as const;
const stagger = (delay: number) => ({ duration: 0.5, ease: smoothEase, delay });

const REVEAL_STEPS = [
  { icon: Search, label: "Discover", desc: "Your public presence assembled from across the web", num: "01", hoverColor: "text-blue-400", flashColor: "#3b82f6" },
  { icon: Fingerprint, label: "Capture", desc: "Communication style, values, and personality structured", num: "02", hoverColor: "text-purple-400", flashColor: "#8b5cf6" },
  { icon: Brain, label: "Build", desc: "Identity engine models a licensable digital profile", num: "03", hoverColor: "text-amber-400", flashColor: "#f59e0b" },
  { icon: Shield, label: "Certify", desc: "Blockchain-anchored cryptographic proof of ownership", num: "04", hoverColor: "text-emerald-400", flashColor: "#10b981" },
  { icon: Lock, label: "Protect", desc: "Continuous misuse monitoring and enforcement", num: "05", hoverColor: "text-red-400", flashColor: "#ef4444" },
  { icon: Briefcase, label: "License", desc: "Automated deal management with terms you control", num: "06", hoverColor: "text-green-400", flashColor: "#22c55e" },
];

const PROCESS_ICONS = [
  { word: "Capture", icon: Fingerprint, color: "#3b82f6" },
  { word: "Protect", icon: Shield, color: "#ef4444" },
  { word: "License", icon: Briefcase, color: "#10b981" },
] as const;

// Lock badge animation component
function AnimatedLockBadge() {
  const [hovered, setHovered] = useState(false);
  const [phase, setPhase] = useState<"lock" | "unlock" | "dot" | "settle">("lock");

  useEffect(() => {
    if (!hovered) { setPhase("lock"); return; }
    // Sequence: lock → unlock → cycling dot → settle green
    setPhase("unlock");
    const t1 = setTimeout(() => setPhase("dot"), 400);
    const t2 = setTimeout(() => setPhase("settle"), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hovered]);

  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm cursor-default pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-3.5 w-3.5 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "lock" && (
            <motion.div key="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Lock className="h-3.5 w-3.5 text-blue-400" />
            </motion.div>
          )}
          {phase === "unlock" && (
            <motion.div key="unlock" initial={{ opacity: 0, rotate: -15 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}>
              <Unlock className="h-3.5 w-3.5 text-blue-400" />
            </motion.div>
          )}
          {phase === "dot" && (
            <motion.div key="dot" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
              className="h-2.5 w-2.5 rounded-full animate-signal-dot-cycle" />
          )}
          {phase === "settle" && (
            <motion.div key="settle" initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          )}
        </AnimatePresence>
      </div>
      <span className="text-xs font-medium text-white/50 tracking-widest uppercase">Identity Infrastructure</span>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes signal-dot-cycle {
          0% { background-color: #3b82f6; }
          20% { background-color: #10b981; }
          40% { background-color: #ef4444; }
          60% { background-color: #f59e0b; }
          80% { background-color: #8b5cf6; }
          100% { background-color: #10b981; }
        }
        .animate-signal-dot-cycle { animation: signal-dot-cycle 1.5s ease-in-out; animation-fill-mode: forwards; }
      ` }} />
    </motion.div>
  );
}

// Enhancement 4+5: card with icon color on hover + scale/rotate
function HowItWorksCard({ item, index }: { item: typeof REVEAL_STEPS[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 + index * 0.1 }}
      className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-200 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/10 tracking-wider">{item.num}</span>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] transition-all duration-200"
          style={{ transform: hovered ? "scale(1.15) rotate(5deg)" : "scale(1) rotate(0deg)", backgroundColor: hovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)" }}>
          <Icon className="h-4 w-4 transition-colors duration-200" style={{ color: hovered ? item.flashColor : "rgba(255,255,255,0.3)" }} />
        </div>
        <span className="text-sm text-white/50 font-medium">{item.label}</span>
      </div>
      <p className="text-[12px] text-white/30 leading-relaxed">{item.desc}</p>
    </motion.div>
  );
}

export function HeroFinalV2({ onRequestAccess, onOverlayChange }: HeroFinalV2Props) {
  const [showMotion, setShowMotion] = useState(false);
  const [motionStage, setMotionStage] = useState(0);

  // Enhancement 3: Aurora driven by stage, not mouse
  const [overlayAurora, setOverlayAurora] = useState(0);

  useEffect(() => {
    if (!showMotion) { setOverlayAurora(0); return; }
    // Ease in aurora when overlay opens
    setOverlayAurora(0.35);
  }, [showMotion]);

  // Ease out aurora at final stage
  useEffect(() => {
    if (motionStage >= 2) {
      const t = setTimeout(() => setOverlayAurora(0), 400);
      return () => clearTimeout(t);
    }
  }, [motionStage]);

  useEffect(() => { onOverlayChange?.(showMotion); }, [showMotion, onOverlayChange]);

  useEffect(() => {
    if (!showMotion) return;
    setMotionStage(0);
    const t1 = setTimeout(() => setMotionStage(1), 1500);
    const t2 = setTimeout(() => setMotionStage(2), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showMotion]);

  useEffect(() => {
    if (!showMotion) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowMotion(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showMotion]);

  return (
    <>
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center pointer-events-none">
        {/* Enhancement 1: Animated lock badge */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0.3)}>
          <AnimatedLockBadge />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0.5)}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-7">
          Own Your Digital Identity
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0.7)}
          className="text-lg sm:text-xl text-white/50 max-w-[560px] mb-10 leading-relaxed">
          Capture, certify, and license your digital identity — with full control over every guardrail and every deal. Built for athletes, musicians, actors, executives, and creators.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0.9)}
          className="pointer-events-auto flex flex-col items-center gap-4">
          <Button onClick={onRequestAccess}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer">
            Request Early Access <span aria-hidden="true">&rarr;</span>
          </Button>
          <button onClick={() => setShowMotion(true)}
            className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider pointer-events-auto py-2 px-4">
            See how it works
          </button>
        </motion.div>
      </div>

      {/* Motion Overlay with enhancements */}
      <AnimatePresence>
        {showMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[oklch(0.06_0.008_262)]"
          >
            {/* Enhancement 3: Stage-driven aurora */}
            <div className="pointer-events-none absolute inset-0 z-0"
              style={{ opacity: overlayAurora, transition: "opacity 800ms ease-out" }}>
              <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
            </div>

            <div className="absolute top-6 left-6 flex items-center gap-3 pointer-events-auto z-10">
              <button onClick={() => setShowMotion(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-colors duration-150 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => setShowMotion(false)}
                className="text-xs text-white/25 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider">
                Back to home
              </button>
            </div>

            <div className="max-w-4xl w-full px-6 relative z-10">
              <AnimatePresence mode="wait">
                {/* Stage 0: Enhancement 2 — color flash on icons */}
                {motionStage === 0 && (
                  <motion.div key="s0" className="flex items-center justify-center gap-14"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}>
                    {PROCESS_ICONS.map((s, i) => (
                      <motion.div key={s.word}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + i * 0.2 }}>
                        <motion.div
                          initial={{ color: s.color }}
                          animate={{ color: "rgba(255,255,255,0.25)" }}
                          transition={{ duration: 0.8, delay: 0.5 + i * 0.2 }}>
                          <s.icon className="h-10 w-10" style={{ color: "inherit" }} />
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {motionStage === 1 && (
                  <motion.div key="s1" className="flex items-center justify-center gap-10"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}>
                    {PROCESS_ICONS.map((s, i) => (
                      <motion.div key={s.word}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.15 }}
                        className="flex items-center gap-3">
                        <s.icon className="h-7 w-7 text-white/30" />
                        <span className="text-xl text-white/50 tracking-wider font-medium">{s.word}.</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Stage 2: Enhancements 4+5 — icon colors + hover animation */}
                {motionStage >= 2 && (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                      className="text-center text-xs text-white/25 mb-8 tracking-[0.15em] uppercase">
                      How It Works
                    </motion.p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {REVEAL_STEPS.map((item, i) => (
                        <HowItWorksCard key={item.label} item={item} index={i} />
                      ))}
                    </div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.7 }} className="text-center mt-10">
                      <Button onClick={() => { setShowMotion(false); onRequestAccess(); }}
                        className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 active:scale-[0.97] cursor-pointer">
                        Request Early Access <span aria-hidden="true">&rarr;</span>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
