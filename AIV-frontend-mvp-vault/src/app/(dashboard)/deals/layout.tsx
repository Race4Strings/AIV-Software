import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deals — AIV",
  description:
    "Manage licensing deals and revenue for your digital identity.",
};

export default function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
