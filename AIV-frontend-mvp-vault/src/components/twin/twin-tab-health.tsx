"use client";

import Link from "next/link";
import { Bot, CheckCircle2, AlertTriangle, AlertCircle, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HealthData {
  cfs: number;
  psychographic_coverage: number;
  personality_confidence: number;
  health_status: string;
}

interface HealthStatusConfig {
  icon: typeof CheckCircle2;
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

  return (
    <div className="space-y-4 mt-4">
      {isBuilding && health ? (
        /* BUILDING: Show progress metrics -- user needs them to track toward activation */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <span className="text-3xl font-bold font-mono tabular-nums">{pct.toFixed(0)}%</span>
                      <span className={`text-xs font-semibold ${qualColor}`}>{qualLabel}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${metric.color} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{metric.desc}. Target: <span className="font-mono tabular-nums">{(metric.target * 100).toFixed(0)}%</span>.</p>
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
        /* ACTIVE: Qualitative health indicator only -- no percentages (spec Section 5) */
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
    </div>
  );
}
