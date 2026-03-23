"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, CheckCircle2, AlertTriangle, Clock,
  DollarSign, ArrowRight, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { licensingApi, type Deal, type RevenueSummary } from "@/lib/api/licensing";

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

  return (
    <div className="space-y-6 p-6">
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
        <div className="text-center py-20">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium">No deals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            When clients submit deal inquiries, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
