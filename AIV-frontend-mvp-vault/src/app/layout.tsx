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
    "Capture, certify, and license your digital identity — with full control over every guardrail and every deal. Built for athletes, musicians, actors, executives, and creators.",
  keywords: [
    "AI",
    "digital identity",
    "identity protection",
    "AI licensing",
    "digital twin",
    "identity infrastructure",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AIV — Own Your Digital Identity",
    description:
      "Capture, certify, and license your digital identity — with full control over every guardrail and every deal. Built for athletes, musicians, actors, executives, and creators.",
    siteName: "AIV",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AIV — Own Your Digital Identity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIV — Own Your Digital Identity",
    description:
      "Capture, certify, and license your digital identity — with full control over every guardrail and every deal. Built for athletes, musicians, actors, executives, and creators.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/SatoshiVF.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AIV",
              url: "https://aiv.chat",
              logo: "https://aiv.chat/aiv.svg",
              description: "Digital identity infrastructure for high-profile talent. Capture, certify, and license your digital identity.",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-background font-sans antialiased" suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:shadow-lg">
          Skip to main content
        </a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
