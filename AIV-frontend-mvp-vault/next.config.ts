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
    async rewrites() {
        return [
            {
                // Proxy /api/backend/* to the Backend
                // This avoids cross-origin issues — browser sees same origin
                source: "/api/backend/:path*",
                destination: `${BACKEND_URL}/:path*`,
            },
        ];
    },
};

export default nextConfig;
