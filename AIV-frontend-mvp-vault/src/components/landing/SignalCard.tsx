'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Signal definitions ──────────────────────────────────────────────
interface Signal {
    id: string
    title: string
    subtitle: string
    icon: string
    accentColor: string
    bgColor: string
    type: 'status' | 'revenue' | 'metric' | 'alert'
    metricValue?: string
    metricLabel?: string
    metricPercent?: number
    badge?: string
    badgeColor?: string
}

export const DESKTOP_CYCLE_INTERVAL = 4000
export const DESKTOP_HOVER_SCALE = 1.02

export const SIGNALS: Signal[] = [
    {
        id: 'licensing-activity',
        title: 'Licensing Activity',
        subtitle: '4 brand deals negotiating in parallel — 2 auto-approved, 2 awaiting sign-off',
        icon: '📄',
        accentColor: 'blue',
        bgColor: 'bg-blue-500/20',
        type: 'status',
        badge: 'LIVE',
        badgeColor: 'bg-blue-400/10 text-blue-400',
    },
    {
        id: 'cross-platform-deployment',
        title: 'Cross-Platform Deployment',
        subtitle: 'Your twin is live on 6 platforms · All governed by your rules',
        icon: '🌐',
        accentColor: 'green',
        bgColor: 'bg-green-500/20',
        type: 'status',
        badge: '6 Live',
        badgeColor: 'bg-green-400/10 text-green-400',
    },
    {
        id: 'identity-protection',
        title: 'Identity Protection',
        subtitle: 'Blocked 3 unauthorized uses this week · Evidence logged and sealed',
        icon: '🛡️',
        accentColor: 'red',
        bgColor: 'bg-red-500/20',
        type: 'alert',
        badge: '⚠ 3 Blocked',
        badgeColor: 'bg-red-400/10 text-red-400',
    },
    {
        id: 'cryptographic-seal',
        title: 'Cryptographic Seal',
        subtitle: 'Your Seal verified 140 times by brands and platforms this month',
        icon: '🔏',
        accentColor: 'purple',
        bgColor: 'bg-purple-500/20',
        type: 'metric',
        metricValue: '140',
        metricLabel: 'verifications this month',
        metricPercent: 82,
    },
    {
        id: 'revenue-collected',
        title: 'Revenue Collected',
        subtitle: '+$12,400 in licensing revenue this quarter · Settled to your wallet',
        icon: '💰',
        accentColor: 'green',
        bgColor: 'bg-green-500/20',
        type: 'revenue',
        metricValue: '+$12,400',
        metricLabel: 'Licensing revenue this quarter',
        metricPercent: 75,
        badge: 'Settled',
        badgeColor: 'bg-green-400/10 text-green-400',
    },
    {
        id: 'knowledge-sync',
        title: 'Knowledge Sync',
        subtitle: '14 new documents ingested · Twin accuracy score: 97.2%',
        icon: '📚',
        accentColor: 'amber',
        bgColor: 'bg-amber-500/20',
        type: 'metric',
        metricValue: '97%',
        metricLabel: 'twin accuracy score',
        metricPercent: 97,
    },
    {
        id: 'approval-request',
        title: 'Approval Request',
        subtitle: 'New campaign request from [Global Brand] · Tap to review terms',
        icon: '⏳',
        accentColor: 'amber',
        bgColor: 'bg-amber-500/20',
        type: 'status',
        badge: 'Pending',
        badgeColor: 'bg-amber-400/10 text-amber-400',
    },
    {
        id: 'marketplace-demand',
        title: 'Marketplace Demand',
        subtitle: '8 new buyer inquiries this week · 3 match your pre-approved rules',
        icon: '📊',
        accentColor: 'blue',
        bgColor: 'bg-blue-500/20',
        type: 'metric',
        metricValue: '8',
        metricLabel: 'new buyer inquiries',
        metricPercent: 60,
    },
    {
        id: 'misuse-detection',
        title: 'Misuse Detection',
        subtitle: 'Unauthorized likeness flagged on 1 platform · Enforcement docs ready',
        icon: '🚨',
        accentColor: 'red',
        bgColor: 'bg-red-500/20',
        type: 'alert',
        badge: '⚠ 1 Flagged',
        badgeColor: 'bg-red-400/10 text-red-400',
    },
    {
        id: 'network-growth',
        title: 'Network Growth',
        subtitle: '12 new brands joined the Marketplace · 4 in your vertical',
        icon: '🤝',
        accentColor: 'blue',
        bgColor: 'bg-blue-500/20',
        type: 'status',
        badge: '+12 Brands',
        badgeColor: 'bg-blue-400/10 text-blue-400',
    },
]

// ── Pre-split signals for left and right sides ──────────────────────
const LEFT_SIGNALS = SIGNALS.filter((_, i) => i % 2 === 0) // indices 0,2,4,6,8
const RIGHT_SIGNALS = SIGNALS.filter((_, i) => i % 2 === 1) // indices 1,3,5,7,9

// ── Random constrained positions for cards ───────────────────────────
// Cards appear in the outer zones flanking the center content, with
// random vertical position and slight random tilt for a spontaneous feel.
// Constrained so they never overlap center content.

export function getRandomPosition(side: 'left' | 'right') {
    // Vertical: 28–48% of viewport height
    const top = 28 + Math.random() * 20
    // No tilt — cards stay horizontal
    const rotation = 0
    // Horizontal offset from center: 480–540px — generous safe zone so cards never touch title
    const offset = 480 + Math.random() * 60

    return {
        style: {
            top: `${top}%`,
            ...(side === 'left'
                ? { right: `calc(50% + ${offset}px)` }
                : { left: `calc(50% + ${offset}px)` }
            ),
        },
        rotation,
    }
}

// ── Accent color map ────────────────────────────────────────────────
const dotColors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
}

const pulseColors: Record<string, string> = {
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    amber: 'bg-amber-400',
    purple: 'bg-purple-400',
    red: 'bg-red-400',
}

const barColors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
}

const metricSquareColors: Record<string, string> = {
    blue: 'bg-blue-500/40',
    green: 'bg-green-500/40',
    amber: 'bg-amber-600/50',
    purple: 'bg-purple-500/40',
    red: 'bg-red-500/40',
}

// ── Card renderer by type ───────────────────────────────────────────
function renderCardContent(signal: Signal) {
    if (signal.type === 'revenue') {
        return (
            <div className="flex flex-col gap-1 min-w-[240px]">
                <div className="flex justify-between items-start">
                    <span className="text-xs text-primary-300 uppercase tracking-wider">{signal.title}</span>
                    {signal.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${signal.badgeColor}`}>{signal.badge}</span>
                    )}
                </div>
                <div className="text-2xl font-bold text-white mb-1">{signal.metricValue}</div>
                <div className="text-xs text-primary-400">{signal.metricLabel}</div>
                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${barColors[signal.accentColor]} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${signal.metricPercent}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    />
                </div>
            </div>
        )
    }

    if (signal.type === 'metric') {
        return (
            <div className="flex items-center gap-3 min-w-[240px]">
                <div className={`relative h-12 w-12 rounded-xl ${metricSquareColors[signal.accentColor]} flex items-center justify-center shrink-0`}>
                    <span className="text-xl text-white">{signal.metricValue}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm">{signal.title}</div>
                    <div className="text-primary-300 text-xs">{signal.metricLabel}</div>
                    <div className="mt-1.5 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full ${barColors[signal.accentColor]} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${signal.metricPercent}%` }}
                            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (signal.type === 'alert') {
        return (
            <div className="flex items-center gap-3">
                <div className={`relative h-10 w-10 rounded-full ${signal.bgColor} flex items-center justify-center shrink-0`}>
                    <span className="text-lg">{signal.icon}</span>
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-white font-semibold text-sm">{signal.title}</div>
                    </div>
                    <div className="text-primary-300 text-xs mt-0.5">{signal.subtitle}</div>
                    {signal.badge && (
                        <span className={`inline-flex items-center text-[10px] mt-1 px-2 py-0.5 rounded-full ${signal.badgeColor}`}>{signal.badge}</span>
                    )}
                </div>
            </div>
        )
    }

    // status type (default)
    return (
        <div className="flex items-center gap-3">
            <div className={`relative h-10 w-10 rounded-full ${signal.bgColor} flex items-center justify-center shrink-0`}>
                <div className={`h-3 w-3 rounded-full ${dotColors[signal.accentColor]}`}>
                    <span className={`absolute inset-0 rounded-full ${pulseColors[signal.accentColor]} animate-ping opacity-40`} />
                </div>
            </div>
            <div>
                <div className="text-white font-semibold text-sm">{signal.title}</div>
                <div className="text-primary-300 text-xs flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColors[signal.accentColor]} animate-pulse`} />
                    {signal.subtitle}
                </div>
                {signal.badge && (
                    <span className={`inline-flex items-center text-[10px] mt-1 px-2 py-0.5 rounded-full ${signal.badgeColor}`}>{signal.badge}</span>
                )}
            </div>
        </div>
    )
}

// ── Animation variants ──────────────────────────────────────────────
const cardVariants = {
    initial: {
        scale: 0.95,
        opacity: 0,
        filter: 'blur(4px)',
    },
    animate: {
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        transition: {
            duration: 0.3,
            ease: 'easeIn' as const,
        },
    },
    exit: {
        scale: 0.95,
        opacity: 0,
        filter: 'blur(4px)',
        transition: {
            duration: 0.3,
            ease: 'easeOut' as const,
        },
    },
}

// ── Mobile Signal Carousel ──────────────────────────────────────────
// Shows one card at a time at the bottom of the mobile landing page.
// Cycles through all signals with: fade out → 1s pause (see background) → fade in.

const mobileCardVariants = {
    initial: {
        opacity: 0,
        filter: 'blur(6px)',
        scale: 0.97,
    },
    animate: {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        transition: {
            duration: 0.35,
            ease: 'easeOut' as const,
            delay: 0.6,
        },
    },
    exit: {
        opacity: 0,
        filter: 'blur(6px)',
        scale: 0.97,
        transition: {
            duration: 0.35,
            ease: 'easeIn' as const,
        },
    },
}

export function MobileSignalCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [visible, setVisible] = useState(false)
    const [hasRoom, setHasRoom] = useState(true)
    const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)

    // Check if screen is tall enough to show the carousel without overlapping content
    useEffect(() => {
        const checkHeight = () => setHasRoom(window.innerHeight >= 700)
        checkHeight()
        window.addEventListener('resize', checkHeight)
        return () => window.removeEventListener('resize', checkHeight)
    }, [])

    const advance = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % SIGNALS.length)
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 2000)
        return () => clearTimeout(timeout)
    }, [])

    useEffect(() => {
        if (!visible) return
        autoAdvanceRef.current = setInterval(advance, 5000)
        return () => {
            if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        }
    }, [visible, advance])

    // Tap to skip to next card
    const handleTap = () => {
        if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        advance()
        autoAdvanceRef.current = setInterval(advance, 5000)
    }

    if (!visible || !hasRoom) return null

    const signal = SIGNALS[currentIndex]

    return (
        <div className="w-full flex justify-center cursor-pointer" style={{ minHeight: '64px' }} onClick={handleTap}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={`mobile-${signal.id}-${currentIndex}`}
                    className="w-full max-w-[300px]"
                    variants={mobileCardVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <div className="rounded-xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-2.5 backdrop-blur-2xl shadow-[0_4px_20px_0_rgba(0,0,0,0.3)] scale-[0.75] origin-center">
                        {renderCardContent(signal)}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
interface SignalCardProps {
    side: 'left' | 'right'
}

export function SignalCard({ side }: SignalCardProps) {
    const signals = side === 'left' ? LEFT_SIGNALS : RIGHT_SIGNALS
    const [currentIndex, setCurrentIndex] = useState(0)
    const positionRef = useRef(getRandomPosition(side))
    const [visible, setVisible] = useState(false)
    const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)

    const advance = useCallback(() => {
        // Compute next position before changing index so it's ready when new card mounts
        positionRef.current = getRandomPosition(side)
        setCurrentIndex((prev) => (prev + 1) % signals.length)
    }, [signals.length, side])

    // Staggered start: left cards appear after 1.5s, right cards after 3.5s
    // Then cycle every 4 seconds (0.3s exit + 0.3s enter + ~3.4s visible)
    useEffect(() => {
        const initialDelay = side === 'left' ? 1500 : 3500
        const showTimeout = setTimeout(() => {
            setVisible(true)
            autoAdvanceRef.current = setInterval(advance, DESKTOP_CYCLE_INTERVAL)
        }, initialDelay)
        return () => {
            clearTimeout(showTimeout)
            if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        }
    }, [advance, side])

    // Click handler
    const handleClick = () => {
        if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        advance()
        autoAdvanceRef.current = setInterval(advance, DESKTOP_CYCLE_INTERVAL)
    }

    // Hover: pause auto-advance
    const handleMouseEnter = () => {
        if (autoAdvanceRef.current) {
            clearInterval(autoAdvanceRef.current)
            autoAdvanceRef.current = null
        }
    }

    const handleMouseLeave = () => {
        if (!autoAdvanceRef.current) {
            autoAdvanceRef.current = setInterval(advance, DESKTOP_CYCLE_INTERVAL)
        }
    }

    if (!visible) return null

    const signal = signals[currentIndex]
    const pos = positionRef.current

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`${signal.id}-${currentIndex}`}
                className="absolute pointer-events-auto cursor-pointer"
                style={pos.style}
                initial={{ scale: 0.95, opacity: 0, filter: 'blur(4px)', rotate: pos.rotation }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', rotate: pos.rotation, transition: { duration: 0.3, ease: 'easeOut' } }}
                exit={{ scale: 0.95, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.3, ease: 'easeIn' } }}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <motion.div
                    className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-4 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all hover:from-white/20 hover:to-white/10 min-w-[280px]"
                    whileHover={{ scale: DESKTOP_HOVER_SCALE }}
                >
                    {renderCardContent(signal)}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
