"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TwinProfileHeader } from "@/components/twin/twin-profile-header";
import { TwinTabIdentity } from "@/components/twin/twin-tab-identity";
import { TwinTabPersonality } from "@/components/twin/twin-tab-personality";
import { TwinTabVisual } from "@/components/twin/twin-tab-visual";
import { TwinTabVoice } from "@/components/twin/twin-tab-voice";
import { TwinTabCommercial } from "@/components/twin/twin-tab-commercial";
import { TwinTabGovernance } from "@/components/twin/twin-tab-governance";
import { fetchTwins, fetchTwin, fetchCompleteness } from "@/lib/api/twins";
import type { Twin, TwinCompleteness } from "@/lib/api/twins";
import { Fingerprint } from "lucide-react";

export default function TwinPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [completeness, setCompleteness] = useState<TwinCompleteness | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("identity");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["identity", "personality", "visual", "voice", "commercial", "governance"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    window.history.replaceState(null, "", `#${val}`);
  };

  const loadTwin = useCallback(async (id?: string) => {
    const targetId = id || twin?.id;
    if (!targetId) return;
    const full = await fetchTwin(targetId);
    const comp = await fetchCompleteness(targetId);
    setTwin(full);
    setCompleteness(comp);
  }, [twin?.id]);

  useEffect(() => {
    async function load() {
      const twins = await fetchTwins();
      if (twins.length > 0) {
        const best = twins.find((tw) => tw.bio || tw.category) || twins[0];
        await loadTwin(best.id);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <EmptyState
        icon={Fingerprint}
        title="No digital twin yet"
        description="Complete onboarding to create your digital twin and build your ALCM identity."
        ctaLabel="Start Onboarding"
        ctaHref="/onboard"
      />
    );
  }

  return (
    <div>
      <TwinProfileHeader twin={twin} completeness={completeness} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="w-full justify-start inline-flex min-w-max">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="identity"><TwinTabIdentity twin={twin} onUpdate={loadTwin} /></TabsContent>
        <TabsContent value="personality"><TwinTabPersonality twin={twin} onUpdate={loadTwin} /></TabsContent>
        <TabsContent value="visual"><TwinTabVisual twin={twin} onUpdate={loadTwin} /></TabsContent>
        <TabsContent value="voice"><TwinTabVoice twin={twin} onUpdate={loadTwin} /></TabsContent>
        <TabsContent value="commercial"><TwinTabCommercial twin={twin} onUpdate={loadTwin} /></TabsContent>
        <TabsContent value="governance"><TwinTabGovernance twin={twin} onUpdate={loadTwin} /></TabsContent>
      </Tabs>
    </div>
  );
}
