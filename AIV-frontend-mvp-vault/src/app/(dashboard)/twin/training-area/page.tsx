"use client";

import { useEffect, useState } from "react";
import { Bot, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AssistantInterface } from "@/components/assistant/assistant-interface";
import { fetchTwins } from "@/lib/api/twins";

export default function TrainingAreaPage() {
  const [twinId, setTwinId] = useState<string | undefined>();
  const [twinName, setTwinName] = useState("");
  const [twinStatus, setTwinStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTwins()
      .then((twins) => {
        if (twins.length > 0) {
          const t = twins[0] as unknown as Record<string, unknown>;
          setTwinId(t.id as string);
          setTwinName((t.display_name as string) || (t.name as string) || "Your Twin");
          setTwinStatus((t.health_status as string) || "BUILDING");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b px-6 py-3 shrink-0">
        <Bot className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-sm font-semibold">Training Area</h1>
          <p className="text-xs text-muted-foreground">{twinName}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          <Activity className="h-3 w-3 mr-1" />
          {twinStatus.toLowerCase().replace("_", " ")}
        </Badge>
      </div>

      {/* Assistant */}
      <div className="flex-1 min-h-0">
        <AssistantInterface twinId={twinId} />
      </div>
    </div>
  );
}
