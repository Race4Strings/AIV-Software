"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("If that email exists, a reset link has been sent.");
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
      toast.success("If that email exists, a reset link has been sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-sm text-muted-foreground text-balance">
          {sent
            ? "Check your email for a reset link."
            : "Enter your email and we'll send you a reset link."}
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send Reset Link
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-6 text-center">
          <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            If an account with that email exists, you&apos;ll receive a password reset link shortly.
          </p>
        </div>
      )}

      <div className="text-center">
        <Link href="/auth/signin" className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
