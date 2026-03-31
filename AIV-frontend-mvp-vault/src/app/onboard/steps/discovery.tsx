"use client";

import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiscoveryStepProps } from "../types";

export function DiscoveryStep({
  discoveryInput,
  setDiscoveryInput,
  loading,
  isManager,
  startDiscovery,
}: DiscoveryStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-bold">Who are we building for?</h2>
        <p className="mt-2 text-muted-foreground">
          {isManager
            ? "Enter your client\u2019s name, handle, or URL and we\u2019ll do the rest \u2014 searching public profiles, interviews, articles, and media to build a comprehensive foundation for their digital identity."
            : "Enter a name, handle, or URL and we\u2019ll do the rest \u2014 searching public profiles, interviews, articles, and media to build a comprehensive foundation for your digital identity."}
        </p>
      </div>
      <Input
        value={discoveryInput}
        onChange={(e) => setDiscoveryInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && startDiscovery()}
        placeholder="Enter a name, @handle, or URL"
        className="text-lg py-5"
        autoFocus
      />
      <Button onClick={startDiscovery} disabled={!discoveryInput.trim() || loading} className="w-full py-5 text-base">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Search className="h-5 w-5 mr-2" />}
        Build My Identity
      </Button>
    </div>
  );
}
