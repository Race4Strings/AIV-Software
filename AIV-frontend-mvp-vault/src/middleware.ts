import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
    '/',                      // Landing page
    '/auth/signin',           // Sign in
    '/auth/signup',           // Account creation
    '/auth/verify',           // Email verification
    '/auth/forgot-password',  // Password reset request
    '/auth/reset-password',   // Password reset
    '/verify',                // Public seal verification
    '/calibration',           // Precision Tuning (has its own auth check)
    '/onboard',               // Onboarding (has its own auth check)
    '/admin',                 // Admin (has its own auth check)
]

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public routes
    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.next()
    }

    // Check for session cookie (set by backend as httponly cookie)
    const sessionCookie = request.cookies.get('session_id')

    if (!sessionCookie?.value) {
        // No session — redirect to signin for protected routes
        // Preserve the intended destination so we can redirect back after login
        const signinUrl = new URL('/auth/signin', request.url)
        signinUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(signinUrl)
    }

    // Session cookie exists — allow through
    // The backend validates the session on every API call via require_auth
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$|fonts).*)',
    ],
}
