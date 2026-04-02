"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2, Fingerprint, Shield, DollarSign, Activity,
  Bot, CheckCircle2, AlertTriangle, AlertCircle,
  Eye, Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fetchTwins, fetchTwinHealth, lockTwin } from "@/lib/api/twins";
import { guardrailsApi, type GuardrailConfig } from "@/lib/api/guardrails";
import { licensingApi } from "@/lib/api/licensing";

import { TwinTabOverview } from "@/components/twin/twin-tab-overview";
import { TwinTabIdentity } from "@/components/twin/twin-tab-identity";
import { TwinTabHealth } from "@/components/twin/twin-tab-health";
import { TwinTabGuardrails } from "@/components/twin/twin-tab-guardrails";
import { TwinTabLicensing } from "@/components/twin/twin-tab-licensing";
import type { TwinData } from "@/types/twin";

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

const HEALTH_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  HEALTHY: { icon: CheckCircle2, color: "text-emerald-500", label: "Healthy" },
  BUILDING: { icon: Activity, color: "text-blue-500", label: "Building" },
  ATTENTION_NEEDED: { icon: AlertTriangle, color: "text-yellow-500", label: "Attention Needed" },
  ACTION_REQUIRED: { icon: AlertCircle, color: "text-red-500", label: "Action Required" },
};

const CATEGORY_HINTS: Record<string, string> = {
  MUSIC: "$20K\u2013$200K",
  ENTERTAINMENT: "$15K\u2013$100K",
  SPORTS: "$25K\u2013$250K",
  BUSINESS: "$10K\u2013$75K",
  ACADEMIA: "$5K\u2013$30K",
  CULINARY: "$10K\u2013$75K",
  FASHION: "$15K\u2013$150K",
  MEDIA: "$10K\u2013$50K",
  GOVERNMENT: "$10K\u2013$50K",
  WELLNESS: "$5K\u2013$50K",
  ARTS: "$10K\u2013$75K",
  CHARACTER: "$10K\u2013$150K",
  VIRTUAL: "$5K\u2013$50K",
};

export default function TwinPage() {
  const [twin, setTwin] = useState<TwinData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailConfig | null>(null);
  const [licensingRules, setLicensingRules] = useState<Record<string, unknown> | null>(null);
  const [dealCount, setDealCount] = useState(0);
  const [revenue, setRevenue] = useState<{ net_revenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmLock, setConfirmLock] = useState(false);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["overview", "identity", "health", "guardrails", "licensing"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    fetchTwins()
      .then(async (twins) => {
        if (twins.length === 0) { setLoading(false); return; }
        const t = twins[0] as unknown as TwinData;
        setTwin(t);

        const [healthRes, guardrailRes, rulesRes, dealsRes, revenueRes] = await Promise.allSettled([
          fetchTwinHealth(t.id),
          guardrailsApi.get(t.id),
          guardrailsApi.getLicensingRules(t.id),
          licensingApi.getDeals().then((d) => d.length),
          licensingApi.getRevenue(),
        ]);

        if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        if (guardrailRes.status === "fulfilled") setGuardrails(guardrailRes.value.config);
        if (rulesRes.status === "fulfilled") setLicensingRules(rulesRes.value.config);
        if (dealsRes.status === "fulfilled") setDealCount(dealsRes.value);
        if (revenueRes.status === "fulfilled") setRevenue(revenueRes.value);
      })
      .catch(() => {
        toast.error("Failed to load identity data");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    window.history.replaceState(null, "", `#${val}`);
  };

  const healthCfg = useMemo(() => {
    const status = health?.health_status || twin?.health_status || "BUILDING";
    return HEALTH_ICONS[status] || HEALTH_ICONS.BUILDING;
  }, [health, twin]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!twin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Fingerprint className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No digital twin yet</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Start the onboarding process to create your digital twin — your identity, captured, protected, and ready for licensing.
        </p>
        <Link href="/onboard"><Button className="mt-6">Start Onboarding</Button></Link>
      </div>
    );
  }

  const HealthIcon = healthCfg.icon;
  const displayName = twin.display_name || twin.name || "Your Twin";
  const isBuilding = ["BUILDING", "INITIALIZING"].includes(twin.status || "");
  const categories = twin.identity_category?.length ? twin.identity_category : ["ENTERTAINMENT"];
  const category = categories[0];

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Fingerprint className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{displayName}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {categories.map((cat) => (
                <Badge key={cat} variant="outline">{cat}</Badge>
              ))}
              <Tooltip><TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">{twin.status || "INITIALIZING"}</Badge>
              </TooltipTrigger><TooltipContent className="max-w-xs">
                {isBuilding ? "Your identity is being assembled. Visit the Training Area to increase coverage and activate licensing." : "Your identity is active and available for licensing deals."}
              </TooltipContent></Tooltip>
              <span className={`flex items-center gap-1 text-sm ${healthCfg.color}`}>
                <HealthIcon className="h-4 w-4" /> {healthCfg.label}
              </span>
              {twin.talent_authorization_at && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Identity Verified & Protected</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/twin/training-area">
              <Button variant="outline" size="sm"><Bot className="h-4 w-4 mr-1" /> Training Area</Button>
            </Link>
            {twin.status !== "LOCKED" && (
              confirmLock ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Lock this identity?</span>
                  <Button size="sm" variant="destructive" disabled={locking} onClick={async () => {
                    setLocking(true);
                    try {
                      await lockTwin(twin.id);
                      setTwin({ ...twin, status: "LOCKED" });
                      toast.success("Identity locked");
                    } catch { toast.error("Failed to lock"); }
                    setLocking(false);
                    setConfirmLock(false);
                  }}>Yes</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmLock(false)}>No</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmLock(true)}>
                  <Lock className="h-4 w-4" />
                </Button>
              )
            )}
          </div>
        </div>

        {/* Locked banner */}
        {twin.status === "LOCKED" && (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="flex items-center gap-3 py-3">
              <Lock className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-500">Identity Locked</p>
                <p className="text-xs text-muted-foreground">This identity is locked. Licensing portal is closed. Contact support to unlock.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="overview"><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Overview</span></TabsTrigger>
            <TabsTrigger value="identity"><Fingerprint className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Identity</span></TabsTrigger>
            <TabsTrigger value="health"><Activity className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Health</span></TabsTrigger>
            <TabsTrigger value="guardrails"><Shield className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Guardrails</span></TabsTrigger>
            <TabsTrigger value="licensing"><DollarSign className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Licensing Rules</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <TwinTabOverview
              twin={twin}
              health={health}
              categories={categories}
              displayName={displayName}
              isBuilding={isBuilding}
              dealCount={dealCount}
              revenue={revenue}
              categoryHints={CATEGORY_HINTS}
              onTabChange={handleTabChange}
            />
          </TabsContent>

          <TabsContent value="identity">
            <TwinTabIdentity
              twin={twin}
              displayName={displayName}
              categories={categories}
              onTwinUpdate={(updates) => setTwin({ ...twin, ...updates } as TwinData)}
            />
          </TabsContent>

          <TabsContent value="health">
            <TwinTabHealth
              health={health}
              isBuilding={isBuilding}
              healthCfg={healthCfg}
            />
          </TabsContent>

          <TabsContent value="guardrails">
            <TwinTabGuardrails
              twinId={twin.id}
              guardrails={guardrails}
              onGuardrailsChange={(config) => setGuardrails(config)}
            />
          </TabsContent>

          <TabsContent value="licensing">
            <TwinTabLicensing
              twinId={twin.id}
              licensingRules={licensingRules}
              category={category}
              categoryHints={CATEGORY_HINTS}
              onLicensingChange={(config) => setLicensingRules(config)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
