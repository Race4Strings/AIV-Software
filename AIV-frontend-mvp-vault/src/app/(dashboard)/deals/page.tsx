"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, CheckCircle2, AlertTriangle, Clock,
  DollarSign, ArrowRight, Loader2, Plus, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { licensingApi, type Deal, type RevenueSummary } from "@/lib/api/licensing";
import apiClient from "@/lib/api/client";

const STATUS_GROUPS: Record<string, string[]> = {
  "Inquiries": ["SUBMITTED", "UNDER_REVIEW"],
  "Negotiation": ["APPROVED", "CONTRACT_SENT"],
  "Active": ["EXECUTED", "ACTIVE"],
  "Completed": ["COMPLETED", "EXPIRED", "TERMINATED"],
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  UNDER_REVIEW: "bg-yellow-500/10 text-yellow-500",
  APPROVED: "bg-emerald-500/10 text-emerald-500",
  CONTRACT_SENT: "bg-purple-500/10 text-purple-500",
  EXECUTED: "bg-green-500/10 text-green-500",
  ACTIVE: "bg-green-600/10 text-green-600",
  COMPLETED: "bg-gray-500/10 text-gray-400",
  EXPIRED: "bg-red-500/10 text-red-400",
  TERMINATED: "bg-red-600/10 text-red-500",
};

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDeal, setNewDeal] = useState({
    deal_type: "BRAND_CAMPAIGN",
    value: "",
    territory: "",
    exclusivity: false,
    start_date: "",
    end_date: "",
    data_scope: ["identity_profile"] as string[],
  });

  useEffect(() => {
    Promise.all([licensingApi.getDeals(), licensingApi.getRevenue()])
      .then(([d, r]) => {
        setDeals(d);
        setRevenue(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleCreateDeal() {
    if (!newDeal.value || creating) return;
    setCreating(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const twinId = user.twin_id;
      if (!twinId) { toast.error("No twin linked to your account"); setCreating(false); return; }

      const res = await apiClient.post("/deals", {
        twin_id: twinId,
        deal_type: newDeal.deal_type,
        value: parseFloat(newDeal.value),
        territory: newDeal.territory.split(",").map((t: string) => t.trim()).filter(Boolean),
        exclusivity: newDeal.exclusivity,
        start_date: newDeal.start_date || undefined,
        end_date: newDeal.end_date || undefined,
        data_scope: newDeal.data_scope,
      });
      toast.success("Deal created");
      router.push(`/deals/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create deal");
    }
    setCreating(false);
  }

  const DEAL_TYPES = ["BRAND_CAMPAIGN", "CONTENT_CREATION", "VOICE_LICENSING", "GAME_CHARACTER", "EDUCATIONAL", "CUSTOM"];
  const DATA_SCOPE_OPTIONS = ["identity_profile", "knowledge_base", "voice_identity", "visual_identity"];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
        <Button size="sm" onClick={() => setShowNewDeal(!showNewDeal)}>
          {showNewDeal ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
          {showNewDeal ? "Cancel" : "New Inquiry"}
        </Button>
      </div>

      {/* New Deal Form */}
      {showNewDeal && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Deal Type</Label>
                <select
                  value={newDeal.deal_type}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, deal_type: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {DEAL_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Value (USD)</Label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Territory (comma-separated)</Label>
                <Input
                  placeholder="US, CA, UK"
                  value={newDeal.territory}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, territory: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                <Input type="date" value={newDeal.start_date} onChange={(e) => setNewDeal(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">End Date</Label>
                <Input type="date" value={newDeal.end_date} onChange={(e) => setNewDeal(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={newDeal.exclusivity} onCheckedChange={(v) => setNewDeal(prev => ({ ...prev, exclusivity: !!v }))} />
                  Exclusivity requested
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data Scope</Label>
              <div className="flex flex-wrap gap-3">
                {DATA_SCOPE_OPTIONS.map(scope => (
                  <label key={scope} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox
                      checked={newDeal.data_scope.includes(scope)}
                      onCheckedChange={(v) => {
                        setNewDeal(prev => ({
                          ...prev,
                          data_scope: v ? [...prev.data_scope, scope] : prev.data_scope.filter(s => s !== scope),
                        }));
                      }}
                    />
                    {scope.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleCreateDeal} disabled={creating || !newDeal.value}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Create Deal Inquiry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Revenue Summary */}
      {revenue && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Active Deals</div>
              <div className="text-2xl font-bold">{revenue.total_deals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Gross Revenue</div>
              <div className="text-2xl font-bold">${revenue.gross_revenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Commission</div>
              <div className="text-2xl font-bold">${revenue.total_commission.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Net Revenue</div>
              <div className="text-2xl font-bold text-emerald-500">
                ${revenue.net_revenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pipeline Analytics */}
      {deals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground">Pipeline Value</div>
              <div className="text-lg font-bold mt-1">
                ${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Across {deals.length} deal{deals.length !== 1 ? "s" : ""}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground">Average Deal Size</div>
              <div className="text-lg font-bold mt-1">
                ${deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length).toLocaleString() : "0"}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="text-xs text-muted-foreground">Conversion</div>
              <div className="text-lg font-bold mt-1">
                {deals.length > 0
                  ? `${Math.round((deals.filter(d => ["EXECUTED", "ACTIVE", "COMPLETED"].includes(d.status)).length / deals.length) * 100)}%`
                  : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Inquiries to active deals</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pipeline View — groups memoized to avoid re-filtering on every render */}
      {Object.entries(STATUS_GROUPS).map(([group, statuses]) => {
        const groupDeals = deals.filter((d: Deal) => statuses.includes(d.status));
        if (groupDeals.length === 0) return null;

        return (
          <div key={group}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {group} ({groupDeals.length})
            </h2>
            <div className="space-y-2">
              {groupDeals.map((deal) => {
                const flags = deal.parameter_flags || {};
                const allOk = flags._all_within_range;

                return (
                  <Card
                    key={deal.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${deal.deal_type} deal #${deal.deal_number}, $${deal.value.toLocaleString()}, ${deal.status}`}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/deals/${deal.id}`)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/deals/${deal.id}`)}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {deal.deal_type.replace("_", " ")}
                          </span>
                          <Badge variant="outline" className={STATUS_COLORS[deal.status] || ""}>
                            {deal.status.replace("_", " ")}
                          </Badge>
                          {allOk === true && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                          {allOk === false && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {deal.value.toLocaleString()} {deal.currency}
                          </span>
                          <span>Deal #{deal.deal_number}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(deal.created_at).toLocaleDateString()}
                          </span>
                          {deal.data_scope?.length > 0 && (
                            <span className="text-xs">
                              {deal.data_scope.map((s) => s.replace("_", " ")).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {deals.length === 0 && (
        <div className="text-center py-16 max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-6">
            <Briefcase className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">Your Licensing Portal is open</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Licensing deals are how your identity generates revenue. When brands and platforms want to license your identity, inquiries appear here for your review.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Strengthen your identity profile in the Training Area to attract higher-value inquiries. The more complete and accurate your profile, the more valuable it is to licensees.
          </p>
          <div className="mt-6">
            <a href="/twin/training-area">
              <Button variant="outline" size="sm">
                Open Training Area <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
