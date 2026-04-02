import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — AIV",
  description: "Account settings, notifications, and security.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
