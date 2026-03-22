import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface JsonCardDisplayProps {
  data: Record<string, unknown>;
  className?: string;
}

function formatLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function JsonCardDisplay({ data, className }: JsonCardDisplayProps) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);

  if (entries.length === 0) return null;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {entries.map(([key, value]) => (
        <Card key={key} className="bg-muted/50">
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{formatLabel(key)}</p>
            {typeof value === "object" && !Array.isArray(value) && value !== null ? (
              <div className="space-y-1">
                {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                  <p key={k} className="text-sm">
                    <span className="text-muted-foreground">{formatLabel(k)}:</span>{" "}
                    {renderValue(v)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">{renderValue(value)}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
