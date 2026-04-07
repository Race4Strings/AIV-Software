"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, CheckCircle2, AlertTriangle, Clock,
  DollarSign, ArrowRight, Loader2, Plus, X, Search,
  XCircle, FileCheck, Send, Eye, Zap, Archive, type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { licensingApi, type Deal, type RevenueSummary } from "@/lib/api/licensing";
import { fetchTwins } from "@/lib/api/twins";
import { humanizeEnum } from "@/lib/humanize";

const STATUS_GROUPS: Record<string, string[]> = {
  "Inquiries": ["SUBMITTED", "UNDER_REVIEW"],
  "Negotiation": ["APPROVED", "CONTRACT_SENT"],
  "Active": ["EXECUTED", "ACTIVE"],
  "Completed": ["COMPLETED", "EXPIRED", "TERMINATED"],
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-primary/10 text-primary",
  UNDER_REVIEW: "bg-warning/10 text-warning",
  APPROVED: "bg-success/10 text-success",
  CONTRACT_SENT: "bg-accent text-accent-foreground",
  EXECUTED: "bg-success/10 text-success",
  ACTIVE: "bg-success/10 text-success",
  COMPLETED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-warning/10 text-warning",
  TERMINATED: "bg-destructive/10 text-destructive",
};

const ALL_STATUSES = [
  "ALL", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "CONTRACT_SENT",
  "EXECUTED", "ACTIVE", "COMPLETED", "EXPIRED", "TERMINATED",
] as const;

const STATUS_ICONS: Record<string, LucideIcon> = {
  SUBMITTED: Send,
  UNDER_REVIEW: Eye,
  APPROVED: CheckCircle2,
  CONTRACT_SENT: FileCheck,
  EXECUTED: Zap,
  ACTIVE: Zap,
  COMPLETED: Archive,
  EXPIRED: Clock,
  TERMINATED: XCircle,
};

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
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
      .catch(() => {
        toast.error("Failed to load deals");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* Summary row skeleton */}
        <Skeleton className="h-12 rounded-lg" />
        {/* Pipeline section skeleton */}
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  async function handleCreateDeal() {
    if (!newDeal.value || creating) return;
    if (parseFloat(newDeal.value) < 100) { toast.error("Minimum deal value is $100"); return; }
    setCreating(true);
    try {
      const twins = await fetchTwins();
      const twinId = twins?.[0]?.id;
      if (!twinId) { toast.error("No twin linked to your account"); setCreating(false); return; }

      const deal = await licensingApi.createDeal({
        twin_id: twinId,
        client_org_id: "",
        deal_type: newDeal.deal_type,
        value: parseFloat(newDeal.value),
        territory: newDeal.territory.split(",").map((t: string) => t.trim()).filter(Boolean),
        exclusivity: newDeal.exclusivity,
        data_scope: newDeal.data_scope,
      });
      toast.success("Deal created");
      router.push(`/deals/${deal.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create deal");
    }
    setCreating(false);
  }

  const DEAL_TYPES = ["BRAND_CAMPAIGN", "CONTENT_CREATION", "VOICE_LICENSING", "GAME_CHARACTER", "EDUCATIONAL", "CUSTOM"];
  const DATA_SCOPE_OPTIONS: { key: string; label: string; hint: string }[] = [
    { key: "identity_profile", label: "Identity Profile", hint: "Personality, behavioral style, guardrails" },
    { key: "knowledge_base", label: "Knowledge Base", hint: "Expertise, positions, opinions, RAG data" },
    { key: "voice_identity", label: "Voice Identity", hint: "Voice embeddings, speech patterns, accent" },
    { key: "visual_identity", label: "Visual Identity", hint: "Appearance, expressions, gestures" },
  ];

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
                <Label htmlFor="deal-type" className="text-xs text-muted-foreground mb-1.5 block">Deal Type</Label>
                <select
                  id="deal-type"
                  value={newDeal.deal_type}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, deal_type: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {DEAL_TYPES.map(t => <option key={t} value={t}>{humanizeEnum(t)}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="deal-value" className="text-xs text-muted-foreground mb-1.5 block">Value (USD)</Label>
                <Input
                  id="deal-value"
                  type="number"
                  min={100}
                  placeholder="50000"
                  value={newDeal.value}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, value: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum $100. Commission: 30% first deal, 25% second, 20% third+</p>
              </div>
              <div>
                <Label htmlFor="deal-territory" className="text-xs text-muted-foreground mb-1.5 block">Territory (comma-separated)</Label>
                <Input
                  id="deal-territory"
                  placeholder="US, CA, UK"
                  value={newDeal.territory}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, territory: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deal-start-date" className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                <Input id="deal-start-date" type="date" value={newDeal.start_date} onChange={(e) => setNewDeal(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="deal-end-date" className="text-xs text-muted-foreground mb-1.5 block">End Date</Label>
                <Input id="deal-end-date" type="date" value={newDeal.end_date} onChange={(e) => setNewDeal(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={newDeal.exclusivity} onCheckedChange={(v) => setNewDeal(prev => ({ ...prev, exclusivity: !!v }))} />
                  <span title="Client gets sole access to the licensed data scope for the deal duration">Exclusivity requested</span>
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Data Scope — what the client receives</Label>
              <div className="grid grid-cols-2 gap-2">
                {DATA_SCOPE_OPTIONS.map(scope => (
                  <label key={scope.key} className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-border/50 p-2.5 hover:bg-muted/30 transition-colors">
                    <Checkbox
                      className="mt-0.5"
                      checked={newDeal.data_scope.includes(scope.key)}
                      onCheckedChange={(v) => {
                        setNewDeal(prev => ({
                          ...prev,
                          data_scope: v ? [...prev.data_scope, scope.key] : prev.data_scope.filter(s => s !== scope.key),
                        }));
                      }}
                    />
                    <div>
                      <span className="font-medium">{scope.label}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{scope.hint}</span>
                    </div>
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

      {/* Summary Row */}
      {revenue && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
          <div>
            <span className="text-sm text-muted-foreground block">Total Value</span>
            <span className="text-lg font-bold font-mono tabular-nums">
              ${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Active</span>
            <span className="text-lg font-bold font-mono tabular-nums">{revenue.total_deals}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Pipeline</span>
            <span className="text-lg font-bold font-mono tabular-nums">{deals.length}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Conversion</span>
            <span className="text-lg font-bold font-mono tabular-nums">
              {deals.length > 0
                ? `${Math.round((deals.filter(d => ["EXECUTED", "ACTIVE", "COMPLETED"].includes(d.status)).length / deals.length) * 100)}%`
                : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      {deals.length > 0 && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by type, territory, value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "ALL" ? "All" : humanizeEnum(status)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtered empty state */}
      {deals.length > 0 && (() => {
        const hasVisibleDeals = deals.some((d: Deal) => {
          const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
          const matchesSearch = !searchQuery || (() => {
            const q = searchQuery.toLowerCase();
            return (
              d.deal_type.toLowerCase().includes(q) ||
              (d.territory || []).some((t: string) => t.toLowerCase().includes(q)) ||
              String(d.value).includes(q) ||
              String(d.deal_number).includes(q)
            );
          })();
          return matchesStatus && matchesSearch;
        });
        if (!hasVisibleDeals) {
          return (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No deals match the current filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => { setStatusFilter("ALL"); setSearchQuery(""); }}
              >
                Clear filters
              </Button>
            </div>
          );
        }
        return null;
      })()}

      {/* Pipeline View */}
      {Object.entries(STATUS_GROUPS).map(([group, statuses]) => {
        const groupDeals = deals
          .filter((d: Deal) => statuses.includes(d.status))
          .filter((d: Deal) => statusFilter === "ALL" || d.status === statusFilter)
          .filter((d: Deal) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              d.deal_type.toLowerCase().includes(q) ||
              (d.territory || []).some((t: string) => t.toLowerCase().includes(q)) ||
              String(d.value).includes(q) ||
              String(d.deal_number).includes(q)
            );
          });
        if (groupDeals.length === 0) return null;

        return (
          <div key={group}>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {group} ({groupDeals.length})
            </h2>
            <div className="space-y-2">
              {groupDeals.map((deal) => {
                const flags = deal.parameter_flags || {};
                const allOk = flags._all_within_range?.status === "ok";

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
                    <CardContent className="flex items-center gap-3 sm:gap-4 py-4">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {humanizeEnum(deal.deal_type)}
                          </span>
                          <Badge variant="outline" className={STATUS_COLORS[deal.status] || ""}>
                            {(() => { const StatusIcon = STATUS_ICONS[deal.status]; return StatusIcon ? <StatusIcon className="h-3 w-3 mr-1" /> : null; })()}
                            {humanizeEnum(deal.status)}
                          </Badge>
                          {allOk === true && (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                          {allOk === false && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono tabular-nums">
                            <DollarSign className="h-3.5 w-3.5" />
                            {deal.value.toLocaleString()} {deal.currency}
                          </span>
                          <span>Deal #{deal.deal_number}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(deal.created_at).toLocaleDateString()}
                          </span>
                          {deal.data_scope?.length > 0 && (
                            <span className="text-xs hidden sm:inline">
                              {deal.data_scope.map((s) => humanizeEnum(s)).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {deals.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Your Licensing Portal is open"
          description="Licensing deals are how your identity generates revenue. Start by strengthening your digital twin in the Training Area."
          ctaLabel="Open Training Area"
          ctaHref="/twin/training-area"
        />
      )}
    </div>
  );
}
