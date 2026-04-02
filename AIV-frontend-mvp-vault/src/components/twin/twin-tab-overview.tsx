"use client";

import Link from "next/link";
import {
  Fingerprint, Bot, BadgeCheck, Shield, DollarSign, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
}

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

interface TwinTabOverviewProps {
  twin: TwinData;
  health: HealthData | null;
  categories: string[];
  displayName: string;
  isBuilding: boolean;
  dealCount: number;
  revenue: { net_revenue: number } | null;
  categoryHints: Record<string, string>;
  onTabChange: (tab: string) => void;
}

export function TwinTabOverview({
  twin,
  health,
  categories,
  displayName,
  isBuilding,
  dealCount,
  revenue,
  categoryHints,
  onTabChange,
}: TwinTabOverviewProps) {
  const category = categories[0];

  return (
    <div className="space-y-4 mt-4">
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
          {category && categoryHints[category] && (
            <p className="text-xs text-muted-foreground/60 mt-2">
              Typical {category.toLowerCase()} deal range: {categoryHints[category]}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" className="justify-start h-auto py-3" onClick={() => onTabChange("identity")}>
          <Fingerprint className="h-4 w-4 mr-2 text-primary" /> Edit Identity
        </Button>
        <Button variant="outline" className="justify-start h-auto py-3" onClick={() => onTabChange("guardrails")}>
          <Shield className="h-4 w-4 mr-2 text-primary" /> Configure Guardrails
        </Button>
        <Button variant="outline" className="justify-start h-auto py-3" onClick={() => onTabChange("licensing")}>
          <DollarSign className="h-4 w-4 mr-2 text-primary" /> Licensing Rules
        </Button>
        <Link href="/twin/training-area" className="contents">
          <Button variant="outline" className="justify-start h-auto py-3">
            <Bot className="h-4 w-4 mr-2 text-primary" /> Train Your Twin
          </Button>
        </Link>
      </div>
    </div>
  );
}
