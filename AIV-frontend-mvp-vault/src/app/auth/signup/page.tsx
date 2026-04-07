'use client'

import { Suspense } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'
import { PasswordStrength } from '@/components/shared/password-strength'

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [accessCode, setAccessCode] = useState(codeFromUrl)
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function validateField(field: string, value: string) {
    const errors: Record<string, string> = { ...fieldErrors }
    if (field === 'name' && !value.trim()) errors.name = 'Name is required'
    else if (field === 'name') delete errors.name
    if (field === 'username' && !value.trim()) errors.username = 'Username is required'
    else if (field === 'username' && value.length < 3) errors.username = 'At least 3 characters'
    else if (field === 'username') delete errors.username
    if (field === 'email' && !value.includes('@')) errors.email = 'Enter a valid email'
    else if (field === 'email') delete errors.email
    if (field === 'password' && value.length > 0 && value.length < 8) errors.password = 'At least 8 characters'
    else if (field === 'password') delete errors.password
    setFieldErrors(errors)
  }

  function handleBlur(field: string, value: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, value)
  }

  const signupMutation = useMutation({
    mutationFn: () => authApi.signup({
      name,
      username,
      email,
      password,
      access_code: accessCode || undefined,
    }),
    onSuccess: () => {
      toast.success('Account created! Please verify your email.')
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : detail || 'Sign up failed'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== passwordConfirm) {
      toast.error("Passwords don't match")
      return
    }
    signupMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-bold text-3xl tracking-tight text-white">Create an account</h1>
        <p className="text-white/50 text-base">
          Capture, protect, and license your digital identity
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Access Code */}
        <div>
          <label htmlFor="signup-access-code" className="block text-xs text-white/70 font-medium mb-1.5">Access Code</label>
          {codeFromUrl ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-success/10 border border-success/20 px-3 py-1.5 text-xs text-success font-mono">
              <ShieldCheck className="h-3.5 w-3.5" />
              {codeFromUrl}
              <span className="text-success">Verified</span>
            </div>
          ) : (
            <input
              id="signup-access-code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="AIV-XXXXXX"
              className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150 font-mono tracking-wider"
            />
          )}
        </div>

        {/* Name + Username */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="signup-name" className="block text-xs text-white/70 font-medium mb-1.5">Name *</label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (touched.name) validateField('name', e.target.value); }}
              onBlur={(e) => handleBlur('name', e.target.value)}
              placeholder="Full name"
              maxLength={255}
              disabled={signupMutation.isPending}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border ${touched.name && fieldErrors.name ? 'border-red-500/50' : 'border-white/[0.12]'} text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150`}
              autoFocus={!!codeFromUrl}
            />
            {touched.name && fieldErrors.name && <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="signup-username" className="block text-xs text-white/70 font-medium mb-1.5">Username *</label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); setUsername(v); if (touched.username) validateField('username', v); }}
              onBlur={(e) => handleBlur('username', e.target.value)}
              placeholder="johndoe"
              maxLength={50}
              disabled={signupMutation.isPending}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border ${touched.username && fieldErrors.username ? 'border-red-500/50' : 'border-white/[0.12]'} text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150`}
            />
            {touched.username && fieldErrors.username && <p className="text-xs text-red-400 mt-1">{fieldErrors.username}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="signup-email" className="block text-xs text-white/70 font-medium mb-1.5">Email *</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (touched.email) validateField('email', e.target.value); }}
            onBlur={(e) => handleBlur('email', e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            disabled={signupMutation.isPending}
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border ${touched.email && fieldErrors.email ? 'border-red-500/50' : 'border-white/[0.12]'} text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150`}
          />
          {touched.email && fieldErrors.email && <p className="text-xs text-red-400 mt-1">{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="signup-password" className="block text-xs text-white/70 font-medium mb-1.5">Password *</label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              disabled={signupMutation.isPending}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="signup-password-confirm" className="block text-xs text-white/70 font-medium mb-1.5">Confirm Password *</label>
          <input
            id="signup-password-confirm"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Confirm your password"
            disabled={signupMutation.isPending}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150"
          />
        </div>

        {/* Terms acceptance */}
        <label className="flex items-start gap-2.5 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-primary"
          />
          <span className="text-xs text-white/50 leading-relaxed">
            I agree to the <a href="/legal/terms" target="_blank" className="text-blue-400 hover:underline">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>
          </span>
        </label>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 mt-1 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          disabled={signupMutation.isPending || !name.trim() || !username.trim() || !email.trim() || !password.trim() || !termsAccepted}
        >
          {signupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Account
        </button>
      </form>

      <div className="text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  )
}
