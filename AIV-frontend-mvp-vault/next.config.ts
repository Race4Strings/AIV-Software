import type { NextConfig } from "next";

// Force public URL to avoid Railway internal network timeouts
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Allow large request bodies for video uploads during onboarding
    experimental: {
        serverActions: {
            bodySizeLimit: "50mb",
        },
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "X-DNS-Prefetch-Control", value: "on" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: "/api/backend/:path*",
                destination: `${BACKEND_URL}/:path*`,
            },
        ];
    },
};

export default nextConfig;
