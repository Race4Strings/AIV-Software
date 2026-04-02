'use client'

import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

function VerifyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [otp, setOtp] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Resend cooldown (60 seconds)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      toast.success('Email verified successfully!')
      if (data) {
        localStorage.setItem('user', JSON.stringify(data))
      }
      window.location.href = '/onboard'
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail)
        ? detail[0]?.msg || 'Verification failed'
        : detail || 'Verification failed'
      toast.error(message)
    },
  })

  const resendMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: () => {
      toast.success('Verification code resent!')
      setCooldown(60)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to resend code'
      toast.error(message)
    },
  })

  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtp(value)
  }, [])

  // Handle paste — extract digits from pasted content
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      setOtp(pasted)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      verifyMutation.mutate({ email, otp })
    }
  }

  const handleResend = () => {
    if (cooldown > 0) return
    resendMutation.mutate({ email })
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-bold text-3xl tracking-tight text-white">Verify your email</h1>
        <p className="text-white/50 text-base">
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-medium text-blue-400">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={otp}
            onChange={handleOtpChange}
            onPaste={handlePaste}
            className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-lg placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors font-mono tracking-[0.3em] text-center"
            maxLength={6}
            disabled={verifyMutation.isPending}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-primary text-white text-[15px] font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          disabled={otp.length !== 6 || verifyMutation.isPending}
        >
          {verifyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Verify Email
        </button>
      </form>

      <div className="text-center text-sm text-white/50">
        Didn&apos;t receive the code?{' '}
        {cooldown > 0 ? (
          <span className="text-white/30">
            Resend in {cooldown}s
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendMutation.isPending}
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50"
          >
            {resendMutation.isPending ? 'Sending...' : 'Resend'}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-white/30">
        Didn&apos;t receive it? Check your spam or promotions folder.
      </p>

      <div className="text-center text-sm">
        <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>}>
      <VerifyPageContent />
    </Suspense>
  )
}
