/**
 * Streaming SSE proxy for AI chat.
 * Next.js rewrites buffer SSE responses. This custom route handler
 * properly streams them through without buffering.
 */
import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Forward cookies for auth
  const cookie = req.headers.get("cookie") || "";

  const upstream = await fetch(`${BACKEND_URL}/aiv/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body,
  });

  if (!upstream.ok) {
    return new Response(upstream.statusText, { status: upstream.status });
  }

  // Stream the SSE response through without buffering
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
