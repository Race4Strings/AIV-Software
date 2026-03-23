"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaceScanner } from "./face-scanner";
import { ActivationTimeline, ActivationStep } from "./activation-timeline";
import { Sparkles } from "lucide-react";

interface ActivationViewProps {
  cloneId: string;
  cloneName: string;
  userImage?: string;
  onComplete?: () => void;
}

const INITIAL_STEPS: ActivationStep[] = [
  {
    id: "voice",
    label: "Voice",
    description: "Analyzing your voice...",
    status: "pending",
  },
  {
    id: "avatar",
    label: "Avatar",
    description: "Creating your portrait...",
    status: "pending",
  },
  {
    id: "personality",
    label: "Personality",
    description: "Understanding your essence...",
    status: "pending",
  },
  {
    id: "finalize",
    label: "Finalizing",
    description: "Putting it all together...",
    status: "pending",
  },
];

export function ActivationView({
  cloneId,
  cloneName,
  userImage,
  onComplete,
}: ActivationViewProps) {
  const [steps, setSteps] = useState<ActivationStep[]>(INITIAL_STEPS);
  const [isComplete, setIsComplete] = useState(false);

  // Poll for status updates
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/clones/${cloneId}`
        );
        if (response.ok) {
          const data = await response.json();

          // Update steps based on processing_step from backend
          const newSteps = [...INITIAL_STEPS];
          const currentStep = data.processing_step || 0;

          // Mark completed steps based on processing_step
          // Step 1 = voice, 2 = avatar, 3 = personality, 4 = finalize
          for (let i = 0; i < 4; i++) {
            if (currentStep > i + 1) {
              newSteps[i].status = "completed";
            } else if (currentStep === i + 1) {
              newSteps[i].status = "processing";
            } else {
              newSteps[i].status = "pending";
            }
          }

          // Check if fully complete
          if (data.status === "completed") {
            newSteps.forEach((s) => (s.status = "completed"));
            setIsComplete(true);
            setTimeout(() => onComplete?.(), 2000);
          }

          setSteps(newSteps);
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [cloneId, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <AnimatePresence mode="wait">
        {!isComplete ? (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            className="flex flex-col md:flex-row items-center gap-12"
          >
            {/* Face Scanner */}
            <div className="flex flex-col items-center gap-6">
              <FaceScanner imageUrl={userImage} isScanning={!isComplete} />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-slate-800">
                  Activating {cloneName}
                </h2>
                <p className="text-slate-500 mt-1">
                  Creating your digital likeness...
                </p>
              </motion.div>
            </div>

            {/* Timeline */}
            <ActivationTimeline steps={steps} />
          </motion.div>
        ) : (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="text-center"
          >
            {/* Success burst */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ duration: 0.6 }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/40">
                <Sparkles className="w-12 h-12 text-white" />
              </div>

              {/* Celebration particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: "50%",
                    top: "50%",
                    background: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"][
                      i % 4
                    ],
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 12) * 120,
                    y: Math.sin((i * Math.PI * 2) / 12) * 120,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              ))}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-slate-800"
            >
              Likeness Activated!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-slate-500 mt-2"
            >
              {cloneName} is ready to represent you
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
