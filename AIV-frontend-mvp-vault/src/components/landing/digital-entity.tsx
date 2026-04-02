"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface DigitalEntityProps {
  className?: string;
  size?: number;
}

export function DigitalEntity({ className = "", size = 72 }: DigitalEntityProps) {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  function handleMouseMove(e: React.MouseEvent) {
    if (!containerRef.current || reducedMotion) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ((e.clientX - cx) / rect.width) * 8;
    const dy = ((e.clientY - cy) / rect.height) * 8;
    setOffset({ x: Math.max(-8, Math.min(8, dx)), y: Math.max(-8, Math.min(8, dy)) });
  }

  const coreSize = size * 0.4;
  const sp = { type: "spring" as const, damping: 20, stiffness: 200 };

  return (
    <div
      ref={containerRef}
      className={`relative cursor-pointer ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setOffset({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <motion.div className="absolute inset-0 rounded-full" animate={{ scale: hovered ? 1.5 : 1, opacity: hovered ? 0.6 : 0.1 }} transition={sp} style={{ background: hovered ? "radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(16,185,129,0.08) 50%, transparent 70%)" : "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)" }} />
      <motion.div className="entity-ring-1 absolute inset-0 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.05)" }} animate={{ opacity: hovered ? 0.3 : 0.05, scale: hovered ? 1.1 : 1 }} transition={sp} />
      <motion.div className="entity-ring-2 absolute rounded-full" style={{ inset: "8%", border: "1px solid rgba(255,255,255,0.04)" }} animate={{ opacity: hovered ? 0.25 : 0.03, scale: hovered ? 1.05 : 1 }} transition={sp} />
      <motion.div className="entity-ring-3 absolute rounded-full" style={{ inset: "18%", border: "1px solid rgba(255,255,255,0.03)" }} animate={{ opacity: hovered ? 0.35 : 0.02 }} transition={sp} />
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} className={`entity-particle-${i} absolute rounded-full`} style={{ width: hovered ? 3 : 2, height: hovered ? 3 : 2, top: "50%", left: "50%", background: hovered ? "rgba(96,165,250,0.8)" : "rgba(148,163,184,0.3)" }} animate={{ opacity: hovered ? 0.8 : 0.1 }} transition={sp} />
      ))}
      <motion.div className="absolute rounded-full" style={{ width: coreSize, height: coreSize, top: "50%", left: "50%", marginTop: -coreSize / 2, marginLeft: -coreSize / 2 }} animate={{ x: offset.x, y: offset.y, background: hovered ? "radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(16,185,129,0.3) 60%, rgba(59,130,246,0.1) 100%)" : "radial-gradient(circle, rgba(100,116,139,0.15) 0%, rgba(59,130,246,0.05) 100%)", boxShadow: hovered ? "0 0 20px rgba(59,130,246,0.3), 0 0 40px rgba(16,185,129,0.1)" : "0 0 8px rgba(59,130,246,0.05)" }} transition={sp} />
      <motion.div className="entity-shimmer absolute rounded-full" style={{ width: coreSize * 0.3, height: coreSize * 0.3, top: "42%", left: "55%", background: "rgba(255,255,255,0.15)", filter: "blur(2px)" }} animate={{ opacity: hovered ? 0.4 : 0.05, x: offset.x * 0.5, y: offset.y * 0.5 }} transition={sp} />
      <style dangerouslySetInnerHTML={{ __html: `
        .entity-ring-1{animation:eo1 20s linear infinite}.entity-ring-2{animation:eo2 14s linear infinite reverse}.entity-ring-3{animation:eo3 10s linear infinite}
        .entity-particle-0{transform-origin:0 0;animation:ep0 20s linear infinite}.entity-particle-1{transform-origin:0 0;animation:ep1 14s linear infinite reverse}.entity-particle-2{transform-origin:0 0;animation:ep2 10s linear infinite}.entity-particle-3{transform-origin:0 0;animation:ep3 18s linear infinite reverse}
        .entity-shimmer{animation:esh 3s ease-in-out infinite}
        @keyframes eo1{to{transform:rotate(360deg)}}@keyframes eo2{to{transform:rotate(360deg)}}@keyframes eo3{to{transform:rotate(360deg)}}
        @keyframes ep0{from{transform:rotate(0deg) translateX(${size*0.48}px)}to{transform:rotate(360deg) translateX(${size*0.48}px)}}
        @keyframes ep1{from{transform:rotate(0deg) translateX(${size*0.38}px)}to{transform:rotate(360deg) translateX(${size*0.38}px)}}
        @keyframes ep2{from{transform:rotate(0deg) translateX(${size*0.28}px)}to{transform:rotate(360deg) translateX(${size*0.28}px)}}
        @keyframes ep3{from{transform:rotate(0deg) translateX(${size*0.42}px)}to{transform:rotate(360deg) translateX(${size*0.42}px)}}
        @keyframes esh{0%,100%{opacity:.05}50%{opacity:.2}}
        @media(prefers-reduced-motion:reduce){.entity-ring-1,.entity-ring-2,.entity-ring-3,.entity-particle-0,.entity-particle-1,.entity-particle-2,.entity-particle-3,.entity-shimmer{animation:none!important}}
      ` }} />
    </div>
  );
}
