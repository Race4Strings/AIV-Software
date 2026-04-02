import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center gap-6 max-w-md">
        <Image src="/aiv.svg" alt="AIV" width={48} height={48} className="mb-2" />

        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-muted/50">
          <Shield className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Return to Dashboard
        </Link>

        <p className="text-xs text-muted-foreground/60 mt-4">AIV &mdash; Identity Infrastructure</p>
      </div>
    </div>
  );
}
