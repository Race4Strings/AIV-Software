'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight, Eye, EyeOff, Mic, Users, Building2, TrendingUp, type LucideIcon } from 'lucide-react'
import apiClient from "@/lib/api/client"
import { authApi } from "@/lib/api"
import { toast } from 'sonner'

// -- Types --
interface RoleOption {
  key: string
  icon: LucideIcon
  label: string
  hint: string
}

const ROLES: RoleOption[] = [
  { key: 'creator', icon: Mic, label: 'Creator / Talent', hint: 'Artist, athlete, influencer, or public figure' },
  { key: 'manager', icon: Users, label: 'Manager / Agent', hint: 'Representing talent or a roster' },
  { key: 'brand', icon: Building2, label: 'Brand / Partner', hint: 'Looking to license digital identities' },
  { key: 'investor', icon: TrendingUp, label: 'Investor / Press', hint: 'Due diligence, media, or strategic interest' },
]

const ROLE_FIELDS: Record<string, { title: string; description: string; fields: FieldDef[] }> = {
  creator: {
    title: 'Tell us about your presence',
    description: 'We prioritize access based on reach and platform activity.',
    fields: [
      { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Full name', required: true, half: true },
      { key: 'handle', label: 'Primary Handle', type: 'text', placeholder: '@yourhandle', required: true, half: true },
      { key: 'platform', label: 'Primary Platform', type: 'select', options: ['Instagram', 'TikTok', 'YouTube', 'X / Twitter', 'Podcast', 'Other'] },
      { key: 'audience_size', label: 'Audience Size', type: 'select', options: ['Under 100K', '100K\u2013500K', '500K\u20132M', '2M\u201310M', '10M+'] },
    ],
  },
  manager: {
    title: 'Tell us about your roster',
    description: 'Managers with larger rosters are prioritized in our beta.',
    fields: [
      { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Full name', required: true, half: true },
      { key: 'company', label: 'Company / Agency', type: 'text', placeholder: 'Agency name', half: true },
      { key: 'roster_size', label: 'Roster Size', type: 'select', options: ['1\u20133 clients', '4\u201310 clients', '11\u201325 clients', '25+ clients'] },
      { key: 'notable_client', label: 'Most Notable Client (optional)', type: 'text', placeholder: 'Public name or handle' },
    ],
  },
  brand: {
    title: 'Tell us about your needs',
    description: 'We match brands with available digital identities in our licensed network.',
    fields: [
      { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Full name', required: true, half: true },
      { key: 'company', label: 'Company', type: 'text', placeholder: 'Brand name', required: true, half: true },
      { key: 'use_case', label: 'Use Case', type: 'select', options: ['Brand Spokesperson', 'Product Integration', 'Social / Content Licensing', 'AI Brand Collaboration', 'Other'] },
      { key: 'budget', label: 'Budget Range', type: 'select', options: ['Prefer not to say', 'Under $25K', '$25K\u2013$100K', '$100K\u2013$500K', '$500K+'] },
    ],
  },
  investor: {
    title: 'Tell us about your interest',
    description: 'Investors and press receive a dedicated deck and briefing.',
    fields: [
      { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Full name', required: true, half: true },
      { key: 'organization', label: 'Organization', type: 'text', placeholder: 'Fund / Publication', half: true },
      { key: 'focus_area', label: 'Focus Area', type: 'select', options: ['Early Stage / Seed', 'Series A+', 'Strategic / Corporate', 'Editorial / Press', 'Research'] },
      { key: 'interest_prompt', label: 'What prompted your interest?', type: 'text', placeholder: 'Referred by someone, event, article\u2026' },
    ],
  },
}

const SUCCESS_COPY: Record<string, { title: string; description: string; badge: string; badgeClass: string; steps: string[] }> = {
  creator: {
    title: "You're in the queue.",
    description: "We review all creator applications personally. Expect a message from our\u00A0team.",
    badge: 'Application Received',
    badgeClass: 'bg-blue-500/15 text-blue-400',
    steps: [
      'Our team reviews your profile and audience reach.',
      "If you're a fit, you'll receive an access code once we go live.",
      'We\u2019ll guide you through setting up your digital twin.',
    ],
  },
  manager: {
    title: "We'll be in touch soon.",
    description: 'Manager applications are reviewed by our partnerships team within 48 hours.',
    badge: 'Application Received',
    badgeClass: 'bg-blue-500/15 text-blue-400',
    steps: [
      'We review your roster profile and reach.',
      'A partnerships lead contacts you to discuss group onboarding.',
      'Your clients get protected under one umbrella account.',
    ],
  },
  brand: {
    title: 'Request received.',
    description: "Our licensing team will reach out to discuss available identities and fit.",
    badge: 'Application Received',
    badgeClass: 'bg-blue-500/15 text-blue-400',
    steps: [
      'We review your use case and budget context.',
      'Our team sends a curated set of available identities.',
      'You approve terms and the integration goes live.',
    ],
  },
  investor: {
    title: 'Deck is on its way.',
    description: "Check your inbox \u2014 we'll send our investor brief within a few hours.",
    badge: 'Application Received',
    badgeClass: 'bg-blue-500/15 text-blue-400',
    steps: [
      'Investor brief and overview sent to your email.',
      'If interested, we schedule a 30-min founder call.',
      'Demo environment access provided post-NDA.',
    ],
  },
}

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: string[]
  required?: boolean
  half?: boolean
}

interface EarlyAccessModalProps {
  open: boolean
  onClose: () => void
  initialStep?: number
}

export function EarlyAccessModal({ open, onClose, initialStep = 0 }: EarlyAccessModalProps) {
  // Steps: 0=role, 1=details, 2=contact, 3=success(waitlist), 4=code-entry, 5=signup-form, 6=verify-email, 7=signup-success, 8=signin, 9=forgot-password
  const [step, setStep] = useState(initialStep)
  const [role, setRole] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [validatingCode, setValidatingCode] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [validatedCode, setValidatedCode] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSigninPassword, setShowSigninPassword] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // iOS keyboard adjustment
  useEffect(() => {
    if (!open) return
    const adjustModal = () => {
      if (!modalRef.current) return
      const vv = window.visualViewport
      if (vv) {
        const kbHeight = window.innerHeight - vv.height
        modalRef.current.style.transform = kbHeight > 100 ? `translateY(-${kbHeight / 2}px)` : 'translateY(0)'
      }
    }
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', adjustModal)
      vv.addEventListener('scroll', adjustModal)
    }
    return () => {
      if (vv) {
        vv.removeEventListener('resize', adjustModal)
        vv.removeEventListener('scroll', adjustModal)
      }
    }
  }, [open])

  // Focus trap: keep focus within modal when open
  useEffect(() => {
    if (!open) return;
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;
    const focusable = modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;
    first.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, step]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Sync step when modal opens with a specific initialStep
  useEffect(() => {
    if (open) setStep(initialStep)
  }, [open, initialStep])

  // Reset on close
  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setStep(initialStep)
      setRole(null)
      setFields({})
      setCodeError(null)
      setValidatedCode('')
      setSignupEmail('')
      setForgotPasswordSent(false)
      setShowSigninPassword(false)
    }, 300)
  }

  const setField = (key: string, value: string) => setFields(prev => ({ ...prev, [key]: value }))

  const totalSteps = 3
  const currentStep = Math.min(step + 1, totalSteps)

  const roleConfig = role ? ROLE_FIELDS[role] : null
  const requiredDetailsFilled = roleConfig
    ? roleConfig.fields.filter(f => f.required).every(f => fields[f.key]?.trim())
    : false

  // Waitlist submit
  const handleSubmit = async () => {
    const email = fields.email?.trim()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    setSubmitting(true)
    try {
      const roleFields = roleConfig?.fields.map(f => f.key) || []
      const metadata: Record<string, string> = {}
      for (const key of roleFields) {
        if (fields[key]) metadata[key] = fields[key]
      }

      await apiClient.post('/auth/waitlist', {
        email,
        name: fields.name || null,
        role: role || null,
        phone: fields.phone || null,
        referral_source: fields.referral || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })

      setStep(3)
      toast.success("You're on the list!")
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const detail = e?.response?.data?.detail
      const msg = e?.response?.data?.message
      toast.error(typeof detail === 'string' ? detail : msg || 'Failed to join waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  // Access code validation
  const handleValidateCode = async () => {
    const code = fields.code?.trim()
    if (!code || code.length < 6) return

    setValidatingCode(true)
    setCodeError(null)
    try {
      const result = await authApi.validateAccessCode(code)
      if (result.valid) {
        setValidatedCode(code)
        setStep(5) // Go to signup form
        toast.success('Access code verified')
      } else {
        setCodeError(result.message || 'Invalid access code')
      }
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const detail = e?.response?.data?.detail
      setCodeError(typeof detail === 'string' ? detail : 'Failed to validate code')
    } finally {
      setValidatingCode(false)
    }
  }

  // Signup from modal
  const handleSignup = async () => {
    const name = fields.signupName?.trim()
    const username = fields.signupUsername?.trim()
    const email = fields.signupEmail?.trim()
    const password = fields.signupPassword?.trim()
    const confirmPassword = fields.signupConfirmPassword?.trim()

    if (!name || !username || !email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    setSubmitting(true)
    try {
      await authApi.signup({
        name,
        username,
        email,
        password,
        access_code: validatedCode,
      })
      setSignupEmail(email)
      // Store role for onboarding context
      if (role) localStorage.setItem('aiv_user_role', role)
      setStep(6) // Go to email verification
      toast.success('Account created! Check your email for the verification code.')
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const detail = e?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : (typeof detail === 'string' ? detail : 'Sign up failed')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Email verification
  const handleVerifyEmail = async () => {
    const otp = fields.otp?.trim()
    if (!otp || otp.length < 6) {
      toast.error('Please enter the 6-digit code')
      return
    }

    setSubmitting(true)
    try {
      const result = await authApi.verifyEmail({ email: signupEmail, otp })
      // Store user data and redirect
      if (result.data) {
        localStorage.setItem('user', JSON.stringify(result.data))
      }
      setStep(7) // Success
      toast.success('Email verified! Welcome to AIV.')
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const detail = e?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Invalid verification code')
    } finally {
      setSubmitting(false)
    }
  }

  // Sign in
  const handleSignin = async () => {
    const identifier = fields.signinIdentifier?.trim()
    const password = fields.signinPassword?.trim()
    if (!identifier || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      const result = await authApi.signin({ identifier, password })
      localStorage.setItem('user', JSON.stringify(result))
      toast.success('Signed in successfully')
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const e = err as Record<string, Record<string, Record<string, string>>>;
      const detail = e?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : (typeof detail === 'string' ? detail : 'Sign in failed')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // Forgot password
  const handleForgotPassword = async () => {
    const email = fields.forgotEmail?.trim()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    setSubmitting(true)
    try {
      await authApi.forgotPassword({ email })
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setSubmitting(false)
      setForgotPasswordSent(true)
      toast.success('If that email exists, a reset code has been sent.')
    }
  }

  if (!open) return null

  const successCopy = role ? SUCCESS_COPY[role] : SUCCESS_COPY.creator

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Early Access Signup">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />
      {/* Modal */}
      <motion.div
        ref={modalRef}
        className="relative bg-popover border border-white/10 rounded-2xl p-6 sm:p-8 max-w-[520px] w-full shadow-2xl backdrop-blur-xl transition-transform duration-200 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.95 }}
        transition={{
          default: { type: "spring", damping: 25, stiffness: 300 },
          exit: { duration: 0.15, ease: "easeIn" },
        }}
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepWrapper key="step-0">
              <ProgressDots current={1} total={totalSteps} />
              <StepHeader
                label={`Step 1 of ${totalSteps} \u00B7 Who You Are`}
                title="What best describes you?"
                description="This helps us route you to the right onboarding experience."
              />
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {ROLES.map(r => (
                  <button
                    key={r.key}
                    onClick={() => {
                      setRole(r.key)
                      setTimeout(() => setStep(1), 250)
                    }}
                    className={`text-left rounded-xl p-4 border-[1.5px] transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none ${
                      role === r.key
                        ? 'bg-blue-500/15 border-blue-500'
                        : 'bg-white/[0.03] border-transparent hover:bg-blue-500/10 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="mb-2"><r.icon className="h-5 w-5 text-blue-400" /></div>
                    <div className="text-[13px] font-semibold text-white">{r.label}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{r.hint}</div>
                  </button>
                ))}
              </div>
              <div className="text-center mt-4 space-y-1.5">
                <div className="text-xs text-white/40">
                  Already have an access code?{' '}
                  <button onClick={() => setStep(4)} className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded">
                    Enter it here &rarr;
                  </button>
                </div>
                <div className="text-xs text-white/40">
                  Already have an account?{' '}
                  <button onClick={() => setStep(8)} className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded">
                    Sign in &rarr;
                  </button>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 1 && roleConfig && (
            <StepWrapper key="step-1">
              <ProgressDots current={2} total={totalSteps} />
              <StepHeader
                label={`Step 2 of ${totalSteps} \u00B7 Your Details`}
                title={roleConfig.title}
                description={roleConfig.description}
              />
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleConfig.fields.map(f =>
                    f.half ? (
                      <FieldInput key={f.key} field={f} value={fields[f.key] || ''} onChange={v => setField(f.key, v)} />
                    ) : null
                  )}
                </div>
                {roleConfig.fields.filter(f => !f.half).map(f => (
                  <FieldInput key={f.key} field={f} value={fields[f.key] || ''} onChange={v => setField(f.key, v)} />
                ))}
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setStep(0)} className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none">
                  <ArrowLeft className="h-4 w-4 inline mr-1" />Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!requiredDetailsFilled}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer"
                >
                  Continue &rarr;
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper key="step-2">
              <ProgressDots current={3} total={totalSteps} />
              <StepHeader
                label={`Step 3 of ${totalSteps} \u00B7 Contact`}
                title="Where should we reach you?"
                description="We review every application personally and will be in touch within 48 hours."
              />
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="ea-email" className="block text-xs text-white/70 font-medium mb-1.5">Email *</label>
                  <input
                    id="ea-email"
                    type="email"
                    value={fields.email || ''}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="ea-phone" className="block text-xs text-white/70 font-medium mb-1.5">Best phone / WhatsApp</label>
                  <input
                    id="ea-phone"
                    type="tel"
                    value={fields.phone || ''}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="ea-referral" className="block text-xs text-white/70 font-medium mb-1.5">How did you hear about us?</label>
                  <select
                    id="ea-referral"
                    value={fields.referral || ''}
                    onChange={e => setField('referral', e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                  >
                    <option value="" className="bg-popover">Select...</option>
                    <option value="aiv_team" className="bg-popover">AIV team member</option>
                    <option value="client_referral" className="bg-popover">Referred by a client</option>
                    <option value="event" className="bg-popover">Event or conference</option>
                    <option value="social_press" className="bg-popover">Social media or press</option>
                    <option value="other" className="bg-popover">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none">
                  <ArrowLeft className="h-4 w-4 inline mr-1" />Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !fields.email?.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Request Access <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper key="step-3">
              <div className="text-center py-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">{successCopy.title}</h3>
                <p className="text-sm text-white/60 mt-2">{successCopy.description}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${successCopy.badgeClass}`}>
                  {successCopy.badge}
                </span>
              </div>
              <div className="mt-5 rounded-xl bg-white/[0.04] border border-white/[0.08] p-4">
                <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3">What happens next</div>
                {successCopy.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[13px] text-white/70 mb-2 last:mb-0">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-5 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                Done
              </button>
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper key="step-code">
              <StepHeader
                label="Invitation Only"
                title="Welcome to AIV"
                description="Enter your access code to begin."
              />
              <div className="mb-6">
                <label htmlFor="ea-code" className="block text-xs text-white/70 font-medium mb-1.5">Access Code</label>
                <input
                  id="ea-code"
                  type="text"
                  value={fields.code || ''}
                  onChange={e => {
                    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
                    if (v.length > 0 && !v.startsWith('AIV-')) v = 'AIV-' + v.replace('AIV-', '')
                    setField('code', v)
                    setCodeError(null)
                  }}
                  placeholder="AIV-XXXXXXXX"
                  className={`w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border text-white text-sm placeholder:text-white/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors font-mono tracking-wider ${
                    codeError ? 'border-red-500/60' : 'border-white/[0.12] focus:border-blue-500'
                  }`}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleValidateCode() }}
                />
                {codeError && (
                  <p className="text-[12px] text-red-400 mt-1.5">{codeError}</p>
                )}
                {!codeError && (
                  <p className="text-[11px] text-white/30 mt-1.5">Codes are issued to investors, partners, and selected beta participants.</p>
                )}
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => { setStep(0); setCodeError(null) }} className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none">
                  <ArrowLeft className="h-4 w-4 inline mr-1" />Back
                </button>
                <button
                  onClick={handleValidateCode}
                  disabled={validatingCode || !fields.code?.trim() || (fields.code?.trim().length || 0) < 6}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
                >
                  {validatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify &amp; Enter &rarr;</>}
                </button>
              </div>
              <div className="text-center mt-4 text-xs text-white/40">
                Already have an account?{' '}
                <button onClick={() => setStep(8)} className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded">
                  Sign in &rarr;
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 5 && (
            <StepWrapper key="step-signup">
              <StepHeader
                label="Code Verified"
                title="Create Your Account"
                description="Your access code has been verified. Set up your account to get started."
              />
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs text-green-400 font-mono">
                <CheckCircle2 className="h-3 w-3" />
                {validatedCode}
              </div>
              <div className="space-y-3 mt-4 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ea-signup-name" className="block text-xs text-white/70 font-medium mb-1.5">Name *</label>
                    <input
                      id="ea-signup-name"
                      type="text"
                      value={fields.signupName || ''}
                      onChange={e => setField('signupName', e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="ea-signup-username" className="block text-xs text-white/70 font-medium mb-1.5">Username *</label>
                    <input
                      id="ea-signup-username"
                      type="text"
                      value={fields.signupUsername || ''}
                      onChange={e => setField('signupUsername', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="johndoe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ea-signup-email" className="block text-xs text-white/70 font-medium mb-1.5">Email *</label>
                  <input
                    id="ea-signup-email"
                    type="email"
                    value={fields.signupEmail || ''}
                    onChange={e => setField('signupEmail', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="ea-signup-password" className="block text-xs text-white/70 font-medium mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      id="ea-signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={fields.signupPassword || ''}
                      onChange={e => setField('signupPassword', e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="ea-signup-confirm-password" className="block text-xs text-white/70 font-medium mb-1.5">Confirm Password *</label>
                  <input
                    id="ea-signup-confirm-password"
                    type="password"
                    value={fields.signupConfirmPassword || ''}
                    onChange={e => setField('signupConfirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter') handleSignup() }}
                  />
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => setStep(4)} className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none">
                  <ArrowLeft className="h-4 w-4 inline mr-1" />Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={submitting || !fields.signupName?.trim() || !fields.signupUsername?.trim() || !fields.signupEmail?.trim() || !fields.signupPassword?.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account &rarr;</>}
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 6 && (
            <StepWrapper key="step-verify">
              <StepHeader
                label="Almost There"
                title="Verify Your Email"
                description={`We sent a 6-digit code to ${signupEmail}. Enter it below.`}
              />
              <div className="mb-6">
                <label htmlFor="ea-otp" className="block text-xs text-white/70 font-medium mb-1.5">Verification Code</label>
                <input
                  id="ea-otp"
                  type="text"
                  value={fields.otp || ''}
                  onChange={e => setField('otp', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-[0.3em] text-center"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleVerifyEmail() }}
                />
                <button
                  onClick={async () => {
                    try {
                      await authApi.resendOtp({ email: signupEmail })
                      toast.success('New code sent!')
                    } catch {
                      toast.error('Failed to resend code')
                    }
                  }}
                  className="text-[11px] text-blue-400 hover:underline mt-2 bg-transparent border-none p-0 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded"
                >
                  Didn&apos;t receive it? Resend code
                </button>
              </div>
              <button
                onClick={handleVerifyEmail}
                disabled={submitting || (fields.otp?.length || 0) < 6}
                className="w-full py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify &amp; Enter &rarr;</>}
              </button>
            </StepWrapper>
          )}

          {step === 7 && (
            <StepWrapper key="step-welcome">
              <div className="text-center py-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-7 w-7 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)]">Welcome to AIV</h3>
                <p className="text-sm text-white/60 mt-2">Your account is ready. Let&apos;s set up your digital twin.</p>
              </div>
              <button
                onClick={() => { window.location.href = '/onboard' }}
                className="w-full mt-4 py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                Get Started &rarr;
              </button>
            </StepWrapper>
          )}

          {step === 8 && (
            <StepWrapper key="step-signin">
              <StepHeader
                label="Welcome Back"
                title="Sign In"
                description="Enter your email or username to log in."
              />
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="ea-signin-identifier" className="block text-xs text-white/70 font-medium mb-1.5">Email or Username</label>
                  <input
                    id="ea-signin-identifier"
                    type="text"
                    value={fields.signinIdentifier || ''}
                    onChange={e => setField('signinIdentifier', e.target.value)}
                    placeholder="john@example.com or johndoe"
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="ea-signin-password" className="block text-xs text-white/70 font-medium">Password</label>
                    <button
                      onClick={() => { setForgotPasswordSent(false); setStep(9) }}
                      className="text-[11px] text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="ea-signin-password"
                      type={showSigninPassword ? 'text' : 'password'}
                      value={fields.signinPassword || ''}
                      onChange={e => setField('signinPassword', e.target.value)}
                      placeholder="Your password"
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors pr-10"
                      onKeyDown={e => { if (e.key === 'Enter') handleSignin() }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSigninPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded"
                      aria-label="Toggle password visibility"
                    >
                      {showSigninPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignin}
                disabled={submitting || !fields.signinIdentifier?.trim() || !fields.signinPassword?.trim()}
                className="w-full py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In &rarr;</>}
              </button>
              <div className="text-center mt-4 text-xs text-white/40">
                Don&apos;t have an account?{' '}
                <button onClick={() => setStep(4)} className="text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded">
                  Enter access code &rarr;
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 9 && (
            <StepWrapper key="step-forgot">
              <StepHeader
                label="Reset Password"
                title={forgotPasswordSent ? 'Check Your Email' : 'Forgot Password?'}
                description={forgotPasswordSent
                  ? 'If an account with that email exists, you will receive a password reset link shortly.'
                  : "Enter your email and we'll send you a reset link."
                }
              />
              {!forgotPasswordSent ? (
                <div className="mb-6">
                  <label htmlFor="ea-forgot-email" className="block text-xs text-white/70 font-medium mb-1.5">Email</label>
                  <input
                    id="ea-forgot-email"
                    type="email"
                    value={fields.forgotEmail || ''}
                    onChange={e => setField('forgotEmail', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleForgotPassword() }}
                  />
                </div>
              ) : (
                <div className="mb-6 rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center mb-3">
                    <ArrowRight className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-sm text-white/60">Check your inbox for a password reset link.</p>
                </div>
              )}
              {!forgotPasswordSent ? (
                <button
                  onClick={handleForgotPassword}
                  disabled={submitting || !fields.forgotEmail?.trim()}
                  className="w-full py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link &rarr;</>}
                </button>
              ) : null}
              <div className="text-center mt-4">
                <button onClick={() => setStep(8)} className="text-xs text-blue-400 hover:underline bg-transparent border-none p-0 cursor-pointer inline-flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none rounded">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </button>
              </div>
            </StepWrapper>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// -- Sub-components --

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  )
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors ${
            i < current ? 'bg-blue-500' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}

function StepHeader({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold tracking-wider text-blue-400 uppercase mb-2.5">{label}</div>
      <h3 className="text-xl font-bold text-white font-[family-name:var(--font-syne)] mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  )
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const fieldId = `ea-field-${field.key}`
  if (field.type === 'select' && field.options) {
    return (
      <div>
        <label htmlFor={fieldId} className="block text-xs text-white/70 font-medium mb-1.5">{field.label}</label>
        <select
          id={fieldId}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
        >
          <option value="" className="bg-popover">Select&hellip;</option>
          {field.options.map(opt => (
            <option key={opt} value={opt} className="bg-popover">{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs text-white/70 font-medium mb-1.5">
        {field.label}{field.required && ' *'}
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none transition-colors"
      />
    </div>
  )
}
