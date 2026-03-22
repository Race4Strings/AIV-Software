'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { setTheme } = useTheme()

  // Force light theme on auth pages
  useEffect(() => {
    setTheme('light')
  }, [setTheme])

  return (
    <div className="grid min-h-svh bg-white text-gray-900">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex items-center justify-center overflow-hidden rounded-md">
              <Image src="/aiv.svg" alt="AIV" width={200} height={200} className="h-[42px] w-[50px] object-contain" />
            </div>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
    </div>
  )
}
