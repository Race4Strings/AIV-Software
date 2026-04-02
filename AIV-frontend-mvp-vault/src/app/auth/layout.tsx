'use client'

import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark relative flex min-h-screen flex-col items-center justify-center px-6 py-12 bg-[oklch(0.11_0.015_262)]">
      {/* Subtle radial gradient for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative mb-10">
        <Link href="/">
          <img src="/aiv.svg" alt="AIV" className="h-7 w-auto" />
        </Link>
      </div>

      {/* Form Container */}
      <div className="relative w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
