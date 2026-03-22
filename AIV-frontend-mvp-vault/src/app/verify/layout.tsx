import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Certification — AIV",
  description:
    "Verify the authenticity of a digital identity certification issued through the AIV platform.",
  openGraph: {
    title: "AIV Identity Verification",
    description: "This digital identity has been certified through the AIV Identity Protection Platform.",
    type: "website",
    siteName: "AIV — The Vault",
  },
  twitter: {
    card: "summary",
    title: "AIV Identity Verification",
    description: "This digital identity has been certified through the AIV Identity Protection Platform.",
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark min-h-screen bg-[oklch(0.13_0.015_262)] text-[oklch(0.96_0.005_262)]">
      {children}
    </div>
  );
}
