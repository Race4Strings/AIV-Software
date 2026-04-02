"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase, Search, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroFinalProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRequestAccess: () => void;
  onHowItWorks: () => void;
  onOverlayChange?: (open: boolean) => void;
}

const spring = { type: "spring" as const, damping: 25, stiffness: 300 };

const REVEAL_STEPS = [
  { icon: Search, label: "Discover", desc: "Your public presence assembled from across the web", num: "01" },
  { icon: Fingerprint, label: "Capture", desc: "Communication style, values, and personality structured", num: "02" },
  { icon: Brain, label: "Build", desc: "Identity engine models a licensable digital profile", num: "03" },
  { icon: Shield, label: "Certify", desc: "Blockchain-anchored cryptographic proof of ownership", num: "04" },
  { icon: Lock, label: "Protect", desc: "Continuous misuse monitoring and enforcement", num: "05" },
  { icon: Briefcase, label: "License", desc: "Automated deal management with terms you control", num: "06" },
];

const PROCESS_ICONS = [
  { word: "Capture", icon: Fingerprint },
  { word: "Protect", icon: Shield },
  { word: "License", icon: Briefcase },
] as const;

export function HeroFinal({ onRequestAccess, onOverlayChange }: HeroFinalProps) {
  const [showMotion, setShowMotion] = useState(false);
  const [motionStage, setMotionStage] = useState(0);
  // 0 = standard, 1 = premium
  const [animStyle, setAnimStyle] = useState(0);

  useEffect(() => { onOverlayChange?.(showMotion); }, [showMotion, onOverlayChange]);

  useEffect(() => {
    if (!showMotion) return;
    setMotionStage(0);
    const t1 = setTimeout(() => setMotionStage(1), 1200);
    const t2 = setTimeout(() => setMotionStage(2), 3200);
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.3 }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-medium text-white/50 tracking-widest uppercase">Identity Infrastructure</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.5 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-7">
          Own Your Digital Identity
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.7 }}
          className="text-lg sm:text-xl text-white/50 max-w-[560px] mb-10 leading-relaxed">
          Capture, certify, and license your digital identity — with full control over every guardrail and every deal. Built for athletes, musicians, actors, executives, and creators.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.9 }}
          className="pointer-events-auto flex flex-col items-center gap-4">
          <Button onClick={onRequestAccess}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-base font-medium rounded-xl shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer">
            Request Early Access &rarr;
          </Button>
          <button onClick={() => setShowMotion(true)}
            className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider pointer-events-auto">
            See how it works &rarr;
          </button>
        </motion.div>

        <div className="mt-16" />
      </div>

      {/* ─── Motion Overlay ─── */}
      <AnimatePresence>
        {showMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[oklch(0.05_0.008_262)]"
          >
            {/* Close */}
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

            {/* Animation style toggle */}
            <div className="absolute top-6 right-6 flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-1 py-0.5 pointer-events-auto z-10">
              <button onClick={() => { setAnimStyle(0); setShowMotion(false); setTimeout(() => setShowMotion(true), 100); }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wider transition-all duration-200 cursor-pointer ${animStyle === 0 ? "bg-white/10 text-white/70" : "text-white/30 hover:text-white/50"}`}>
                Standard
              </button>
              <button onClick={() => { setAnimStyle(1); setShowMotion(false); setTimeout(() => setShowMotion(true), 100); }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wider transition-all duration-200 cursor-pointer ${animStyle === 1 ? "bg-white/10 text-white/70" : "text-white/30 hover:text-white/50"}`}>
                Premium
              </button>
            </div>

            <div className="max-w-4xl w-full px-6">
              {animStyle === 0 ? (
                /* ─── STANDARD ANIMATION ─── */
                <AnimatePresence mode="wait">
                  {motionStage === 0 && (
                    <motion.div key="s0" className="flex items-center justify-center gap-12"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                      {PROCESS_ICONS.map((s, i) => (
                        <motion.div key={s.word} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ ...spring, delay: 0.2 + i * 0.2 }}>
                          <s.icon className="h-10 w-10 text-white/25" />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                  {motionStage === 1 && (
                    <motion.div key="s1" className="flex items-center justify-center gap-8"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                      {PROCESS_ICONS.map((s, i) => (
                        <motion.div key={s.word} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ ...spring, delay: i * 0.15 }} className="flex items-center gap-3">
                          <s.icon className="h-7 w-7 text-white/30" />
                          <span className="text-xl text-white/50 tracking-wider font-medium">{s.word}.</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                  {motionStage >= 2 && (
                    <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                      <p className="text-center text-xs text-white/25 mb-8 tracking-[0.15em] uppercase">How It Works</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {REVEAL_STEPS.map((item, i) => (
                          <motion.div key={item.label} initial={{ opacity: 0, y: 16, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: i * 0.1 }}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-200">
                            <div className="flex items-center gap-2.5 mb-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                                <item.icon className="h-4 w-4 text-white/30" />
                              </div>
                              <span className="text-sm text-white/50 font-medium">{item.label}</span>
                            </div>
                            <p className="text-[12px] text-white/30 leading-relaxed">{item.desc}</p>
                          </motion.div>
                        ))}
                      </div>
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.6 }} className="text-center mt-10">
                        <Button onClick={() => { setShowMotion(false); onRequestAccess(); }}
                          className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-8 py-5 text-sm font-medium rounded-xl shadow-lg shadow-primary/15 active:scale-[0.97] cursor-pointer">
                          Request Early Access &rarr;
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                /* ─── PREMIUM ANIMATION ─── */
                <AnimatePresence mode="wait">
                  {motionStage === 0 && (
                    <motion.div key="p0" className="flex flex-col items-center"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                      {/* Cinematic title */}
                      <motion.p initial={{ opacity: 0, letterSpacing: "0.5em" }}
                        animate={{ opacity: 1, letterSpacing: "0.3em" }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="text-[10px] text-white/20 uppercase font-medium mb-12">
                        How It Works
                      </motion.p>
                      {/* Three icons with connecting lines */}
                      <div className="flex items-center gap-0">
                        {PROCESS_ICONS.map((s, i) => (
                          <div key={s.word} className="flex items-center">
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.3 + i * 0.25 }}
                              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"
                            >
                              <s.icon className="h-7 w-7 text-white/30" />
                            </motion.div>
                            {i < 2 && (
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.4, delay: 0.6 + i * 0.25 }}
                                className="w-12 h-px bg-gradient-to-r from-white/10 to-white/10 origin-left mx-2"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {motionStage === 1 && (
                    <motion.div key="p1" className="flex flex-col items-center"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                        className="text-[10px] text-white/20 uppercase font-medium tracking-[0.3em] mb-10">
                        How It Works
                      </motion.p>
                      {/* Icons with words, connected */}
                      <div className="flex items-center gap-0">
                        {PROCESS_ICONS.map((s, i) => (
                          <div key={s.word} className="flex items-center">
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ ...spring, delay: i * 0.15 }}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                                <s.icon className="h-6 w-6 text-white/30" />
                              </div>
                              <span className="text-sm text-white/50 tracking-wider font-medium">{s.word}</span>
                            </motion.div>
                            {i < 2 && (
                              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 + i * 0.15 }}
                                className="w-16 h-px bg-gradient-to-r from-white/5 via-white/10 to-white/5 origin-left mx-4 -mt-6" />
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {motionStage >= 2 && (
                    <motion.div key="p2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                      <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-center text-[10px] text-white/20 uppercase font-medium tracking-[0.3em] mb-10">
                        How It Works
                      </motion.p>

                      {/* Premium grid — numbered steps with glow accents */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {REVEAL_STEPS.map((item, i) => (
                          <motion.div key={item.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", damping: 20, stiffness: 180, delay: i * 0.12 }}
                            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-300"
                          >
                            {/* Step number */}
                            <span className="absolute top-4 right-4 text-[10px] font-mono text-white/10 tracking-wider">{item.num}</span>

                            {/* Icon in container */}
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4 group-hover:bg-white/[0.06] transition-colors duration-300">
                              <item.icon className="h-5 w-5 text-white/25 group-hover:text-white/40 transition-colors duration-300" />
                            </div>

                            <h3 className="text-sm font-semibold text-white/60 mb-2 tracking-wide">{item.label}</h3>
                            <p className="text-[12px] text-white/25 leading-relaxed group-hover:text-white/35 transition-colors duration-300">{item.desc}</p>

                            {/* Subtle bottom accent line */}
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.6, delay: 0.8 + i * 0.08 }}
                              className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent origin-left"
                            />
                          </motion.div>
                        ))}
                      </div>

                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: 0.8 }} className="text-center mt-12">
                        <Button onClick={() => { setShowMotion(false); onRequestAccess(); }}
                          className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-10 py-5 text-sm font-medium rounded-xl shadow-lg shadow-primary/15 active:scale-[0.97] cursor-pointer tracking-wide">
                          Request Early Access &rarr;
                        </Button>
                        <p className="text-[10px] text-white/15 mt-4 tracking-wider">Identity infrastructure for the AI economy</p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
