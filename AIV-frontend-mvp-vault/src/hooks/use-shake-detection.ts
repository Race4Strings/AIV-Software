import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Detects mouse shake gestures and touch press to control aurora opacity (0.25–0.85).
 * Mouse: shake/movement increases opacity. Touch: press-and-hold increases opacity.
 * Uses requestAnimationFrame throttling to avoid jank.
 */
export function useShakeDetection() {
  const [opacity, setOpacity] = useState(0.25);
  const lastRef = useRef({ x: 0, y: 0, time: 0, dx: 0, dy: 0 });
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingOpacity = useRef(0.25);
  const touchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const commitOpacity = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setOpacity(pendingOpacity.current);
        rafRef.current = null;
      });
    }
  }, []);

  const startDecay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      scoreRef.current = 0;
      setOpacity(0.25);
    }, 600);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = Date.now();
    const last = lastRef.current;
    const dt = now - last.time;

    if (dt > 0 && dt < 100) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      const reversalX = (dx > 0 && last.dx < 0) || (dx < 0 && last.dx > 0);
      const reversalY = (dy > 0 && last.dy < 0) || (dy < 0 && last.dy > 0);
      const hasReversal = reversalX || reversalY;
      const speedBoost = Math.min(0.5, speed * 0.2);
      const shakeBoost = hasReversal && speed > 0.08 ? 0.9 : 0;
      scoreRef.current = Math.min(5, scoreRef.current * 0.88 + speedBoost + shakeBoost);
      lastRef.current = { x: e.clientX, y: e.clientY, time: now, dx, dy };
    } else {
      lastRef.current = { ...last, x: e.clientX, y: e.clientY, time: now };
    }

    pendingOpacity.current = Math.min(0.85, 0.25 + scoreRef.current * 0.18);
    commitOpacity();
    startDecay();
  }, [commitOpacity, startDecay]);

  // Touch: press-and-hold gradually increases aurora
  const handleTouchStart = useCallback(() => {
    if (touchIntervalRef.current) clearInterval(touchIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    touchIntervalRef.current = setInterval(() => {
      scoreRef.current = Math.min(5, scoreRef.current + 0.3);
      pendingOpacity.current = Math.min(0.85, 0.25 + scoreRef.current * 0.18);
      commitOpacity();
    }, 100);
  }, [commitOpacity]);

  const handleTouchEnd = useCallback(() => {
    if (touchIntervalRef.current) {
      clearInterval(touchIntervalRef.current);
      touchIntervalRef.current = null;
    }
    startDecay();
  }, [startDecay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (touchIntervalRef.current) clearInterval(touchIntervalRef.current);
    };
  }, []);

  return { opacity, handleMouseMove, handleTouchStart, handleTouchEnd };
}
