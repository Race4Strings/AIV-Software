"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Loader2, Fingerprint, Shield, DollarSign, Activity,
  Bot, CheckCircle2, AlertTriangle, AlertCircle, Pencil, Save, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fetchTwins } from "@/lib/api/twins";
import { guardrailsApi, type GuardrailConfig } from "@/lib/api/guardrails";
import apiClient from "@/lib/api/client";

async function saveGuardrails(twinId: string, data: Record<string, unknown>) {
  const res = await apiClient.post(`/twins/${twinId}/guardrails`, data);
  return res.data;
}
async function saveLicensingRules(twinId: string, data: Record<string, unknown>) {
  const res = await apiClient.post(`/twins/${twinId}/licensing-rules`, data);
  return res.data;
}

interface TwinData {
  id: string;
  display_name?: string;
  name?: string;
  public_name?: string;
  bio?: string;
  identity_category?: string;
  clone_type?: string;
  status?: string;
  health_status?: string;
  talent_authorization_at?: string;
  alcm_twin_id?: string;
  created_at?: string;
}

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

const HEALTH_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  HEALTHY: { icon: CheckCircle2, color: "text-emerald-500" },
  BUILDING: { icon: Activity, color: "text-blue-500" },
  ATTENTION_NEEDED: { icon: AlertTriangle, color: "text-yellow-500" },
  ACTION_REQUIRED: { icon: AlertCircle, color: "text-red-500" },
};

export default function TwinPage() {
  const [twin, setTwin] = useState<TwinData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailConfig | null>(null);
  const [licensingRules, setLicensingRules] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("identity");
  const [editingGuardrails, setEditingGuardrails] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [guardrailDraft, setGuardrailDraft] = useState<Record<string, unknown>>({});
  const [rulesDraft, setRulesDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (["identity", "guardrails", "licensing", "health"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    fetchTwins()
      .then(async (twins) => {
        if (twins.length === 0) {
          setLoading(false);
          return;
        }
        const t = twins[0] as unknown as TwinData;
        setTwin(t);

        // Load health, guardrails, licensing rules in parallel
        const [healthRes, guardrailRes, rulesRes] = await Promise.allSettled([
          apiClient.get(`/twins/${t.id}/health`).then((r) => r.data),
          guardrailsApi.get(t.id),
          apiClient.get(`/twins/${t.id}/licensing-rules`).then((r) => r.data),
        ]);

        if (healthRes.status === "fulfilled") setHealth(healthRes.value);
        if (guardrailRes.status === "fulfilled") setGuardrails(guardrailRes.value.config);
        if (rulesRes.status === "fulfilled") setLicensingRules(rulesRes.value.config);
      })
      .catch(console.error)
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
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Fingerprint className="h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-lg font-medium">No digital twin yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start the onboarding process to create your identity.
        </p>
        <Link href="/onboard">
          <Button className="mt-4">Start Onboarding</Button>
        </Link>
      </div>
    );
  }

  const HealthIcon = healthCfg.icon;
  const displayName = twin.display_name || twin.name || "Your Twin";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Fingerprint className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline">{twin.identity_category || "ENTERTAINMENT"}</Badge>
            <Badge variant="outline">{twin.status || "INITIALIZING"}</Badge>
            <span className={`flex items-center gap-1 text-sm ${healthCfg.color}`}>
              <HealthIcon className="h-4 w-4" />
              {health?.health_status || twin.health_status || "Building"}
            </span>
            {twin.talent_authorization_at && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                Gate 2 Authorized
              </Badge>
            )}
          </div>
        </div>
        <Link href="/twin/training-area">
          <Button variant="outline" size="sm">
            <Bot className="h-4 w-4 mr-1" /> Training Area
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          <TabsTrigger value="licensing">Licensing Rules</TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Display Name</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-medium">{displayName}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Public Name</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-medium">{twin.public_name || "—"}</p></CardContent>
            </Card>
          </div>
          {twin.bio && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bio</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{twin.bio}</p></CardContent>
            </Card>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Category</CardTitle></CardHeader>
              <CardContent><Badge>{twin.identity_category || "—"}</Badge></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Clone Type</CardTitle></CardHeader>
              <CardContent><Badge variant="outline">{twin.clone_type || "PUBLIC_FIGURE"}</Badge></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">ALCM Linked</CardTitle></CardHeader>
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

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4 mt-4">
          {health ? (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Composite Fidelity Score</div>
                  <div className="text-3xl font-bold mt-1">{(health.cfs * 100).toFixed(0)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Psychographic Coverage</div>
                  <div className="text-3xl font-bold mt-1">{(health.psychographic_coverage * 100).toFixed(0)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Personality Confidence</div>
                  <div className="text-3xl font-bold mt-1">{(health.personality_confidence * 100).toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Health data not available yet. Visit the Training Area to build your identity.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Guardrails Tab */}
        <TabsContent value="guardrails" className="space-y-4 mt-4">
          {guardrails ? (
            <>
              <div className="flex justify-end">
                {editingGuardrails ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingGuardrails(false)} disabled={saving}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" disabled={saving} onClick={async () => {
                      if (!twin) return;
                      setSaving(true);
                      try {
                        const result = await saveGuardrails(twin.id, guardrailDraft);
                        setGuardrails(result.config || result);
                        setEditingGuardrails(false);
                        toast.success("Guardrails updated (new version created)");
                      } catch { toast.error("Failed to save guardrails"); }
                      setSaving(false);
                    }}>
                      <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => {
                    setGuardrailDraft({
                      blocked_topics: guardrails.blocked_topics || [],
                      humor_permitted: guardrails.humor_permitted,
                      require_ai_disclosure: guardrails.require_ai_disclosure,
                    });
                    setEditingGuardrails(true);
                  }}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                )}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Blocked Topics</CardTitle></CardHeader>
                <CardContent>
                  {editingGuardrails ? (
                    <Input
                      value={((guardrailDraft.blocked_topics as string[]) || []).join(", ")}
                      onChange={(e) => setGuardrailDraft({ ...guardrailDraft, blocked_topics: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="politics, religion, personal relationships (comma-separated)"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(guardrails.blocked_topics || []).length > 0 ? (
                        guardrails.blocked_topics.map((t) => <Badge key={t} variant="destructive">{t}</Badge>)
                      ) : (
                        <span className="text-sm text-muted-foreground">No blocked topics configured</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Humor</div>
                    {editingGuardrails ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={guardrailDraft.humor_permitted as boolean} onCheckedChange={(v) => setGuardrailDraft({ ...guardrailDraft, humor_permitted: v })} />
                        <Label className="text-sm">{guardrailDraft.humor_permitted ? "Permitted" : "Restricted"}</Label>
                      </div>
                    ) : (
                      <div className="text-lg font-medium mt-1">{guardrails.humor_permitted ? "Permitted" : "Restricted"}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">AI Disclosure</div>
                    {editingGuardrails ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={guardrailDraft.require_ai_disclosure as boolean} onCheckedChange={(v) => setGuardrailDraft({ ...guardrailDraft, require_ai_disclosure: v })} />
                        <Label className="text-sm">{guardrailDraft.require_ai_disclosure ? "Required" : "Optional"}</Label>
                      </div>
                    ) : (
                      <div className="text-lg font-medium mt-1">{guardrails.require_ai_disclosure ? "Required" : "Optional"}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Version</div>
                    <div className="text-lg font-medium mt-1">v{guardrails.version}</div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No guardrails configured yet.</p>
                <Button className="mt-3" onClick={() => { setGuardrailDraft({ blocked_topics: [], humor_permitted: true, require_ai_disclosure: true }); setEditingGuardrails(true); }}>
                  Configure Guardrails
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Licensing Rules Tab */}
        <TabsContent value="licensing" className="space-y-4 mt-4">
          {licensingRules ? (
            <>
              <div className="flex justify-end">
                {editingRules ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingRules(false)} disabled={saving}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" disabled={saving} onClick={async () => {
                      if (!twin) return;
                      setSaving(true);
                      try {
                        const result = await saveLicensingRules(twin.id, rulesDraft);
                        setLicensingRules(result.config || result);
                        setEditingRules(false);
                        toast.success("Licensing rules updated (new version created)");
                      } catch { toast.error("Failed to save licensing rules"); }
                      setSaving(false);
                    }}>
                      <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => {
                    setRulesDraft({
                      pricing_floor: (licensingRules as Record<string, number>).pricing_floor || 0,
                      exclusivity_available: (licensingRules as Record<string, boolean>).exclusivity_available || false,
                      default_grace_period_hours: (licensingRules as Record<string, number>).default_grace_period_hours || 48,
                      territory_restrictions: (licensingRules as Record<string, string[]>).territory_restrictions || [],
                      blacklisted_use_cases: (licensingRules as Record<string, string[]>).blacklisted_use_cases || [],
                      permitted_use_cases: (licensingRules as Record<string, string[]>).permitted_use_cases || [],
                    });
                    setEditingRules(true);
                  }}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Pricing Floor</div>
                    {editingRules ? (
                      <Input type="number" className="mt-2" value={rulesDraft.pricing_floor as number} onChange={(e) => setRulesDraft({ ...rulesDraft, pricing_floor: parseFloat(e.target.value) || 0 })} />
                    ) : (
                      <div className="text-2xl font-bold mt-1">${(licensingRules as Record<string, number>).pricing_floor?.toLocaleString() || "—"}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Exclusivity</div>
                    {editingRules ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={rulesDraft.exclusivity_available as boolean} onCheckedChange={(v) => setRulesDraft({ ...rulesDraft, exclusivity_available: v })} />
                        <Label className="text-sm">{rulesDraft.exclusivity_available ? "Available" : "Not available"}</Label>
                      </div>
                    ) : (
                      <div className="text-lg font-medium mt-1">{(licensingRules as Record<string, boolean>).exclusivity_available ? "Available" : "Not available"}</div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Grace Period</div>
                    {editingRules ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Input type="number" className="w-20" value={rulesDraft.default_grace_period_hours as number} onChange={(e) => setRulesDraft({ ...rulesDraft, default_grace_period_hours: parseInt(e.target.value) || 48 })} />
                        <span className="text-sm text-muted-foreground">hours</span>
                      </div>
                    ) : (
                      <div className="text-lg font-medium mt-1">{(licensingRules as Record<string, number>).default_grace_period_hours || 48}h</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              {editingRules && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Blacklisted Use Cases</CardTitle></CardHeader>
                  <CardContent>
                    <Input
                      value={((rulesDraft.blacklisted_use_cases as string[]) || []).join(", ")}
                      onChange={(e) => setRulesDraft({ ...rulesDraft, blacklisted_use_cases: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="tobacco, gambling, firearms (comma-separated)"
                    />
                  </CardContent>
                </Card>
              )}
              {((licensingRules as Record<string, string[]>).territory_restrictions || []).length > 0 && !editingRules && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Territory Restrictions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {((licensingRules as Record<string, string[]>).territory_restrictions || []).map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {editingRules && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Territory Restrictions</CardTitle></CardHeader>
                  <CardContent>
                    <Input
                      value={((rulesDraft.territory_restrictions as string[]) || []).join(", ")}
                      onChange={(e) => setRulesDraft({ ...rulesDraft, territory_restrictions: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="Global or specific territories (comma-separated)"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No licensing rules configured yet.</p>
                <Button className="mt-3" onClick={() => { setRulesDraft({ pricing_floor: 25000, exclusivity_available: false, default_grace_period_hours: 48, territory_restrictions: [], blacklisted_use_cases: [], permitted_use_cases: [] }); setEditingRules(true); }}>
                  Configure Rules
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
