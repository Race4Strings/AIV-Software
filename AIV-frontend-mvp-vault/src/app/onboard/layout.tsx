import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboarding — AIV",
  description: "Set up your digital identity.",
};

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
