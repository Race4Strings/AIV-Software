import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — AIV",
  description: "Access codes and waitlist management.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
