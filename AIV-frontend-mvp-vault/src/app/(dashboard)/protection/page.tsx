"use client";

import Link from "next/link";
import { Shield, Eye, ScanSearch, Bell, Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MONITORING_FEATURES = [
  {
    icon: ScanSearch,
    title: "Content Scanning",
    description: "Automated scanning of public platforms for unauthorized use of your likeness.",
  },
  {
    icon: Bell,
    title: "Alert System",
    description: "Real-time notifications when potential misuse of your identity is detected.",
  },
  {
    icon: Gavel,
    title: "Enforcement Actions",
    description: "Automated DMCA takedowns and platform-level enforcement for confirmed violations.",
  },
];

export default function ProtectionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Protection</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Certify your identity and monitor for unauthorized use.
        </p>
      </div>

      {/* Identity Certification */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Identity Certification</h2>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 shrink-0">
              <Shield className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Blockchain-Anchored Proof</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cryptographically sealed, immutable record proving you created and own your
                digital identity. Tamper-proof verification anchored to the blockchain.
              </p>
            </div>
            <Link href="/twin/certification">
              <Button variant="outline" size="sm">
                View Certificates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Misuse Monitoring */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Misuse Monitoring</h2>
          <Badge variant="outline" className="text-xs">
            Coming Soon
          </Badge>
        </div>
        <Card className="border-border/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">AI-Powered Detection</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered detection of unauthorized use of your identity across the internet.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {MONITORING_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-lg border border-border/50 bg-muted/30 p-4 opacity-60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{feature.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <Badge variant="outline" className="mt-3 text-xs">
                      Coming Soon
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
