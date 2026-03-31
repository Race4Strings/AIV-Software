"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2, Fingerprint, Shield, DollarSign, Activity,
  Bot, CheckCircle2, AlertTriangle, AlertCircle, Pencil, Save, X,
  BadgeCheck, Briefcase, TrendingUp, Clock, Eye, Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea as TextareaUI } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fetchTwins, fetchTwinHealth, updateTwin, lockTwin } from "@/lib/api/twins";
import { guardrailsApi, type GuardrailConfig } from "@/lib/api/guardrails";
import { licensingApi } from "@/lib/api/licensing";

interface TwinData {
  id: string;
  display_name?: string;
  name?: string;
  public_name?: string;
  bio?: string;
  identity_category?: string[];
  clone_type?: string;
  status?: string;
  health_status?: string;
  talent_authorization_at?: string;
  alcm_twin_id?: string;
  created_at?: string;
  updated_at?: string;
}

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
  MUSIC: "$20K–$200K",
  ENTERTAINMENT: "$15K–$100K",
  SPORTS: "$25K–$250K",
  BUSINESS: "$10K–$75K",
  ACADEMIA: "$5K–$30K",
  CULINARY: "$10K–$75K",
  FASHION: "$15K–$150K",
  MEDIA: "$10K–$50K",
  GOVERNMENT: "$10K–$50K",
  WELLNESS: "$5K–$50K",
  ARTS: "$10K–$75K",
  CHARACTER: "$10K–$150K",
  VIRTUAL: "$5K–$50K",
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

  // Edit states
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identityDraft, setIdentityDraft] = useState<Record<string, string>>({});
  const [editingGuardrails, setEditingGuardrails] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [locking, setLocking] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [guardrailDraft, setGuardrailDraft] = useState<Record<string, unknown>>({});
  const [rulesDraft, setRulesDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

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
      .catch(() => {})
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

        {/* Tabs — 5 tabs with Overview as default */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview"><Eye className="h-3.5 w-3.5 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="identity"><Fingerprint className="h-3.5 w-3.5 mr-1" /> Identity</TabsTrigger>
            <TabsTrigger value="health"><Activity className="h-3.5 w-3.5 mr-1" /> Health</TabsTrigger>
            <TabsTrigger value="guardrails"><Shield className="h-3.5 w-3.5 mr-1" /> Guardrails</TabsTrigger>
            <TabsTrigger value="licensing"><DollarSign className="h-3.5 w-3.5 mr-1" /> Licensing Rules</TabsTrigger>
          </TabsList>

          {/* ============== OVERVIEW TAB (NEW — hero view) ============== */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Hero identity card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                <div className="flex items-start gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background/80 border border-border/50 shadow-sm">
                    <Fingerprint className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    {twin.public_name && twin.public_name !== displayName && (
                      <p className="text-sm text-muted-foreground mt-0.5">aka {twin.public_name}</p>
                    )}
                    {twin.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{twin.bio}</p>}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {categories.map((cat) => (
                        <Badge key={cat}>{cat}</Badge>
                      ))}
                      <Badge variant="outline">{twin.clone_type || "PUBLIC_FIGURE"}</Badge>
                      {twin.alcm_twin_id && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">ALCM Connected</Badge>}
                    </div>
                  </div>
                  {twin.talent_authorization_at && (
                    <Link href="/twin/certification">
                      <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors">
                        <BadgeCheck className="h-6 w-6 text-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Verified</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </Card>

            {/* Contextual Summary */}
            <Card className="border-border/50">
              <CardContent className="py-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isBuilding ? (
                    <>
                      Your identity is being assembled.
                      {health && health.cfs > 0 ? ` Profile accuracy is at ${(health.cfs * 100).toFixed(0)}% — ` : " "}
                      {health && health.cfs >= 0.65 ? "your identity is ready for licensing." :
                       health && health.cfs >= 0.5 ? "nearly ready for licensing. Continue training to reach the activation threshold." :
                       "visit the Training Area to strengthen your profile and activate licensing."}
                      {dealCount > 0 && ` You have ${dealCount} deal${dealCount !== 1 ? "s" : ""} in your pipeline.`}
                    </>
                  ) : (
                    <>
                      Your identity is active and available for licensing.
                      {dealCount > 0 ? ` ${dealCount} deal${dealCount !== 1 ? "s" : ""} in your pipeline` : " No active deals yet"}
                      {revenue?.net_revenue ? `, generating $${revenue.net_revenue.toLocaleString()} in net revenue.` : "."}
                      {` Created ${twin.created_at ? new Date(twin.created_at).toLocaleDateString() : "recently"}.`}
                    </>
                  )}
                </p>
                {category && CATEGORY_HINTS[category] && (
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Typical {category.toLowerCase()} deal range: {CATEGORY_HINTS[category]}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick links */}
            <div className="grid grid-cols-4 gap-3">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleTabChange("identity")}>
                <Fingerprint className="h-4 w-4 mr-2 text-primary" /> Edit Identity
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleTabChange("guardrails")}>
                <Shield className="h-4 w-4 mr-2 text-primary" /> Configure Guardrails
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleTabChange("licensing")}>
                <DollarSign className="h-4 w-4 mr-2 text-primary" /> Licensing Rules
              </Button>
              <Link href="/twin/training-area" className="contents">
                <Button variant="outline" className="justify-start h-auto py-3">
                  <Bot className="h-4 w-4 mr-2 text-primary" /> Train Your Twin
                </Button>
              </Link>
            </div>
          </TabsContent>

          {/* ============== IDENTITY TAB (with inline edit) ============== */}
          <TabsContent value="identity" className="space-y-4 mt-4">
            <div className="flex justify-end">
              {editingIdentity ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingIdentity(false)} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  <Button size="sm" disabled={saving} onClick={async () => {
                    if (!twin) return;
                    setSaving(true);
                    try {
                      await updateTwin(twin.id, identityDraft);
                      setTwin({ ...twin, ...identityDraft } as TwinData);
                      setEditingIdentity(false);
                      toast.success("Identity updated");
                    } catch { toast.error("Failed to update"); }
                    setSaving(false);
                  }}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => {
                  setIdentityDraft({ display_name: displayName, public_name: twin.public_name || "", bio: twin.bio || "" });
                  setEditingIdentity(true);
                }}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Display Name</CardTitle></CardHeader>
                <CardContent>
                  {editingIdentity ? (
                    <Input value={identityDraft.display_name || ""} onChange={(e) => setIdentityDraft({ ...identityDraft, display_name: e.target.value })} />
                  ) : (
                    <p className="text-lg font-medium">{displayName}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Public Name</CardTitle></CardHeader>
                <CardContent>
                  {editingIdentity ? (
                    <Input value={identityDraft.public_name || ""} onChange={(e) => setIdentityDraft({ ...identityDraft, public_name: e.target.value })} placeholder="How the public knows you" />
                  ) : (
                    <p className="text-lg font-medium">{twin.public_name || "—"}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bio</CardTitle></CardHeader>
              <CardContent>
                {editingIdentity ? (
                  <TextareaUI value={identityDraft.bio || ""} onChange={(e) => setIdentityDraft({ ...identityDraft, bio: e.target.value })} rows={3} placeholder="A brief description of who you are and what you're known for" />
                ) : (
                  <p className="text-sm text-muted-foreground">{twin.bio || <span className="italic">No bio added yet. Click Edit to add one.</span>}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{categories.length > 1 ? "Categories" : "Category"}</CardTitle></CardHeader>
                <CardContent><div className="flex flex-wrap gap-1">{categories.map((cat) => <Badge key={cat}>{cat}</Badge>)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Clone Type</CardTitle></CardHeader>
                <CardContent><Badge variant="outline">{twin.clone_type || "PUBLIC_FIGURE"}</Badge></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">ALCM Engine</CardTitle></CardHeader>
                <CardContent>
                  {twin.alcm_twin_id ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500">Connected</Badge>
                  ) : (
                    <Badge variant="outline">Not linked</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============== HEALTH TAB ============== */}
          <TabsContent value="health" className="space-y-4 mt-4">
            {isBuilding && health ? (
              /* BUILDING: Show progress metrics — user needs them to track toward activation */
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Profile Accuracy", value: health.cfs, target: 0.65, color: "bg-primary", desc: "How accurately your twin represents you" },
                    { label: "Data Completeness", value: health.psychographic_coverage, target: 0.50, color: "bg-blue-500", desc: "How much of your personality has been captured" },
                    { label: "Model Reliability", value: health.personality_confidence, target: 0.50, color: "bg-emerald-500", desc: "Confidence in your personality model" },
                  ].map((metric) => {
                    const pct = metric.value * 100;
                    const qualLabel = pct < 30 ? "Early stage" : pct < 50 ? "Developing" : pct < metric.target * 100 ? "Nearly ready" : "Ready for licensing";
                    const qualColor = pct < 30 ? "text-muted-foreground" : pct < 50 ? "text-blue-500" : pct < metric.target * 100 ? "text-amber-500" : "text-emerald-500";
                    return (
                      <Card key={metric.label}>
                        <CardContent className="pt-6">
                          <div className="text-sm font-medium">{metric.label}</div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-bold">{pct.toFixed(0)}%</span>
                            <span className={`text-xs font-semibold ${qualColor}`}>{qualLabel}</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${metric.color} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{metric.desc}. Target: {(metric.target * 100).toFixed(0)}%.</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Card>
                  <CardContent className="py-4">
                    <h3 className="text-sm font-medium mb-2">How to improve these scores</h3>
                    <p className="text-sm text-muted-foreground">
                      These scores determine your readiness for licensing. Regular training sessions, uploading professional media, and refining your profile in the Training Area improve all three metrics.
                    </p>
                    <Link href="/twin/training-area">
                      <Button size="sm" className="mt-3"><Bot className="h-4 w-4 mr-1" /> Open Training Area</Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            ) : !isBuilding ? (
              /* ACTIVE: Qualitative health indicator only — no percentages (spec Section 5) */
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      healthCfg.color === "text-emerald-500" ? "bg-emerald-500/10" :
                      healthCfg.color === "text-yellow-500" ? "bg-yellow-500/10" :
                      healthCfg.color === "text-red-500" ? "bg-red-500/10" : "bg-muted"
                    }`}>
                      <HealthIcon className={`h-7 w-7 ${healthCfg.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-lg font-bold ${healthCfg.color}`}>{healthCfg.label}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {healthCfg.label === "Healthy"
                          ? "Your identity profile is strong and ready for licensing. Continue training to maintain accuracy."
                          : healthCfg.label === "Attention Needed"
                          ? "Some areas of your identity profile could be strengthened. Visit the Training Area to improve."
                          : healthCfg.label === "Action Required"
                          ? "Your identity profile needs attention. Key areas may be outdated or incomplete."
                          : "Your identity health is being evaluated."}
                      </p>
                    </div>
                    <Link href="/twin/training-area">
                      <Button size="sm" variant="outline"><Bot className="h-4 w-4 mr-1" /> Train</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Health data will be available once your identity begins processing.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============== GUARDRAILS TAB ============== */}
          <TabsContent value="guardrails" className="space-y-4 mt-4">
            {guardrails ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Control what your twin can and cannot say. These rules are enforced on every generated output.</p>
                  {editingGuardrails ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingGuardrails(false)} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                      <Button size="sm" disabled={saving} onClick={async () => {
                        if (!twin) return;
                        if (!window.confirm("Save changes to guardrails? This creates a new version and takes effect immediately.")) return;
                        setSaving(true);
                        try {
                          const result = await guardrailsApi.update(twin.id, guardrailDraft);
                          setGuardrails(result.config || result);
                          setEditingGuardrails(false);
                          toast.success("Guardrails updated (new version created)");
                        } catch { toast.error("Failed to save guardrails"); }
                        setSaving(false);
                      }}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => {
                      setGuardrailDraft({ blocked_topics: guardrails.blocked_topics || [], humor_permitted: guardrails.humor_permitted, require_ai_disclosure: guardrails.require_ai_disclosure });
                      setEditingGuardrails(true);
                    }}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  )}
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Blocked Topics</CardTitle>
                    <CardDescription>Topics your twin will never discuss or engage with</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingGuardrails ? (
                      <Input value={((guardrailDraft.blocked_topics as string[]) || []).join(", ")} onChange={(e) => setGuardrailDraft({ ...guardrailDraft, blocked_topics: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="politics, religion, personal relationships (comma-separated)" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(guardrails.blocked_topics || []).length > 0
                          ? guardrails.blocked_topics.map((t) => <Badge key={t} variant="destructive">{t}</Badge>)
                          : <span className="text-sm text-muted-foreground italic">No blocked topics configured</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">Humor</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Whether your twin can use humor in responses</p>
                      {editingGuardrails ? (
                        <div className="flex items-center gap-2 mt-3">
                          <Switch checked={guardrailDraft.humor_permitted as boolean} onCheckedChange={(v) => setGuardrailDraft({ ...guardrailDraft, humor_permitted: v })} />
                          <Label className="text-sm">{guardrailDraft.humor_permitted ? "Permitted" : "Restricted"}</Label>
                        </div>
                      ) : (
                        <div className="text-lg font-medium mt-2">{guardrails.humor_permitted ? "Permitted" : "Restricted"}</div>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                        {(editingGuardrails ? guardrailDraft.humor_permitted : guardrails.humor_permitted)
                          ? 'Your twin may use appropriate humor and wit in responses.'
                          : 'Your twin will maintain a professional, serious tone at all times.'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">AI Disclosure</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Must disclose that responses are AI-generated</p>
                      {editingGuardrails ? (
                        <div className="flex items-center gap-2 mt-3">
                          <Switch checked={guardrailDraft.require_ai_disclosure as boolean} onCheckedChange={(v) => setGuardrailDraft({ ...guardrailDraft, require_ai_disclosure: v })} />
                          <Label className="text-sm">{guardrailDraft.require_ai_disclosure ? "Required" : "Optional"}</Label>
                        </div>
                      ) : (
                        <div className="text-lg font-medium mt-2">{guardrails.require_ai_disclosure ? "Required" : "Optional"}</div>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                        {(editingGuardrails ? guardrailDraft.require_ai_disclosure : guardrails.require_ai_disclosure)
                          ? 'Every response will include a note that it was AI-generated.'
                          : 'Responses will not include an AI-generation disclosure.'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">Config Version</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Every change creates a new version for audit</p>
                      <div className="text-lg font-medium mt-2">v{guardrails.version}</div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No guardrails configured yet</p>
                  <p className="text-sm mt-1">Set up behavioral rules to control what your twin can and cannot say.</p>
                  <Button className="mt-3" onClick={() => { setGuardrailDraft({ blocked_topics: [], humor_permitted: true, require_ai_disclosure: true }); setEditingGuardrails(true); }}>Configure Guardrails</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============== LICENSING RULES TAB ============== */}
          <TabsContent value="licensing" className="space-y-4 mt-4">
            {licensingRules ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Define the commercial parameters for licensing your identity. These rules are checked against every deal submission.</p>
                  {editingRules ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingRules(false)} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                      <Button size="sm" disabled={saving} onClick={async () => {
                        if (!twin) return;
                        if (!window.confirm("Save changes to licensing rules? This creates a new version and takes effect immediately.")) return;
                        setSaving(true);
                        try {
                          const result = await guardrailsApi.updateLicensingRules(twin.id, rulesDraft);
                          setLicensingRules(result.config || result);
                          setEditingRules(false);
                          toast.success("Licensing rules updated (new version created)");
                        } catch { toast.error("Failed to save licensing rules"); }
                        setSaving(false);
                      }}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => {
                      const r = licensingRules as Record<string, unknown>;
                      setRulesDraft({
                        pricing_floor: (r.pricing_floor as number) || 0,
                        exclusivity_available: (r.exclusivity_available as boolean) || false,
                        default_grace_period_hours: (r.default_grace_period_hours as number) || 48,
                        territory_restrictions: (r.territory_restrictions as string[]) || [],
                        blacklisted_use_cases: (r.blacklisted_use_cases as string[]) || [],
                        permitted_use_cases: (r.permitted_use_cases as string[]) || [],
                      });
                      setEditingRules(true);
                    }}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">Pricing Floor</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Minimum deal value accepted</p>
                      {editingRules ? (
                        <>
                          <Input type="number" className="mt-2" value={rulesDraft.pricing_floor as number} onChange={(e) => setRulesDraft({ ...rulesDraft, pricing_floor: parseFloat(e.target.value) || 0 })} />
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Typical range for {category}: {CATEGORY_HINTS[category] || "$10K–$100K"}</p>
                        </>
                      ) : (
                        <div className="text-2xl font-bold mt-2">${((licensingRules as Record<string, number>).pricing_floor || 0).toLocaleString()}</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">Exclusivity</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Whether exclusive deals are offered</p>
                      {editingRules ? (
                        <div className="flex items-center gap-2 mt-3">
                          <Switch checked={rulesDraft.exclusivity_available as boolean} onCheckedChange={(v) => setRulesDraft({ ...rulesDraft, exclusivity_available: v })} />
                          <Label className="text-sm">{rulesDraft.exclusivity_available ? "Available" : "Not available"}</Label>
                        </div>
                      ) : (
                        <div className="text-lg font-medium mt-2">{(licensingRules as Record<string, boolean>).exclusivity_available ? "Available" : "Not available"}</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm font-medium">Grace Period</div>
                      <p className="text-xs text-muted-foreground mt-0.5">Time buffer when you update your profile during active deals</p>
                      {editingRules ? (
                        <div className="flex items-center gap-2 mt-3">
                          <Input type="number" className="w-20" value={rulesDraft.default_grace_period_hours as number} onChange={(e) => setRulesDraft({ ...rulesDraft, default_grace_period_hours: parseInt(e.target.value) || 48 })} />
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                      ) : (
                        <div className="text-lg font-medium mt-2">{(licensingRules as Record<string, number>).default_grace_period_hours || 48}h</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Blacklisted use cases */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Blacklisted Use Cases</CardTitle>
                    <CardDescription>Industries or use cases that are prohibited from licensing your identity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingRules ? (
                      <Input value={((rulesDraft.blacklisted_use_cases as string[]) || []).join(", ")} onChange={(e) => setRulesDraft({ ...rulesDraft, blacklisted_use_cases: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="tobacco, gambling, firearms, adult content (comma-separated)" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {((licensingRules as Record<string, string[]>).blacklisted_use_cases || []).length > 0
                          ? ((licensingRules as Record<string, string[]>).blacklisted_use_cases || []).map((t) => <Badge key={t} variant="destructive">{t}</Badge>)
                          : <span className="text-sm text-muted-foreground italic">No blacklisted use cases</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Territory restrictions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Territory Restrictions</CardTitle>
                    <CardDescription>Geographic restrictions on where deals can operate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {editingRules ? (
                      <Input value={((rulesDraft.territory_restrictions as string[]) || []).join(", ")} onChange={(e) => setRulesDraft({ ...rulesDraft, territory_restrictions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Leave empty for Global, or specify: US, EU, LATAM (comma-separated)" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {((licensingRules as Record<string, string[]>).territory_restrictions || []).length > 0
                          ? ((licensingRules as Record<string, string[]>).territory_restrictions || []).map((t) => <Badge key={t} variant="outline">{t}</Badge>)
                          : <Badge className="bg-emerald-500/10 text-emerald-500">Global — No restrictions</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No licensing rules configured yet</p>
                  <p className="text-sm mt-1">Set pricing floors, territory restrictions, and deal parameters to control how your identity is licensed.</p>
                  <Button className="mt-3" onClick={() => { setRulesDraft({ pricing_floor: 25000, exclusivity_available: false, default_grace_period_hours: 48, territory_restrictions: [], blacklisted_use_cases: [], permitted_use_cases: [] }); setEditingRules(true); }}>Configure Rules</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
