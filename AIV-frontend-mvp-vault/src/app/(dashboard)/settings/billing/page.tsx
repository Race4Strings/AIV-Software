"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard, FileText, ArrowUpRight, CheckCircle2,
  Clock, AlertTriangle, Loader2, Shield, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { licensingApi } from "@/lib/api/licensing";
import apiClient from "@/lib/api/client";
import { formatDistanceToNow } from "date-fns";

interface Invoice {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  stripe_invoice_url: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  deal_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  processed_at: string | null;
  created_at: string;
}

interface BillingStatus {
  has_payment_method: boolean;
  stripe_customer_id: string | null;
  subscription_active: boolean;
  platform_fee_active: boolean;
  fee_free_window_expires: string | null;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  PENDING: { color: "text-yellow-500", label: "Pending" },
  PAID: { color: "text-emerald-500", label: "Paid" },
  OVERDUE: { color: "text-red-500", label: "Overdue" },
  FAILED: { color: "text-red-500", label: "Failed" },
  PROCESSING: { color: "text-blue-500", label: "Processing" },
  COMPLETED: { color: "text-emerald-500", label: "Completed" },
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      licensingApi.getInvoices(),
      licensingApi.getPayouts(),
      apiClient.get("/payments/billing-status").then((r) => r.data),
    ]).then((results) => {
      if (results[0].status === "fulfilled") setInvoices(results[0].value);
      if (results[1].status === "fulfilled") setPayouts(results[1].value);
      if (results[2].status === "fulfilled") setBilling(results[2].value);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const feeFreeDaysLeft = billing?.fee_free_window_expires
    ? Math.max(0, Math.ceil((new Date(billing.fee_free_window_expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">Payment methods, invoices, and payout history.</p>
      </div>

      {/* Payment Method */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payment Method</h2>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              {billing?.has_payment_method ? (
                <>
                  <p className="font-medium">Card on file</p>
                  <p className="text-sm text-muted-foreground">Your payment method is saved for billing.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No payment method</p>
                  <p className="text-sm text-muted-foreground">Add a card to enable billing when your fee-free period ends.</p>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { data } = await apiClient.post("/payments/setup-checkout", {
                    success_url: `${window.location.origin}/settings/billing?payment=success`,
                    cancel_url: `${window.location.origin}/settings/billing`,
                  });
                  if (data.checkout_url) window.location.href = data.checkout_url;
                } catch {
                  // Toast would go here
                }
              }}
            >
              {billing?.has_payment_method ? "Update Card" : "Add Card"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Platform Fee Status */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Platform Partnership Fee</h2>
        <Card className="border-border/50">
          <CardContent className="py-5">
            {billing?.platform_fee_active ? (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">$997/month — Active</p>
                  <p className="text-sm text-muted-foreground">
                    Covers AI training infrastructure, identity hosting, licensing operations, misuse monitoring, and account management.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <Shield className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Fee-Free Period</p>
                  <p className="text-sm text-muted-foreground">
                    {feeFreeDaysLeft !== null && feeFreeDaysLeft > 0
                      ? `${feeFreeDaysLeft} day${feeFreeDaysLeft !== 1 ? "s" : ""} remaining. The $997/month platform partnership fee activates when your first deal closes or your fee-free period ends.`
                      : "Your fee-free period has ended. The platform partnership fee will activate with your next billing cycle."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Commission Structure */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Commission Structure</h2>
        <Card className="border-border/50">
          <CardContent className="py-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">30%</div>
                <div className="text-xs text-muted-foreground mt-1">First deal</div>
              </div>
              <div>
                <div className="text-2xl font-bold">25%</div>
                <div className="text-xs text-muted-foreground mt-1">Second deal</div>
              </div>
              <div>
                <div className="text-2xl font-bold">20%</div>
                <div className="text-xs text-muted-foreground mt-1">Third deal onward</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Commission is calculated on gross deal value and deducted before payout.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Invoices */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const style = STATUS_STYLES[inv.status] || STATUS_STYLES.PENDING;
              return (
                <Card key={inv.id} className="border-border/50">
                  <CardContent className="flex items-center gap-4 py-4">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {inv.type === "PLATFORM_FEE" ? "Platform Partnership Fee" :
                           inv.type === "COMMISSION" ? "Deal Commission" : inv.type}
                        </span>
                        <span className={`text-xs font-semibold ${style.color}`}>{style.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : ""}
                        {inv.paid_at ? ` · Paid ${new Date(inv.paid_at).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <span className="font-semibold text-sm">${inv.amount.toLocaleString()}</span>
                    {inv.stripe_invoice_url && (
                      <a href={inv.stripe_invoice_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No invoices yet. Invoices are generated when deals execute or the platform fee activates.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Payouts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payouts</h2>
        {payouts.length > 0 ? (
          <div className="space-y-2">
            {payouts.map((p) => {
              const style = STATUS_STYLES[p.status] || STATUS_STYLES.PENDING;
              return (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="flex items-center gap-4 py-4">
                    <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Deal Payout</span>
                        <span className={`text-xs font-semibold ${style.color}`}>{style.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Gross: ${p.gross_amount.toLocaleString()} · Commission: ${p.commission_amount.toLocaleString()}
                        {p.processed_at ? ` · Processed ${new Date(p.processed_at).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-emerald-500">${p.net_amount.toLocaleString()}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payouts yet. Payouts are processed when deal payments are received.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Stripe Connect Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payout Setup</h2>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Receive payouts directly</p>
              <p className="text-sm text-muted-foreground">
                Connect your bank account to receive deal payouts automatically. Powered by Stripe.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { data } = await apiClient.post("/payments/connect-onboard", {
                    return_url: `${window.location.origin}/settings/billing`,
                    refresh_url: `${window.location.origin}/settings/billing`,
                  });
                  if (data.onboarding_url) window.location.href = data.onboarding_url;
                } catch {
                  // Toast would go here
                }
              }}
            >
              Set Up Payouts
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Back link */}
      <div className="pt-2">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Settings
        </Link>
      </div>
    </div>
  );
}
