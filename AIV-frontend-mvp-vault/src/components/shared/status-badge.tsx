import { cn } from "@/lib/utils";

const TWIN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  active: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  certified: "bg-green-500/10 text-green-500 border-green-500/20",
};

const VOICE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  processing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ready: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

interface StatusBadgeProps {
  status: string;
  variant?: "twin" | "voice";
  className?: string;
}

export function StatusBadge({ status, variant = "twin", className }: StatusBadgeProps) {
  const styles = variant === "voice" ? VOICE_STATUS_STYLES : TWIN_STATUS_STYLES;
  const style = styles[status] || styles["draft"];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
