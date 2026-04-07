"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Loader2, Fingerprint, Shield, DollarSign, Activity,
  Bot, CheckCircle2, AlertTriangle, AlertCircle,
  Lock, Unlock, Volume2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fetchTwins, fetchTwinHealth, lockTwin, unlockTwin, textToSpeech } from "@/lib/api/twins";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { guardrailsApi, type GuardrailConfig } from "@/lib/api/guardrails";

import { TwinTabIdentity } from "@/components/twin/twin-tab-identity";
import { TwinTabHealth } from "@/components/twin/twin-tab-health";
import { TwinTabGuardrails } from "@/components/twin/twin-tab-guardrails";
import { TwinTabLicensing } from "@/components/twin/twin-tab-licensing";
import type { TwinData } from "@/types/twin";
import { humanizeEnum } from "@/lib/humanize";

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

const HEALTH_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  HEALTHY: { icon: CheckCircle2, color: "text-success", label: "Healthy" },
  BUILDING: { icon: Activity, color: "text-primary", label: "Building" },
  ATTENTION_NEEDED: { icon: AlertTriangle, color: "text-warning", label: "Attention Needed" },
  ACTION_REQUIRED: { icon: AlertCircle, color: "text-destructive", label: "Action Required" },
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["identity", "health", "guardrails", "licensing"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    fetchTwins()
      .then(async (twins) => {
        if (twins.length === 0) { setLoading(false); return; }
        const t = twins[0] as unknown as TwinData;
        setTwin(t);

        const [healthRes, guardrailRes, rulesRes] = await Promise.allSettled([
          fetchTwinHealth(t.id),
          guardrailsApi.get(t.id),
          guardrailsApi.getLicensingRules(t.id),
        ]);

        if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        if (guardrailRes.status === "fulfilled") setGuardrails(guardrailRes.value.config);
        if (rulesRes.status === "fulfilled") setLicensingRules(rulesRes.value.config);
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

  async function handleTTS() {
    if (ttsLoading || !twin) return;
    setTtsLoading(true);
    try {
      const introText = `Hello, I am ${twin.display_name}'s digital identity. I speak, think, and respond the way they do — built from their real voice, personality, and expertise.`;
      const result = await textToSpeech(twin.id, introText);
      if (result && audioRef.current) {
        const url = URL.createObjectURL(result);
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch {
      toast.error("Voice synthesis unavailable");
    }
    setTtsLoading(false);
  }

  const healthCfg = useMemo(() => {
    const status = health?.health_status || twin?.health_status || "BUILDING";
    return HEALTH_ICONS[status] || HEALTH_ICONS.BUILDING;
  }, [health, twin]);

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        {/* Tab bar skeleton */}
        <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
        {/* Card body skeleton */}
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
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
                <Badge key={cat} variant="outline">{humanizeEnum(cat)}</Badge>
              ))}
              <Tooltip><TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">{humanizeEnum(twin.status || "INITIALIZING")}</Badge>
              </TooltipTrigger><TooltipContent className="max-w-xs">
                {isBuilding ? "Your identity is being assembled. Visit the Training Area to increase coverage and activate licensing." : "Your identity is active and available for licensing deals."}
              </TooltipContent></Tooltip>
              <span className={`flex items-center gap-1 text-sm ${healthCfg.color}`}>
                <HealthIcon className="h-4 w-4" /> {healthCfg.label}
              </span>
              {twin.talent_authorization_at && (
                <Badge variant="outline" className="bg-success/10 text-success">Identity Verified & Protected</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/twin/training-area">
              <Button variant="outline" size="sm"><Bot className="h-4 w-4 mr-1" /> Training Area</Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={handleTTS} disabled={ttsLoading || twin.status === "LOCKED"}>
              {ttsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              <span className="hidden sm:inline">Hear Your Twin</span>
            </Button>
            {twin.status !== "LOCKED" ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowLockDialog(true)}>
                <Lock className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowUnlockDialog(true)}>
                <Unlock className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Locked banner */}
        {twin.status === "LOCKED" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-3">
              <Lock className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Identity Locked</p>
                <p className="text-xs text-muted-foreground">This identity is locked. Licensing portal is closed. Use the unlock button to restore access.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="identity"><Fingerprint className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Identity</span></TabsTrigger>
            <TabsTrigger value="health"><Activity className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Health</span></TabsTrigger>
            <TabsTrigger value="guardrails"><Shield className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Guardrails</span></TabsTrigger>
            <TabsTrigger value="licensing"><DollarSign className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5">Licensing Rules</span></TabsTrigger>
          </TabsList>

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

      <ConfirmDialog
        open={showLockDialog}
        onOpenChange={setShowLockDialog}
        title="Lock Identity"
        description="Locking will prevent all licensing, training, and modifications to this identity."
        consequence="This action requires your password and cannot be undone without unlocking."
        requirePassword
        confirmLabel="Lock Identity"
        variant="destructive"
        loading={lockLoading}
        onConfirm={async (password) => {
          setLockLoading(true);
          try {
            await lockTwin(twin.id, password!);
            setTwin({ ...twin, status: "LOCKED" });
            toast.success("Identity locked", { description: `Locked at ${new Date().toLocaleString()}` });
            setShowLockDialog(false);
          } catch { toast.error("Failed to lock identity"); }
          setLockLoading(false);
        }}
      />

      <ConfirmDialog
        open={showUnlockDialog}
        onOpenChange={setShowUnlockDialog}
        title="Unlock Identity"
        description="Unlocking will restore this identity to its previous active state."
        requirePassword
        confirmLabel="Unlock Identity"
        variant="default"
        loading={lockLoading}
        onConfirm={async (password) => {
          setLockLoading(true);
          try {
            await unlockTwin(twin.id, password!);
            setTwin({ ...twin, status: "ACTIVE" });
            toast.success("Identity unlocked", { description: `Unlocked at ${new Date().toLocaleString()}` });
            setShowUnlockDialog(false);
          } catch { toast.error("Failed to unlock identity"); }
          setLockLoading(false);
        }}
      />

      <audio ref={audioRef} className="hidden" />
    </TooltipProvider>
  );
}
