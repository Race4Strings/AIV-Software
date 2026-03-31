"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: password });
      setDone(true);
      toast.success("Password reset successfully.");
    } catch {
      toast.error("Reset failed. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">Invalid Link</h1>
          <p className="text-sm text-muted-foreground text-balance">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <div className="text-center">
          <Link href="/auth/forgot-password" className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">New Password</h1>
        <p className="text-sm text-muted-foreground text-balance">
          {done ? "Your password has been reset." : "Enter your new password below."}
        </p>
      </div>

      {!done ? (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
              minLength={8}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting || !password || !confirmPassword}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Reset Password
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
          <p className="text-sm text-muted-foreground mb-4">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Button onClick={() => router.push("/auth/signin")} className="bg-blue-600 hover:bg-blue-700 text-white">
            Sign In
          </Button>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
