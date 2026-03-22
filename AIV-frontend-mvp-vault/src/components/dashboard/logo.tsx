import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import React from "react"

export function Logo({
  className,
  href = "/",
  ...props
}: Partial<React.ComponentProps<typeof Link>>) {
  return (
    <Link
      href={href}
      className={cn("flex items-center justify-center gap-2 font-medium transition-all", className)}
      {...props}
    >
      <div className="relative flex items-center justify-center">
        <Image
          src="/aiv.svg"
          alt="Logo"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
        />
      </div>
    </Link>
  )
}
