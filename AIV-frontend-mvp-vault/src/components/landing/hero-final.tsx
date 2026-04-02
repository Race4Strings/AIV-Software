"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase, Search, Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Aurora from "@/components/ui/Aurora";

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
  const [overlayAurora, setOverlayAurora] = useState(0);
  const overlayMouseRef = useRef({ x: 0, y: 0, time: 0, dx: 0, dy: 0 });
  const overlayScoreRef = useRef(0);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOverlayMouse = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const last = overlayMouseRef.current;
    const dt = now - last.time;
    if (dt > 0 && dt < 100) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      const rev = ((dx > 0 && last.dx < 0) || (dx < 0 && last.dx > 0) || (dy > 0 && last.dy < 0) || (dy < 0 && last.dy > 0));
      const speedBoost = Math.min(0.4, speed * 0.15);
      const shakeBoost = rev && speed > 0.3 ? 0.6 : 0;
      overlayScoreRef.current = Math.min(5, overlayScoreRef.current * 0.85 + speedBoost + shakeBoost);
      overlayMouseRef.current = { x: e.clientX, y: e.clientY, time: now, dx, dy };
    } else {
      overlayMouseRef.current = { ...last, x: e.clientX, y: e.clientY, time: now };
    }
    setOverlayAurora(Math.min(0.85, overlayScoreRef.current * 0.22));
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => { overlayScoreRef.current = 0; setOverlayAurora(0); }, 600);
  }, []);

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
            onMouseMove={handleOverlayMouse}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[oklch(0.06_0.008_262)]"
          >
            {/* Aurora inside overlay */}
            <div className="pointer-events-none absolute inset-0 z-0"
              style={{ opacity: overlayAurora, transition: overlayAurora > 0.1 ? "opacity 300ms ease-out" : "opacity 800ms ease-in" }}>
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

            <div className="max-w-4xl w-full px-6">
              <AnimatePresence mode="wait">
                {/* Stage 0: 3 icons — fade in/out (no rising) */}
                {motionStage === 0 && (
                  <motion.div key="s0" className="flex items-center justify-center gap-12"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}>
                    {PROCESS_ICONS.map((s, i) => (
                      <motion.div key={s.word}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...spring, delay: 0.2 + i * 0.2 }}>
                        <s.icon className="h-10 w-10 text-white/25" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Stage 1: icons + words — fade in/out (no rising) */}
                {motionStage === 1 && (
                  <motion.div key="s1" className="flex items-center justify-center gap-8"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}>
                    {PROCESS_ICONS.map((s, i) => (
                      <motion.div key={s.word}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: i * 0.15 }}
                        className="flex items-center gap-3">
                        <s.icon className="h-7 w-7 text-white/30" />
                        <span className="text-xl text-white/50 tracking-wider font-medium">{s.word}.</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Stage 2: Final grid — sleek standard style + numbered steps + tagline */}
                {motionStage >= 2 && (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                      className="text-center text-xs text-white/25 mb-8 tracking-[0.15em] uppercase">
                      How It Works
                    </motion.p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {REVEAL_STEPS.map((item, i) => (
                        <motion.div key={item.label}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                          className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-200">
                          <span className="absolute top-3 right-3 text-[10px] font-mono text-white/10 tracking-wider">{item.num}</span>
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

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 }} className="text-center mt-10">
                      <Button onClick={() => { setShowMotion(false); onRequestAccess(); }}
                        className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-8 py-5 text-sm font-medium rounded-xl shadow-lg shadow-primary/15 active:scale-[0.97] cursor-pointer">
                        Request Early Access &rarr;
                      </Button>
                      <p className="text-[10px] text-white/15 mt-4 tracking-wider">Identity infrastructure for the AI economy</p>
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
