'use client'

import { useMutation } from '@tanstack/react-query'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { authStorage } from '@/lib/auth-storage'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/lib/api'

export default function SigninPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const signinMutation = useMutation({
    mutationFn: () => authApi.signin({ identifier, password }),
    onSuccess: (data) => {
      toast.success('Signed in successfully')
      if (data) {
        authStorage.saveUser(data.data || data)
      }
      router.push('/dashboard')
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      const message = typeof detail === 'string' ? detail : 'Invalid credentials. Please try again.'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      toast.error('Please enter your email and password')
      return
    }
    signinMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-bold text-3xl tracking-tight text-white">Welcome back</h1>
        <p className="text-white/50 text-base">
          Sign in to your AIV account
        </p>
      </div>

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="identifier" className="text-sm font-medium text-white/70">
            Email or Username
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              id="identifier"
              type="text"
              placeholder="you@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={signinMutation.isPending}
              className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150 pl-11"
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-white/70">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={signinMutation.isPending}
              className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white text-sm placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none focus:outline-none focus:border-blue-500 transition-colors duration-150 pl-11 pr-11"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium shadow-lg shadow-primary/20 hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 mt-1 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          disabled={signinMutation.isPending || !identifier.trim() || !password.trim()}
        >
          {signinMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Sign In
        </button>
      </form>

      {/* Access Code Link */}
      <div className="text-center text-sm text-white/40">
        Have an access code?{' '}
        <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Create your account
        </Link>
      </div>
    </div>
  )
}
