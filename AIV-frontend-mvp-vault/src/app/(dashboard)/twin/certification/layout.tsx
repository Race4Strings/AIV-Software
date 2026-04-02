import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certification — AIV",
  description:
    "Cryptographic proof of ownership for your digital identity.",
};

export default function CertificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
