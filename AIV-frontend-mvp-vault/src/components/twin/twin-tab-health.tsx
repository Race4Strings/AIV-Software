"use client";

import type React from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

interface HealthStatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}

interface TwinTabHealthProps {
  health: HealthData | null;
  isBuilding: boolean;
  healthCfg: HealthStatusConfig;
}

export function TwinTabHealth({ health, isBuilding, healthCfg }: TwinTabHealthProps) {
  const HealthIcon = healthCfg.icon;

  const metrics = health ? [
    { label: "Profile Accuracy", value: health.cfs, target: 0.65, color: "bg-primary", desc: "How accurately your twin represents you" },
    { label: "Data Completeness", value: health.psychographic_coverage, target: 0.50, color: "bg-accent", desc: "How much of your personality has been captured" },
    { label: "Model Reliability", value: health.personality_confidence, target: 0.50, color: "bg-success", desc: "Confidence in your personality model" },
  ] : [];

  return (
    <div className="space-y-4 mt-4">
      {health ? (
        <>
          {/* Health status banner */}
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <HealthIcon className={`h-6 w-6 ${healthCfg.color}`} />
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-bold ${healthCfg.color}`}>{healthCfg.label}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {healthCfg.label === "Healthy"
                  ? "Your identity profile is strong and ready for licensing."
                  : healthCfg.label === "Attention Needed"
                  ? "Some areas could be strengthened."
                  : healthCfg.label === "Action Required"
                  ? "Key areas may be outdated or incomplete."
                  : "Your identity health is being evaluated."}
              </span>
            </div>
            <Link href="/twin/training-area">
              <Button size="sm" variant="outline"><Bot className="h-4 w-4 mr-1" /> Train</Button>
            </Link>
          </div>

          {/* Progress metrics -- consistent for BUILDING and ACTIVE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const pct = metric.value * 100;
              const qualLabel = pct < 30 ? "Early stage" : pct < 50 ? "Developing" : pct < metric.target * 100 ? "Nearly ready" : "Ready for licensing";
              const qualColor = pct < 30 ? "text-muted-foreground" : pct < 50 ? "text-primary" : pct < metric.target * 100 ? "text-warning" : "text-success";
              return (
                <Card key={metric.label}>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium">{metric.label}</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-bold font-mono tabular-nums">{pct.toFixed(0)}%</span>
                      <span className={`text-xs font-semibold ${qualColor}`}>{qualLabel}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${metric.color} transition-[width] duration-500 ease-out`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{metric.desc}. Target: <span className="font-mono tabular-nums">{(metric.target * 100).toFixed(0)}%</span>.</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isBuilding && (
            <Card>
              <CardContent className="py-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">How to improve these scores</h3>
                <p className="text-sm text-muted-foreground">
                  These scores determine your readiness for licensing. Regular training sessions, uploading professional media, and refining your profile in the Training Area improve all three metrics.
                </p>
                <Link href="/twin/training-area">
                  <Button size="sm" className="mt-3"><Bot className="h-4 w-4 mr-1" /> Open Training Area</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Health data will be available once your identity begins processing.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
