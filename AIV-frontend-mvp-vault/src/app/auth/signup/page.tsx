'use client'

import { Suspense } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

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
          Start building your digital legacy today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Access Code */}
        <div>
          <label className="block text-xs text-white/70 font-medium mb-1.5">Access Code</label>
          {codeFromUrl ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1.5 text-xs text-green-400 font-mono">
              <ShieldCheck className="h-3.5 w-3.5" />
              {codeFromUrl}
              <span className="text-green-500">Verified</span>
            </div>
          ) : (
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="AIV-XXXXXX"
              className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-wider"
            />
          )}
        </div>

        {/* Name + Username */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/70 font-medium mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              disabled={signupMutation.isPending}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus={!!codeFromUrl}
            />
          </div>
          <div>
            <label className="block text-xs text-white/70 font-medium mb-1.5">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="johndoe"
              disabled={signupMutation.isPending}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs text-white/70 font-medium mb-1.5">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={signupMutation.isPending}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs text-white/70 font-medium mb-1.5">Password *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              disabled={signupMutation.isPending}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          {/* Password strength indicator */}
          {password.length > 0 && (() => {
            const strength = (
              (password.length >= 8 ? 1 : 0) +
              (/[A-Z]/.test(password) ? 1 : 0) +
              (/[0-9]/.test(password) ? 1 : 0) +
              (/[^A-Za-z0-9]/.test(password) ? 1 : 0)
            )
            const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
            const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
            return (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength ? colors[strength - 1] : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white/40">
                  {password.length < 8 ? 'At least 8 characters' : labels[strength]}
                </p>
              </div>
            )
          })()}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs text-white/70 font-medium mb-1.5">Confirm Password *</label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="Confirm your password"
            disabled={signupMutation.isPending}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/12 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#2563eb] text-white text-[15px] font-medium shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:bg-[#3b82f6] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 mt-1"
          disabled={signupMutation.isPending || !name.trim() || !username.trim() || !email.trim() || !password.trim()}
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
