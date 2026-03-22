"use client";

import { useEffect, useState } from "react";
import { AssistantInterface } from "@/components/assistant/assistant-interface";
import { fetchTwins } from "@/lib/api/twins";

/**
 * Training Area — the assistant lives here, inside the Identity section.
 *
 * This is NOT a standalone chat app. It's a focused, intimate space where
 * the talent engages with their digital self through four modes:
 * Assistant, Digital Self, Training, and Refinement.
 */
export default function TrainingAreaPage() {
  const [twinId, setTwinId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTwins()
      .then((twins) => {
        if (twins.length > 0) {
          setTwinId(twins[0].id);
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
    <div className="h-[calc(100vh-4rem)]">
      <AssistantInterface twinId={twinId} />
    </div>
  );
}
