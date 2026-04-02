'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import {
    FileText, Globe, Shield, Lock, DollarSign,
    BookOpen, Clock, BarChart3, AlertTriangle, Users,
    type LucideIcon,
} from 'lucide-react'

// ── Signal definitions ──────────────────────────────────────────────
interface Signal {
    id: string
    title: string
    subtitle: string
    icon: LucideIcon
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
        icon: FileText,
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
        icon: Globe,
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
        icon: Shield,
        accentColor: 'red',
        bgColor: 'bg-red-500/20',
        type: 'alert',
        badge: '3 Blocked',
        badgeColor: 'bg-red-400/10 text-red-400',
    },
    {
        id: 'identity-verification',
        title: 'Identity Verification',
        subtitle: 'Your identity verified 140 times by brands and platforms this month',
        icon: Lock,
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
        subtitle: '+$87,500 in licensing revenue this quarter · Settled to your wallet',
        icon: DollarSign,
        accentColor: 'green',
        bgColor: 'bg-green-500/20',
        type: 'revenue',
        metricValue: '+$87,500',
        metricLabel: 'Licensing revenue this quarter',
        metricPercent: 75,
        badge: 'Settled',
        badgeColor: 'bg-green-400/10 text-green-400',
    },
    {
        id: 'profile-intelligence',
        title: 'Profile Intelligence',
        subtitle: '14 new data points processed · Identity accuracy: 97%',
        icon: BookOpen,
        accentColor: 'amber',
        bgColor: 'bg-amber-500/20',
        type: 'metric',
        metricValue: '97%',
        metricLabel: 'identity accuracy',
        metricPercent: 97,
    },
    {
        id: 'approval-request',
        title: 'Approval Request',
        subtitle: 'New campaign request from [Global Brand] · Tap to review terms',
        icon: Clock,
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
        icon: BarChart3,
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
        icon: AlertTriangle,
        accentColor: 'red',
        bgColor: 'bg-red-500/20',
        type: 'alert',
        badge: '1 Flagged',
        badgeColor: 'bg-red-400/10 text-red-400',
    },
    {
        id: 'network-growth',
        title: 'Network Growth',
        subtitle: '12 new brands joined the Marketplace · 4 in your vertical',
        icon: Users,
        accentColor: 'blue',
        bgColor: 'bg-blue-500/20',
        type: 'status',
        badge: '+12 Brands',
        badgeColor: 'bg-blue-400/10 text-blue-400',
    },
]

// ── Shuffle utility ──────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

// ── Pre-split signals for left and right sides ──────────────────────
const LEFT_SIGNALS = SIGNALS.filter((_, i) => i % 2 === 0) // indices 0,2,4,6,8
const RIGHT_SIGNALS = SIGNALS.filter((_, i) => i % 2 === 1) // indices 1,3,5,7,9

// ── Random constrained positions for cards ───────────────────────────
// Cards appear in the outer zones flanking the center content, with
// random vertical position and slight random tilt for a spontaneous feel.
// Constrained so they never overlap center content.

export function getRandomPosition(side: 'left' | 'right') {
    // Wider vertical range: 20–55% for more spontaneous placement
    const top = 20 + Math.random() * 35
    // Slight random tilt for organic feel: -2° to +2°
    const rotation = (Math.random() - 0.5) * 4
    // Varied horizontal offset from center: 460–560px
    const offset = 460 + Math.random() * 100

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
                    {<signal.icon className="h-5 w-5" />}
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
            ease: 'easeOut' as const,
        },
    },
    exit: {
        scale: 0.95,
        opacity: 0,
        filter: 'blur(4px)',
        transition: {
            duration: 0.2,
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
            duration: 0.22,
            ease: 'easeIn' as const,
        },
    },
}

export function MobileSignalCarousel() {
    const [shuffledSignals] = useState(() => shuffleArray(SIGNALS))
    const [currentIndex, setCurrentIndex] = useState(0)
    const [visible, setVisible] = useState(false)
    const [hasRoom, setHasRoom] = useState(true)
    const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)
    const reducedMotion = useReducedMotion()

    // Check if screen is tall enough to show the carousel without overlapping content
    useEffect(() => {
        const checkHeight = () => setHasRoom(window.innerHeight >= 700)
        checkHeight()
        window.addEventListener('resize', checkHeight)
        return () => window.removeEventListener('resize', checkHeight)
    }, [])

    const advance = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % shuffledSignals.length)
    }, [shuffledSignals.length])

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 2000)
        return () => clearTimeout(timeout)
    }, [])

    useEffect(() => {
        if (!visible || reducedMotion) return
        autoAdvanceRef.current = setInterval(advance, 5000)
        return () => {
            if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        }
    }, [visible, advance, reducedMotion])

    // Tap to skip to next card
    const handleTap = () => {
        if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current)
        advance()
        autoAdvanceRef.current = setInterval(advance, 5000)
    }

    if (!visible || !hasRoom) return null

    const signal = shuffledSignals[currentIndex]

    return (
        <div className="w-full flex justify-center cursor-pointer" style={{ minHeight: '64px' }} onClick={handleTap}>
            {reducedMotion ? (
                <div className="w-full max-w-[300px]">
                    <div className="rounded-xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-2.5 backdrop-blur-2xl shadow-[0_4px_20px_0_rgba(0,0,0,0.3)] scale-[0.75] origin-center">
                        {renderCardContent(signal)}
                    </div>
                </div>
            ) : (
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
            )}
        </div>
    )
}
interface SignalCardProps {
    side: 'left' | 'right'
}

export function SignalCard({ side }: SignalCardProps) {
    const [shuffledSignals] = useState(() => shuffleArray(side === 'left' ? LEFT_SIGNALS : RIGHT_SIGNALS))
    const [currentIndex, setCurrentIndex] = useState(0)
    const positionRef = useRef(getRandomPosition(side))
    const [visible, setVisible] = useState(false)
    const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null)
    const reducedMotion = useReducedMotion()

    // Randomized interval between 3.5s and 5.5s for each cycle
    const getRandomInterval = () => 3500 + Math.random() * 2000

    const advance = useCallback(() => {
        positionRef.current = getRandomPosition(side)
        setCurrentIndex((prev) => (prev + 1) % shuffledSignals.length)
    }, [shuffledSignals.length, side])

    const scheduleNext = useCallback(() => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
        autoAdvanceRef.current = setTimeout(() => {
            advance()
            scheduleNext()
        }, getRandomInterval())
    }, [advance])

    // Staggered start with randomized delays
    useEffect(() => {
        const initialDelay = side === 'left'
            ? 1000 + Math.random() * 1000
            : 2500 + Math.random() * 1500
        const showTimeout = setTimeout(() => {
            setVisible(true)
            if (!reducedMotion) scheduleNext()
        }, initialDelay)
        return () => {
            clearTimeout(showTimeout)
            if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
        }
    }, [scheduleNext, side, reducedMotion])

    // Click handler
    const handleClick = () => {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current)
        advance()
        scheduleNext()
    }

    // Hover: pause auto-advance
    const handleMouseEnter = () => {
        if (autoAdvanceRef.current) {
            clearTimeout(autoAdvanceRef.current)
            autoAdvanceRef.current = null
        }
    }

    const handleMouseLeave = () => {
        if (!autoAdvanceRef.current) {
            scheduleNext()
        }
    }

    if (!visible) return null

    const signal = shuffledSignals[currentIndex]
    const pos = positionRef.current

    if (reducedMotion) {
        return (
            <div
                className="absolute pointer-events-auto cursor-pointer"
                style={pos.style}
                onClick={handleClick}
            >
                <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-4 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-w-[280px]">
                    {renderCardContent(signal)}
                </div>
            </div>
        )
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`${signal.id}-${currentIndex}`}
                className="absolute pointer-events-auto cursor-pointer"
                style={pos.style}
                initial={{ scale: 0.95, opacity: 0, filter: 'blur(4px)', rotate: pos.rotation }}
                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', rotate: pos.rotation, transition: { duration: 0.3, ease: 'easeOut' } }}
                exit={{ scale: 0.95, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2, ease: 'easeIn' } }}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <motion.div
                    className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/5 p-4 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-[transform,background] duration-200 hover:from-white/20 hover:to-white/10 min-w-[280px]"
                    whileHover={{ scale: DESKTOP_HOVER_SCALE }}
                >
                    {renderCardContent(signal)}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
