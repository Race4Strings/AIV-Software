import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Identity — AIV",
  description:
    "Manage your digital identity profile, health, guardrails, and licensing rules.",
};

export default function TwinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
