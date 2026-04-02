"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";
import { SignalNotifications, MobileSignalNotifications } from "@/components/landing/signal-notification";
import Aurora from "@/components/ui/Aurora";
import { HeroFinal } from "@/components/landing/hero-final";
import { HeroFinalV2 } from "@/components/landing/hero-final-v2";

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);

  // Aurora — shake detection via direction reversals
  const [auroraOpacity, setAuroraOpacity] = useState(0.25);
  const mouseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0, time: 0, dx: 0, dy: 0 });
  const shakeScoreRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const last = lastMouseRef.current;
    const dt = now - last.time;

    if (dt > 0 && dt < 100) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      const reversalX = (dx > 0 && last.dx < 0) || (dx < 0 && last.dx > 0);
      const reversalY = (dy > 0 && last.dy < 0) || (dy < 0 && last.dy > 0);
      const hasReversal = reversalX || reversalY;

      // Speed always contributes — fast movement = more glow
      // Direction changes amplify it (shaking = extra boost)
      const speedBoost = Math.min(0.4, speed * 0.15);
      const shakeBoost = hasReversal && speed > 0.3 ? 0.6 : 0;
      shakeScoreRef.current = Math.min(5,
        shakeScoreRef.current * 0.85 + speedBoost + shakeBoost
      );

      lastMouseRef.current = { x: e.clientX, y: e.clientY, time: now, dx, dy };
    } else {
      lastMouseRef.current = { ...last, x: e.clientX, y: e.clientY, time: now };
    }

    // Score → opacity: smooth mapping
    // 0 = still (invisible), 0.5 = gentle movement, 2+ = shaking
    const score = shakeScoreRef.current;
    // Base 0.25 (always visible) + movement adds up to 0.60 more
    const targetOpacity = Math.min(0.85, 0.25 + score * 0.18);

    setAuroraOpacity(targetOpacity);

    if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => {
      shakeScoreRef.current = 0;
      setAuroraOpacity(0.25);
    }, 300);
  }, []);

  useEffect(() => { return () => { if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current); }; }, []);

  // Auth redirect
  useEffect(() => {
    try { const user = localStorage.getItem("user"); if (user && JSON.parse(user)?.id) router.replace("/dashboard"); } catch {}
  }, [router]);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [experimentalMode, setExperimentalMode] = useState(false);

  function handleRequestAccess() { setModalInitialStep(0); setModalOpen(true); }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="dark relative min-h-[100dvh] bg-[oklch(0.09_0.01_262)]"
    >
      {/* Aurora */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: auroraOpacity, transition: auroraOpacity > 0.4 ? "opacity 300ms ease-out" : "opacity 800ms ease-out" }}>
        <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 60%)" }} />

      {/* Signals — hidden when motion overlay is open */}
      {!overlayOpen && <SignalNotifications />}

      {/* Main */}
      <div className="relative z-10 max-w-[1920px] mx-auto">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/aiv-light.svg" alt="AIV" width={36} height={14} priority
              className="opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </Link>
          <button onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
            className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none tracking-wider uppercase pointer-events-auto">
            Sign In
          </button>
        </header>

        {/* Hero — toggle between approved (v1) and experimental (v2) */}
        {experimentalMode ? (
          <HeroFinalV2
            containerRef={containerRef}
            onRequestAccess={handleRequestAccess}
            onOverlayChange={setOverlayOpen}
          />
        ) : (
          <HeroFinal
            containerRef={containerRef}
            onRequestAccess={handleRequestAccess}
            onOverlayChange={setOverlayOpen}
          />
        )}

        {/* Option toggle — bottom-right */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/70 backdrop-blur-xl px-1.5 py-1 shadow-2xl shadow-black/40 pointer-events-auto">
          <button onClick={() => setExperimentalMode(false)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wider transition-all duration-200 cursor-pointer ${!experimentalMode ? "bg-white/90 text-black shadow-sm" : "text-white/40 hover:text-white/60"}`}>
            v1
          </button>
          <button onClick={() => setExperimentalMode(true)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-medium tracking-wider transition-all duration-200 cursor-pointer ${experimentalMode ? "bg-white/90 text-black shadow-sm" : "text-white/40 hover:text-white/60"}`}>
            v2
          </button>
        </div>

        {/* Mobile Signals — hidden when overlay is open */}
        {!overlayOpen && <MobileSignalNotifications />}

        {/* Early Access Modal */}
        <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} initialStep={modalInitialStep} />
      </div>
    </div>
  );
}
