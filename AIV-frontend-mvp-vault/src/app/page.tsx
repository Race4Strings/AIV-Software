"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Loader2 } from "lucide-react";
import { SignalCard, MobileSignalCarousel } from "@/components/landing/SignalCard";
import VariableProximity from "@/components/ui/VariableProximity";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { CommandCenter } from "@/components/dashboard/command-center";
// WorkspaceProvider removed — workspaces replaced by assistant sessions
import apiClient from "@/lib/api/client";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      const u = parsed.data || parsed;
      if (!u.avatar) u.avatar = "";
      setUser(u);

      apiClient
        .get("/twins")
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length === 0) {
            router.push("/onboard");
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => {
          // Backend unreachable — clear user, show landing
          setUser(null);
          setIsLoading(false);
        });
    } catch {
      localStorage.removeItem("user");
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div
        suppressHydrationWarning
        className="flex min-h-[100dvh] items-center justify-center bg-background"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Logged in — vault dashboard
  if (user) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader user={user} />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-6xl">
              <CommandCenter />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Not logged in — landing page
  const blurVariant = {
    hidden: { opacity: 0, filter: "blur(10px)", y: 10 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="relative min-h-[100dvh]" ref={containerRef}>
      {/* Fixed background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#041030] via-[#0a3d9e] to-[#041030]" />

      {/* Hero */}
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full bg-blue-300/8 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[700px] w-[700px] rounded-full bg-blue-300/8 blur-[100px]" />
        </div>

        {/* Floating signal cards — desktop only */}
        <div className="absolute inset-0 z-20 pointer-events-none hidden xl:block overflow-hidden">
          <SignalCard side="left" />
          <SignalCard side="right" />
        </div>

        {/* Content */}
        <motion.div
          className="relative z-10 text-center"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          <motion.div
            className="mb-3 sm:mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm text-primary-200"
            variants={blurVariant}
          >
            <Lock className="h-4 w-4" />
            Identity Infrastructure
          </motion.div>

          <motion.h1
            className="mb-3 sm:mb-6 text-[clamp(1.75rem,7vw,2rem)] sm:text-5xl font-bold tracking-tight md:text-7xl drop-shadow-2xl overflow-visible"
            style={{ lineHeight: 1.3 }}
            variants={blurVariant}
          >
            <div style={{ position: "relative", display: "inline-flex", overflow: "visible" }}>
              <VariableProximity
                label="Own Your Digital Identity"
                className="cursor-default text-white"
                fromFontVariationSettings="'wght' 700, 'opsz' 32"
                toFontVariationSettings="'wght' 300, 'opsz' 9"
                containerRef={containerRef}
                radius={120}
                falloff="gaussian"
              />
            </div>
          </motion.h1>

          <motion.p
            className="mx-auto mb-8 max-w-2xl text-[13px] leading-relaxed sm:text-base text-primary-100/80 md:text-lg"
            variants={blurVariant}
          >
            Own your identity in the AI economy. AIV certifies, protects, and licenses your
            digital identity — with cryptographic ownership, behavioral guardrails, and a
            licensing engine that generates revenue on autopilot.
          </motion.p>

          <motion.div
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            variants={blurVariant}
          >
            <Link
              href="/auth/signup"
              className="group relative inline-flex h-14 w-full max-w-[280px] sm:w-auto sm:max-w-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f6bff] to-[#064edc] px-8 font-semibold text-white shadow-lg shadow-primary-600/30 transition-all hover:scale-105 hover:shadow-primary-500/40 active:scale-95"
            >
              Get Started
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <div className="relative flex flex-col items-center w-full max-w-[280px] sm:w-auto sm:max-w-none">
              <Link
                href="/auth/signin"
                className="group inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-105 active:scale-95 hover:border-white/20"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="mt-12 mb-4 xl:mb-0 flex flex-col items-center gap-4"
            variants={blurVariant}
          >
            <p className="text-xs text-white/40 tracking-wider">
              Backed by leading investors in AI and entertainment
            </p>
          </motion.div>
        </motion.div>

        {/* Mobile signal carousel */}
        <div className="absolute bottom-4 left-0 right-0 z-10 xl:hidden px-4">
          <MobileSignalCarousel />
        </div>
      </div>
    </div>
  );
}
