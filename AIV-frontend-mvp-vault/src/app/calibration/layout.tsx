import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precision Tuning — AIV",
  description:
    "Improve your digital twin's accuracy with personality calibration.",
};

export default function CalibrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
