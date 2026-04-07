"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import { humanizeEnum } from "@/lib/humanize";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import type { Deal } from "@/lib/api/licensing";

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

const NEXT_ACTION: Record<string, { label: string; next: string; hint: string; variant?: "default" | "outline" }> = {
  SUBMITTED: { label: "Begin Review", next: "UNDER_REVIEW", hint: "Review the deal parameters and client details" },
  UNDER_REVIEW: { label: "Approve Inquiry", next: "APPROVED", hint: "Approve this deal to proceed to contract generation" },
  APPROVED: { label: "Send to Contract", next: "CONTRACT_SENT", hint: "Generate and send the contract for both-party signing" },
  CONTRACT_SENT: { label: "Mark as Executed", next: "EXECUTED", hint: "Both parties must sign before execution. Commission is calculated on execution." },
  EXECUTED: { label: "Activate Deal", next: "ACTIVE", hint: "Begin the active delivery period — client receives identity data" },
  ACTIVE: { label: "Complete Deal", next: "COMPLETED", variant: "outline", hint: "Close this deal after all milestones are met and final attestation submitted" },
};

interface DealHeaderProps {
  deal: Deal;
  transitioning: boolean;
  showTrainPrompt: boolean;
  onConfirmAction: (action: { next: string; label: string; hint: string }) => void;
  onTrainAssistant: (reasoning?: string) => void;
  onDismissTrainPrompt: () => void;
}

export function DealHeader({
  deal,
  transitioning,
  showTrainPrompt,
  onConfirmAction,
  onTrainAssistant,
  onDismissTrainPrompt,
}: DealHeaderProps) {
  const router = useRouter();
  const flags = deal.parameter_flags || {};
  const allOk = flags._all_within_range?.status === "ok";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Deals", href: "/deals" },
          { label: deal.deal_type ? humanizeEnum(deal.deal_type) + " — Deal #" + deal.deal_number : "Deal Detail" },
        ]}
      />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{humanizeEnum(deal.deal_type)} — Deal #{deal.deal_number}</h1>
            <Badge variant="outline" className={STATUS_COLORS[deal.status] || ""}>{humanizeEnum(deal.status)}</Badge>
            {allOk === true && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-4 w-4" /> All parameters within range</span>}
            {allOk === false && <span className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-4 w-4" /> Parameters flagged</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono tabular-nums">${deal.value.toLocaleString()}</span> {deal.currency} | Commission: <span className="font-mono tabular-nums">{(deal.commission_rate * 100).toFixed(0)}%</span> (<span className="font-mono tabular-nums">${deal.commission_amount.toLocaleString()}</span>)
            {deal.territory?.length > 0 && ` | ${deal.territory.join(", ")}`}
          </p>
        </div>
      </div>

      {allOk === false && (
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="py-4">
            <h3 className="text-sm font-medium text-warning mb-2">Flagged Parameters</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(flags)
                .filter(([k, v]) => !k.startsWith("_") && typeof v === "object" && (v as Record<string, string>).status === "flagged")
                .map(([key, val]) => (
                  <Badge key={key} variant="outline" className="bg-warning/10 text-warning">
                    {key}: {(val as Record<string, string>).reason}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Action Bar */}
      {deal.status && NEXT_ACTION[deal.status] && (
        <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-medium text-foreground">{humanizeEnum(deal.status)}</span>
            </div>
            <Button
              size="sm"
              variant={NEXT_ACTION[deal.status].variant || "default"}
              onClick={() => onConfirmAction(NEXT_ACTION[deal.status])}
              disabled={transitioning}
            >
              {transitioning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {NEXT_ACTION[deal.status].label}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">{NEXT_ACTION[deal.status].hint}</p>
        </div>
      )}

      {/* Negotiation Knowledge Opt-In */}
      {showTrainPrompt && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-3">
            <p className="text-sm">Add this decision to your assistant&apos;s knowledge?</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onTrainAssistant()}>Yes</Button>
              <Button size="sm" variant="ghost" onClick={onDismissTrainPrompt}>No</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
