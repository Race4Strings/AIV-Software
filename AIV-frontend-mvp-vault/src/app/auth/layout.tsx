'use client'

import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12" style={{ backgroundColor: '#041030' }}>
      {/* Logo */}
      <div className="mb-10">
        <Link href="/">
          <img src="/aiv.svg" alt="AIV" className="h-7 w-auto" />
        </Link>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
