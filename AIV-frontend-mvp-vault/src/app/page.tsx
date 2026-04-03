"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EarlyAccessModal } from "@/components/landing/early-access-modal";
import { SignalNotifications, MobileSignalNotifications } from "@/components/landing/signal-notification";
import { OrbitalSignals } from "@/components/landing/signal-orbital";
import { RailSignals } from "@/components/landing/signal-rail";
import { ConstellationSignals } from "@/components/landing/signal-constellation";
import Aurora from "@/components/ui/Aurora";
import { HeroFinalV2 } from "@/components/landing/hero-final-v2";

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [signalMode, setSignalMode] = useState<1 | 2 | 3 | 4>(1);

  // Aurora — shake detection
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
      const speedBoost = Math.min(0.4, speed * 0.15);
      const shakeBoost = hasReversal && speed > 0.15 ? 0.6 : 0;
      shakeScoreRef.current = Math.min(5, shakeScoreRef.current * 0.85 + speedBoost + shakeBoost);
      lastMouseRef.current = { x: e.clientX, y: e.clientY, time: now, dx, dy };
    } else {
      lastMouseRef.current = { ...last, x: e.clientX, y: e.clientY, time: now };
    }
    const score = shakeScoreRef.current;
    setAuroraOpacity(Math.min(0.85, 0.25 + score * 0.18));
    if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => { shakeScoreRef.current = 0; setAuroraOpacity(0.25); }, 300);
  }, []);

  useEffect(() => { return () => { if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current); }; }, []);

  useEffect(() => {
    try { const user = localStorage.getItem("user"); if (user && JSON.parse(user)?.id) router.replace("/dashboard"); } catch {}
  }, [router]);

  function handleRequestAccess() { setModalInitialStep(0); setModalOpen(true); }

  // Dynamic signal component based on mode
  const renderSignals = () => {
    if (overlayOpen) return null;
    switch (signalMode) {
      case 1: return <SignalNotifications />;
      case 2: return <OrbitalSignals />;
      case 3: return <RailSignals />;
      case 4: return <ConstellationSignals />;
      default: return <SignalNotifications />;
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="dark relative min-h-[100dvh] bg-[oklch(0.09_0.01_262)]"
    >
      {/* Aurora */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: auroraOpacity, transition: "opacity 1000ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 60%)" }} />

      {/* Signals */}
      {renderSignals()}

      {/* Main */}
      <div className="relative z-10 max-w-[1920px] mx-auto">
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
          <Link href="/">
            <Image src="/aiv-light.svg" alt="AIV" width={48} height={19} priority
              className="opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </Link>
          <button onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
            className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none tracking-wider uppercase pointer-events-auto">
            Sign In
          </button>
        </header>

        {/* Hero — official version (v2 with all animations) */}
        <HeroFinalV2
          containerRef={containerRef}
          onRequestAccess={handleRequestAccess}
          onOverlayChange={setOverlayOpen}
        />

        {/* Mobile Signals */}
        {!overlayOpen && <MobileSignalNotifications />}

        {/* Signal mode toggle — bottom-right */}
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/70 backdrop-blur-xl px-1.5 py-1 shadow-2xl shadow-black/40 pointer-events-auto">
          {([1, 2, 3, 4] as const).map(v => (
            <button key={v} onClick={() => setSignalMode(v)}
              className={`px-2.5 py-1.5 rounded-full text-[9px] font-medium tracking-wider transition-all duration-200 cursor-pointer ${signalMode === v ? "bg-white/90 text-black shadow-sm" : "text-white/40 hover:text-white/60"}`}>
              {v === 1 && "Float"}{v === 2 && "Orbit"}{v === 3 && "Rail"}{v === 4 && "Net"}
            </button>
          ))}
        </div>

        <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} initialStep={modalInitialStep} />
      </div>
    </div>
  );
}
