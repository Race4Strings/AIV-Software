"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// Note: overlay aurora has unique lifecycle (disabled until stage 2, starts at 0)
// so it uses its own shake detection rather than the shared useShakeDetection hook
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Shield, Briefcase, Search, Brain, X } from "lucide-react";
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
  { icon: Search, label: "Discover", desc: "Your public presence assembled from across the web", num: "01", color: "#3b82f6" },
  { icon: Fingerprint, label: "Capture", desc: "Communication style, values, and personality structured", num: "02", color: "#8b5cf6" },
  { icon: Brain, label: "Build", desc: "Identity engine models a licensable digital profile", num: "03", color: "#f59e0b" },
  { icon: Shield, label: "Certify", desc: "Blockchain-anchored cryptographic proof of ownership", num: "04", color: "#10b981" },
  { icon: Lock, label: "Protect", desc: "Continuous misuse monitoring and enforcement", num: "05", color: "#ef4444" },
  { icon: Briefcase, label: "License", desc: "Automated deal management with terms you control", num: "06", color: "#22c55e" },
];

const PROCESS_ICONS = [
  { word: "Capture", icon: Fingerprint, color: "#3b82f6" },
  { word: "Protect", icon: Shield, color: "#ef4444" },
  { word: "License", icon: Briefcase, color: "#10b981" },
] as const;

// Lock animation — ONE icon, CSS transforms, no icon swapping.
// Lock rotates up-left to "open", then down-left to "close", then
// crossfades into color dot → green pulse. No AnimatePresence for
// the lock motion = no flash, no fidget.
function AnimatedLockBadge() {
  const [hovered, setHovered] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<"idle" | "opening" | "closing" | "colors" | "green">("idle");
  const [hoverCount, setHoverCount] = useState(0); // forces CSS animation restart

  useEffect(() => {
    if (!hovered) { setPhase("idle"); return; }
    setHoverCount(c => c + 1);
    setPhase("opening");
    const t1 = setTimeout(() => setPhase("closing"), 300);
    const t2 = setTimeout(() => setPhase("colors"), 600);
    // Purple arrives at 75% of 1.6s: 600 + 200 + 1200 = 2000ms. Green transitions over 375ms (same beat).
    const t3 = setTimeout(() => setPhase("green"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [hovered]);

  const showLock = phase === "idle" || phase === "opening" || phase === "closing";
  const showDot = phase === "colors" || phase === "green";

  // Lock transform based on phase
  const lockTransform = phase === "opening"
    ? "rotate(-12deg) translateY(-1px)" // shackle lifts up-left
    : phase === "closing"
      ? "rotate(4deg) translateY(0.5px)" // shackle comes down-left
      : "rotate(0deg) translateY(0px)"; // idle

  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 mb-8 backdrop-blur-sm cursor-default pointer-events-auto"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        // Mobile tap: activate then auto-dismiss after 3s
        setHovered(true);
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => setHovered(false), 3000);
      }}
    >
      <div className="relative h-3.5 w-3.5">
        {/* Lock icon — subtle pop-out when transitioning to dot, pop-in when returning */}
        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out"
          style={{
            opacity: showLock ? 1 : 0,
            transform: showLock ? lockTransform : `${lockTransform} scale(0.6)`,
          }}>
          <Lock className="h-3.5 w-3.5 text-blue-400" />
        </div>
        {/* Color dot — scale-in, color cycle, then crossfade to green */}
        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out"
          style={{
            opacity: showDot ? 1 : 0,
            transform: showDot ? "scale(1)" : "scale(0)",
          }}>
          <div key={hoverCount} className="h-2.5 w-2.5 rounded-full v2-dot-all" />
        </div>
      </div>
      <span className="text-xs font-medium text-white/50 tracking-widest uppercase">Identity Infrastructure</span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes v2-colors{0%{background:#3b82f6;box-shadow:none}20%{background:#ef4444;box-shadow:none}40%{background:#f59e0b;box-shadow:none}60%{background:#8b5cf6;box-shadow:none}80%,100%{background:#34d399;box-shadow:0 0 6px rgba(16,185,129,0.5)}}
        @keyframes v2-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
        .v2-dot-all{animation:v2-colors 2s linear 0.2s forwards,v2-breathe 2s ease-in-out 2.2s infinite}
      ` }} />
    </motion.div>
  );
}

// Card with hover color + auto-flash on mount
function HowItWorksCard({ item, index, autoFlash }: { item: typeof REVEAL_STEPS[number]; index: number; autoFlash: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [tapActive, setTapActive] = useState(false);
  const Icon = item.icon;

  useEffect(() => {
    if (!autoFlash) return;
    const t1 = setTimeout(() => setFlashActive(true), index * 250);
    const t2 = setTimeout(() => setFlashActive(false), index * 250 + 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [autoFlash, index]);

  const showColor = hovered || flashActive || tapActive;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 + index * 0.1 }}
      className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors duration-200 cursor-default"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onTouchEnd={(e) => { e.preventDefault(); setTapActive(true); setTimeout(() => setTapActive(false), 3000); }}>
      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/10 tracking-wider">{item.num}</span>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-[transform,background-color] duration-300 ease-out"
          style={{ willChange: "transform", transformOrigin: "center center", transform: showColor ? "scale(1.2) rotate(8deg) translateY(-2px)" : "scale(1) rotate(0deg) translateY(0px)", backgroundColor: showColor ? `${item.color}15` : "rgba(255,255,255,0.04)" }}>
          <Icon className="h-4 w-4 transition-colors duration-300" style={{ color: showColor ? item.color : "rgba(255,255,255,0.3)" }} />
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
  const [cardFlashTriggered, setCardFlashTriggered] = useState(false);

  // Aurora for overlay (mouse-driven, same as landing)
  const [overlayAurora, setOverlayAurora] = useState(0);
  const overlayMouseRef = useRef({ x: 0, y: 0, time: 0, dx: 0, dy: 0 });
  const overlayScoreRef = useRef(0);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOverlayMouse = useCallback((e: React.MouseEvent) => {
    // Only interactive aurora at final stage (stage 2+)
    if (motionStage < 2) return;
    const now = Date.now();
    const last = overlayMouseRef.current;
    const dt = now - last.time;
    if (dt > 0 && dt < 100) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      const rev = ((dx > 0 && last.dx < 0) || (dx < 0 && last.dx > 0) || (dy > 0 && last.dy < 0) || (dy < 0 && last.dy > 0));
      overlayScoreRef.current = Math.min(5, overlayScoreRef.current * 0.88 + Math.min(0.5, speed * 0.2) + (rev && speed > 0.08 ? 0.9 : 0));
      overlayMouseRef.current = { x: e.clientX, y: e.clientY, time: now, dx, dy };
    } else {
      overlayMouseRef.current = { ...last, x: e.clientX, y: e.clientY, time: now };
    }
    setOverlayAurora(Math.min(0.85, 0.25 + overlayScoreRef.current * 0.18));
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => { overlayScoreRef.current = 0; setOverlayAurora(0.25); }, 600);
  }, [motionStage]);

  useEffect(() => { onOverlayChange?.(showMotion); }, [showMotion, onOverlayChange]);

  useEffect(() => {
    if (!showMotion) { setCardFlashTriggered(false); setOverlayAurora(0); return; }
    setMotionStage(0);
    setOverlayAurora(0); // Start dark (fade to black)
    const t1 = setTimeout(() => setMotionStage(1), 1500);
    const t2 = setTimeout(() => {
      setMotionStage(2);
      setCardFlashTriggered(true);
    }, 3800);
    // Aurora comes back AFTER the card flash sequence concludes (~2.5s after stage 2)
    const t3 = setTimeout(() => {
      setOverlayAurora(0.25);
    }, 3800 + 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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

      {/* Motion Overlay WITH aurora */}
      <AnimatePresence>
        {showMotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            onMouseMove={handleOverlayMouse}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[oklch(0.06_0.008_262)] pointer-events-auto"
          >
            {/* Aurora in overlay */}
            <div className="pointer-events-none absolute inset-0 z-0"
              style={{ opacity: overlayAurora, transition: "opacity 1500ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
            </div>

            <div className="absolute top-0 left-0 right-0 flex items-center gap-3 pointer-events-auto z-30 p-4 sm:p-6"
              style={{ touchAction: "manipulation" }}>
              <button onClick={() => setShowMotion(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.12] transition-colors duration-150 cursor-pointer active:scale-95">
                <X className="h-4 w-4" />
              </button>
              <button onClick={() => setShowMotion(false)}
                className="text-xs text-white/30 hover:text-white/50 transition-colors duration-200 cursor-pointer tracking-wider active:text-white/60">
                Back to home
              </button>
            </div>

            <div className="max-w-4xl w-full px-6 relative z-10 pt-16 sm:pt-0 max-h-[85vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Stage 0 ONLY: icons with color flash */}
                {motionStage === 0 && (
                  <motion.div key="s0" className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-14"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}>
                    {PROCESS_ICONS.map((s, i) => (
                      <motion.div key={s.word}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 + i * 0.2 }}>
                        <s.icon className="h-10 w-10" style={{ color: s.color }} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Stage 1: icons + words — all appear together, no stagger */}
                {motionStage === 1 && (
                  <motion.div key="s1" className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}>
                    {PROCESS_ICONS.map((s) => (
                      <div key={s.word} className="flex items-center gap-3">
                        <s.icon className="h-7 w-7" style={{ color: s.color }} />
                        <span className="text-xl text-white/50 tracking-wider font-medium">{s.word}.</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Stage 2: cards with auto-flash 1→6 then hover-only */}
                {motionStage >= 2 && (
                  <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: "easeInOut" }}>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
                      className="text-center text-xs text-white/25 mb-8 tracking-[0.15em] uppercase">
                      How It Works
                    </motion.p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {REVEAL_STEPS.map((item, i) => (
                        <HowItWorksCard key={item.label} item={item} index={i} autoFlash={cardFlashTriggered} />
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
