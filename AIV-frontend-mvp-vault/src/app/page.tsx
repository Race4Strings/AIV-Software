"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SignalNotifications, MobileSignalNotifications } from "@/components/landing/signal-notification";
import Aurora from "@/components/ui/Aurora";
import { HeroFinalV2 } from "@/components/landing/hero-final-v2";
import { useShakeDetection } from "@/hooks/use-shake-detection";

const EarlyAccessModal = dynamic(
  () => import("@/components/landing/early-access-modal").then(m => ({ default: m.EarlyAccessModal })),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(false);

  const { opacity: auroraOpacity, handleMouseMove, handleTouchStart, handleTouchEnd } = useShakeDetection();

  useEffect(() => {
    try { const user = localStorage.getItem("user"); if (user && JSON.parse(user)?.id) router.replace("/dashboard"); } catch {}
  }, [router]);

  function handleRequestAccess() { setModalInitialStep(0); setModalOpen(true); }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="dark relative min-h-[100dvh] bg-[oklch(0.09_0.01_262)]"
    >
      {/* Aurora */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: auroraOpacity, transition: "opacity 1500ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <Aurora colorStops={["#0a1e42", "#2563eb", "#0a1e42"]} amplitude={0.8} blend={0.5} speed={0.3} />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 60%)" }} />

      {/* Signals */}
      {!overlayOpen && <SignalNotifications />}

      {/* Main — pointer-events-none so signals at z-30 remain interactive */}
      <div className="relative z-10 max-w-[1920px] mx-auto pointer-events-none">
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 pointer-events-auto">
          <Link href="/">
            <Image src="/aiv-light.svg" alt="AIV" width={48} height={19} priority
              className="opacity-80 hover:opacity-100 transition-opacity duration-200" />
          </Link>
          <button onClick={() => { setModalInitialStep(8); setModalOpen(true); }}
            className="text-xs font-medium text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none tracking-wider uppercase pointer-events-auto">
            Sign In
          </button>
        </header>

        <HeroFinalV2
          containerRef={containerRef}
          onRequestAccess={handleRequestAccess}
          onOverlayChange={setOverlayOpen}
        />

        {!overlayOpen && <MobileSignalNotifications />}
      </div>

      {/* Modal — outside pointer-events-none wrapper so backdrop click works */}
      <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} initialStep={modalInitialStep} />
    </div>
  );
}
