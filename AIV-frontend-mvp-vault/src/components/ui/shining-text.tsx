"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface ShiningTextProps {
  text: string;
}

export function ShiningText({ text }: ShiningTextProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.h1
      className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-base font-regular text-transparent"
      initial={{ backgroundPosition: "200% 0" }}
      animate={reducedMotion ? { backgroundPosition: "200% 0" } : { backgroundPosition: "-200% 0" }}
      transition={reducedMotion ? { duration: 0 } : {
        repeat: Infinity,
        duration: 2,
        ease: "linear",
      }}
    >
      {text}
    </motion.h1>
  );
}

