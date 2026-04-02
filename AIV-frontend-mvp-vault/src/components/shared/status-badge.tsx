import { cn } from "@/lib/utils";

const TWIN_STATUS_STYLES: Record<string, string> = {
  draft: "bg-warning/10 text-warning border-warning/20",
  active: "bg-primary/10 text-primary border-primary/20",
  certified: "bg-success/10 text-success border-success/20",
};

const VOICE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  processing: "bg-warning/10 text-warning border-warning/20",
  ready: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
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
