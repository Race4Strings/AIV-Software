'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { Suspense } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

function VerifyPageContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const devOtpFromSignup = searchParams.get('dev_otp') || ''
  const [otp, setOtp] = React.useState('')
  const [devOtp, setDevOtp] = React.useState(devOtpFromSignup)

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      toast.success('Email verified successfully!')
      if (data) {
        localStorage.setItem('user', JSON.stringify(data))
      }
      // Redirect to dashboard
      window.location.href = '/'
    },
    onError: (error: Error & { response?: { data?: { detail?: string | Array<{ msg: string }> } } }) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) 
        ? detail[0]?.msg || 'Verification failed'
        : detail || 'Verification failed'
      toast.error(message)
    },
  })

  const resendMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: (data) => {
      toast.success('Verification code resent!')
      if (data?.dev_otp) {
        setDevOtp(data.dev_otp)
      }
    },
    onError: (error: Error & { response?: { data?: { detail?: string | Array<{ msg: string }> } } }) => {
      const detail = error?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to resend code'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length === 6) {
      verifyMutation.mutate({ email, otp })
    }
  }

  return (
    <div className={cn('flex flex-col gap-6')}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-bold text-2xl">Verify your email</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent a 6-digit verification code to{' '}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {devOtp && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Dev Mode — Your verification code:</p>
          <p className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-700 dark:text-amber-300">{devOtp}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg tracking-widest"
            maxLength={6}
            disabled={verifyMutation.isPending}
          />
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={otp.length !== 6 || verifyMutation.isPending}
        >
          {verifyMutation.isPending && (
            <Loader2 className="size-4 animate-spin mr-2" />
          )}
          Verify Email
        </Button>
      </form>

      <div className="text-center text-sm">
        Didn&apos;t receive the code?{' '}
        <button
          type="button"
          onClick={() => resendMutation.mutate({ email })}
          disabled={resendMutation.isPending}
          className="underline underline-offset-4 hover:text-primary disabled:opacity-50"
        >
          {resendMutation.isPending ? 'Sending...' : 'Resend'}
        </button>
      </div>

      <div className="text-center text-sm">
        <Link href="/auth/signin" className="underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center"><Loader2 className="animate-spin" /></div>}>
      <VerifyPageContent />
    </Suspense>
  )
}
