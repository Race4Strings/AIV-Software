import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://aiv.chat"),
  title: "AIV — Own Your Digital Identity",
  description:
    "Own your identity in the AI economy. AIV certifies, protects, and licenses your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and a global licensing rail that generates recurring revenue on autopilot.",
  keywords: [
    "AI",
    "digital identity",
    "identity protection",
    "AI licensing",
    "digital twin",
    "identity infrastructure",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "AIV — Own Your Digital Identity",
    description:
      "Own your identity in the AI economy. AIV certifies, protects, and licenses your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and a global licensing rail that generates recurring revenue on autopilot.",
    siteName: "AIV",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIV — Own Your Digital Identity",
    description:
      "Own your identity in the AI economy. AIV certifies, protects, and licenses your digital twin with cryptographic proof-of-ownership, custom behavioral guardrails, and a global licensing rail that generates recurring revenue on autopilot.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
