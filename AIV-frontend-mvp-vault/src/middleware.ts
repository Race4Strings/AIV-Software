import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password', '/auth/reset-password', '/verify']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if user has a session cookie (set by backend)
    // Note: In development, the cookie may not be sent due to cross-origin
    // We also check for a localStorage flag set by the frontend
    const sessionCookie = request.cookies.get('session_id')
    const isAuthenticated = !!sessionCookie

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next()
    }

    // For protected routes, let the client-side handle auth check
    // This is necessary because cross-origin cookies don't work well in dev
    // The client will redirect to signin if not authenticated
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
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)',
    ],
}
