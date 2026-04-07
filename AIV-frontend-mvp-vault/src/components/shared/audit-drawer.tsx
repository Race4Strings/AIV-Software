"use client";

import { Clock, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeEnum } from "@/lib/humanize";

export interface AuditEntry {
  id: string;
  action: string;
  entity_type?: string;
  details?: string;
  created_at: string;
  actor_name?: string;
}

interface AuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  entityId?: string;
  entries: AuditEntry[];
  loading?: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pl-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-3 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <FileText className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No activity yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Actions taken on this record will appear here.
      </p>
    </div>
  );
}

function TimelineEntry({ entry }: { entry: AuditEntry }) {
  const relativeTime = formatDistanceToNow(new Date(entry.created_at), {
    addSuffix: true,
  });

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Vertical connector line */}
      <div className="absolute left-[5px] top-3 -bottom-3 w-px bg-border last:hidden" />

      {/* Dot */}
      <div className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-tight">
          {humanizeEnum(entry.action)}
        </p>

        {entry.actor_name && (
          <p className="text-xs text-muted-foreground">
            by {entry.actor_name}
          </p>
        )}

        {entry.details && (
          <p className="text-xs text-muted-foreground">{entry.details}</p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{relativeTime}</span>
        </div>
      </div>
    </div>
  );
}

export function AuditDrawer({
  open,
  onOpenChange,
  title = "Activity Log",
  entries,
  loading = false,
}: AuditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {entries.length > 0
              ? `${entries.length} recorded ${entries.length === 1 ? "event" : "events"}`
              : "Timeline of actions and changes"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <LoadingSkeleton />
          ) : entries.length === 0 ? (
            <EmptyTimeline />
          ) : (
            <div className="relative">
              {entries.map((entry) => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
