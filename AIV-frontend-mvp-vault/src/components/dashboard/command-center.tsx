"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield, Briefcase, Activity, Bot, ArrowRight,
  CheckCircle2, AlertTriangle, AlertCircle, Loader2,
  DollarSign, Clock, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchTwins } from "@/lib/api/twins";
import { licensingApi, type Deal, type RevenueSummary } from "@/lib/api/licensing";
import { fetchAuditLogs, type AuditLog } from "@/lib/api/audit";
import { formatDistanceToNow } from "date-fns";

const HEALTH_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  HEALTHY: { color: "text-emerald-500", icon: CheckCircle2, label: "Healthy" },
  BUILDING: { color: "text-blue-500", icon: Activity, label: "Building" },
  ATTENTION_NEEDED: { color: "text-yellow-500", icon: AlertTriangle, label: "Attention Needed" },
  ACTION_REQUIRED: { color: "text-red-500", icon: AlertCircle, label: "Action Required" },
  UNKNOWN: { color: "text-muted-foreground", icon: Activity, label: "Unknown" },
};

export function CommandCenter() {
  const [twin, setTwin] = useState<Record<string, unknown> | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchTwins().catch(() => []),
      licensingApi.getDeals().catch(() => []),
      licensingApi.getRevenue().catch(() => null),
      fetchAuditLogs("").catch(() => []),
    ]).then(([twins, d, r, logs]) => {
      if (twins.length > 0) setTwin(twins[0] as Record<string, unknown>);
      setDeals(d);
      setRevenue(r);
      setAuditLogs((logs || []).slice(0, 8));
      setLoading(false);
    }).catch((err) => {
      console.error("Failed to load command center:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const healthStatus = (twin?.health_status as string) || "BUILDING";
  const twinStatus = (twin?.status as string) || "INITIALIZING";
  const isBuilding = twinStatus === "BUILDING" || twinStatus === "INITIALIZING" || twinStatus === "draft";
  const healthCfg = HEALTH_CONFIG[healthStatus] || HEALTH_CONFIG.UNKNOWN;
  const HealthIcon = healthCfg.icon;

  const activeDeals = deals.filter((d) => ["EXECUTED", "ACTIVE"].includes(d.status));
  const pendingDeals = deals.filter((d) => ["SUBMITTED", "UNDER_REVIEW"].includes(d.status));

  return (
    <div className="space-y-6 p-6">
      {/* Identity Status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center gap-6 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Shield className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">
                {twin ? (twin.display_name as string || twin.name as string || "Your Twin") : "No Twin Yet"}
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-sm font-medium ${healthCfg.color}`}>
                  <HealthIcon className="h-4 w-4" />
                  {isBuilding ? "Building" : healthCfg.label}
                </span>
                {twin?.talent_authorization_at ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 text-xs">
                    Identity Verified & Protected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Authorization Pending</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {isBuilding
                  ? "Your digital identity is being assembled. Visit the Training Area to refine it."
                  : "Your digital identity is active and available for licensing."}
              </p>
            </div>
            <Link href="/twin">
              <Button variant="outline" size="sm">
                View Identity <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Net Revenue
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-500">
              ${revenue ? revenue.net_revenue.toLocaleString() : "0"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {revenue?.total_deals || 0} deal{(revenue?.total_deals || 0) !== 1 ? "s" : ""} total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Pipeline Summary + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Pending Inquiries */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Inquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDeals.length > 0 ? (
              <div className="space-y-2">
                {pendingDeals.slice(0, 3).map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <span>{d.deal_type.replace("_", " ")}</span>
                      <span className="text-muted-foreground">${d.value.toLocaleString()}</span>
                    </div>
                  </Link>
                ))}
                {pendingDeals.length > 3 && (
                  <Link href="/deals" className="text-xs text-primary hover:underline">
                    +{pendingDeals.length - 3} more
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No pending inquiries</p>
            )}
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeDeals.length > 0 ? (
              <div className="space-y-2">
                {activeDeals.slice(0, 3).map((d) => (
                  <Link key={d.id} href={`/deals/${d.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors">
                      <span>{d.deal_type.replace("_", " ")}</span>
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500">Active</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No active deals</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/twin/training-area">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Bot className="mr-2 h-4 w-4" /> Open Training Area
              </Button>
            </Link>
            <Link href="/deals">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Briefcase className="mr-2 h-4 w-4" /> Review Deals
              </Button>
            </Link>
            <Link href="/twin/certification">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" /> Certification
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {auditLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="flex-1 truncate">
                    {log.action} {log.entity_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
