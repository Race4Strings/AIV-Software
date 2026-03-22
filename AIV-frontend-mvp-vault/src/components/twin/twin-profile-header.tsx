import { StatusBadge } from "@/components/shared/status-badge";
import type { Twin, TwinCompleteness } from "@/lib/api/twins";
import { Shield, ShieldCheck, Calendar } from "lucide-react";

interface TwinProfileHeaderProps {
  twin: Twin;
  completeness: TwinCompleteness | null;
}

export function TwinProfileHeader({ twin, completeness }: TwinProfileHeaderProps) {
  const score = completeness?.completeness_score ?? twin.completeness_score;
  const scorePercent = Math.round(score * 100);
  const isCertified = twin.status === "certified" && twin.certified_at;

  return (
    <div className="mb-8 space-y-4">
      {/* Protection Banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${isCertified
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-amber-500/20 bg-amber-500/5"
        }`}>
        {isCertified ? (
          <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
        ) : (
          <Shield className="size-5 text-amber-500 shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${isCertified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {isCertified ? "Identity Certified & Protected" : "Identity Captured — Certification Pending"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCertified
              ? `Cryptographic proof created on ${new Date(twin.certified_at!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : "Certify your identity to create a tamper-proof record of your digital likeness"}
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Shield className="size-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{twin.name}</h1>
              <StatusBadge status={twin.status} />
            </div>
            {twin.public_name && (
              <p className="text-sm text-muted-foreground">{twin.public_name}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {twin.category && (
                <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{twin.category}</span>
              )}
              {twin.certified_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Certified {new Date(twin.certified_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-[200px] items-center gap-4">
          <div className="relative size-16 shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeDasharray="100, 100"
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
                stroke="currentColor"
              />
              <path
                className="text-primary transition-all duration-1000 ease-in-out"
                strokeDasharray={`${scorePercent}, 100`}
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {scorePercent}%
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">Completeness</p>
            {completeness?.missing_sections && completeness.missing_sections.length > 0 ? (
              <p className="text-xs text-muted-foreground line-clamp-2" title={completeness.missing_sections.join(", ")}>
                Missing: {completeness.missing_sections.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">All sections complete</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
