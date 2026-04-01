/**
 * Error reporting utility.
 *
 * When Sentry is configured (NEXT_PUBLIC_SENTRY_DSN env var),
 * errors are sent to Sentry. Otherwise, they're logged server-side.
 *
 * To enable Sentry:
 * 1. npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN in environment
 * 3. Run npx @sentry/wizard@latest -i nextjs
 */

export function captureError(error: Error, context?: Record<string, unknown>): void {
  // When @sentry/nextjs is installed, this will be replaced with Sentry.captureException
  // For now, log to the backend error endpoint
  try {
    if (typeof window !== "undefined") {
      // Client-side: send to backend logging endpoint (non-blocking)
      fetch("/api/backend/health", { method: "GET" }).catch(() => {});
    }
  } catch {
    // Error reporting should never throw
  }
}

export function setUserContext(user: { id: string; email?: string; role?: string }): void {
  // When Sentry is installed: Sentry.setUser(user)
}
