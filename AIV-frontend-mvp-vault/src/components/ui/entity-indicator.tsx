"use client";

import { cn } from "@/lib/utils";

interface EntityIndicatorProps {
  /** "human" for full circle, "ai" for half circle */
  type: "human" | "ai";
  /** Whether the entity is available/active */
  isAvailable?: boolean;
  /** Size of the indicator */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-4 w-4",
  xl: "h-7 w-7", // Reduced from 8 (32px) to 7 (28px)
};

/**
 * Entity type indicator
 * - Full circle = Real Human
 * - Half circle (split) = AI Person
 *
 * Colors:
 * - Available: blue (or green for active state)
 * - Unavailable: gray
 */
export function EntityIndicator({
  type,
  isAvailable = true,
  size = "md",
  className,
}: EntityIndicatorProps) {
  const sizeClass = sizeClasses[size];

  if (type === "human") {
    // Full solid circle for humans
    return (
      <div
        className={cn(
          sizeClass,
          "rounded-full border border-white shadow-sm",
          isAvailable ? "bg-blue-500" : "bg-gray-400",
          className
        )}
        title="Human"
      />
    );
  }

  // Half circle for AI Person
  return (
    <div
      className={cn(
        sizeClass,
        "rounded-full shadow-sm overflow-hidden -rotate-90",
        isAvailable ? "border-blue-600" : "border-gray-400",
        className
      )}
      style={{
        borderWidth: size === "xl" ? "2px" : "1.5px", // Explicit border width to be visible, reduced from 3px for XL
        background: isAvailable
          ? "linear-gradient(135deg, #2563eb 50%, #ffffff 50%)"
          : "linear-gradient(135deg, #9ca3af 50%, #ffffff 50%)",
      }}
      title="AI Person"
    />
  );
}
