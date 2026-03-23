"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check, Loader2, Circle } from "lucide-react"

export type ActivationStep = {
  id: string
  label: string
  description: string
  status: "pending" | "processing" | "completed"
}

interface ActivationTimelineProps {
  steps: ActivationStep[]
}

export function ActivationTimeline({ steps }: ActivationTimelineProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-xs">
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-4"
        >
          {/* Status Icon */}
          <div className="relative flex-shrink-0">
            <AnimatePresence mode="wait">
              {step.status === "completed" && (
                <motion.div
                  key="completed"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                >
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </motion.div>
              )}
              
              {step.status === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30"
                >
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </motion.div>
              )}
              
              {step.status === "pending" && (
                <motion.div
                  key="pending"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"
                >
                  <Circle className="w-4 h-4 text-slate-400" />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="absolute left-1/2 top-8 w-0.5 h-6 -translate-x-1/2 bg-slate-200 overflow-hidden">
                <motion.div
                  className="w-full bg-green-500"
                  initial={{ height: "0%" }}
                  animate={{ 
                    height: step.status === "completed" ? "100%" : "0%" 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
          
          {/* Label and description */}
          <div className="flex-1 pt-1">
            <div className={`font-medium text-sm transition-colors ${
              step.status === "completed" 
                ? "text-green-600" 
                : step.status === "processing"
                ? "text-blue-600"
                : "text-slate-400"
            }`}>
              {step.label}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {step.status === "completed" && "Completed"}
              {step.status === "processing" && (
                <span className="inline-flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                  {step.description}
                </span>
              )}
              {step.status === "pending" && "Waiting..."}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
