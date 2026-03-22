"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  BadgeCheck,
  Eye,
  Mic,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Circle,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchTwins, fetchTwin, fetchCompleteness, pickBestTwin } from "@/lib/api/twins";
import { fetchLatestCert } from "@/lib/api/certifications";
import { fetchAuditLogs } from "@/lib/api/audit";
import { documentApi } from "@/lib/api/documents";
import { formatDistanceToNow } from "date-fns";
import type { Twin, TwinCompleteness } from "@/lib/api/twins";
import type { Certification } from "@/lib/api/certifications";
import type { AuditLog } from "@/lib/api/audit";

interface ProtectionItem {
  label: string;
  done: boolean;
  href: string;
}

export function VaultDashboard() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [completeness, setCompleteness] = useState<TwinCompleteness | null>(null);
  const [cert, setCert] = useState<Certification | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Calculate score safely hook-wise
  const score = twin ? Math.round((
    [
      true,
      twin.voice_status === "ready" || twin.voice_status === "cloned",
      !!twin.certified_at,
      !!(twin.governance && Object.keys(twin.governance).length > 0),
      docCount > 0
    ].filter(Boolean).length / 5
  ) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  useEffect(() => {
    async function load() {
      try {
        const twins = await fetchTwins();
        if (twins.length === 0) {
          setLoading(false);
          return;
        }
        // Pick the most complete twin (has bio/category) rather than just the newest
        const bestTwin = pickBestTwin(twins);
        if (!bestTwin) { setLoading(false); return; }
        const t = await fetchTwin(bestTwin.id);
        setTwin(t);
        if (!t) { setLoading(false); return; }

        const [comp, latestCert, logs, docs] = await Promise.all([
          fetchCompleteness(t.id),
          fetchLatestCert(t.id),
          fetchAuditLogs(t.id),
          documentApi.getDocuments(t.id).catch(() => []),
        ]);
        setCompleteness(comp);
        setCert(latestCert);
        setAuditLogs(logs.slice(0, 8));
        setDocCount(docs.length);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden border-border/50 bg-card shadow-xl shadow-primary-500/5 mt-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center justify-center gap-6 p-12 text-center relative z-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary-500/30 bg-primary-500/10 shadow-inner">
            <Fingerprint className="h-10 w-10 text-primary-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome to AIV</h2>
            <p className="max-w-md text-base text-muted-foreground leading-relaxed mx-auto">
              Your digital identity is your most valuable asset. Complete our guided onboarding to establish, protect, and monetize your digital twin.
            </p>
          </div>
          <Button asChild size="lg" className="mt-4 gap-2 text-base h-12 px-8 shadow-lg shadow-primary-500/25 transition-all hover:scale-105 hover:shadow-primary-500/40">
            <Link href="/onboard">
              Start Onboarding <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const governanceHasData = twin.governance && Object.keys(twin.governance).length > 0;
  const commercialHasData = twin.commercial_terms && Object.keys(twin.commercial_terms).length > 0;

  const protectionChecklist: ProtectionItem[] = [
    { label: "Identity captured", done: true, href: "/twin#identity" },
    { label: "Voice cloned", done: twin.voice_status === "ready" || twin.voice_status === "cloned", href: "/twin#voice" },
    { label: "Identity certified", done: !!twin.certified_at, href: "/twin/certification" },
    { label: "Governance rules set", done: !!governanceHasData, href: "/twin#governance" },
    { label: "Legal documents generated", done: docCount > 0, href: "/twin/documents" },
  ];

  const completedCount = protectionChecklist.filter((i) => i.done).length;

  const assetPanels = [
    {
      title: "Visual Identity",
      icon: Eye,
      href: "/twin",
      status: twin.alcm_data?.visual ? "Captured" : "Setup needed",
      active: !!twin.alcm_data?.visual,
      description: "Profile photos, style guide, brand colors",
    },
    {
      title: "Voice Protection",
      icon: Mic,
      href: "/twin",
      status: twin.voice_status === "ready" || twin.voice_status === "cloned"
        ? "Protected"
        : twin.voice_status === "processing"
          ? "Processing"
          : "Pending",
      active: twin.voice_status === "ready" || twin.voice_status === "cloned",
      description: "Voice samples, cloning status, legal protection",
    },
    {
      title: "Commercial Terms",
      icon: DollarSign,
      href: "/twin",
      status: commercialHasData ? "Configured" : "Not configured",
      active: !!commercialHasData,
      description: "Rates, exclusions, licensing preferences",
    },
    {
      title: "Documents",
      icon: FileText,
      href: "/twin/documents",
      status: `${docCount} document${docCount !== 1 ? "s" : ""}`,
      active: docCount > 0,
      description: "Legal templates, contracts, guidelines",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Zone 1: Twin Identity Card */}
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-lg shadow-primary-500/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-primary-500/30 bg-primary-500/10">
              <Shield className="h-8 w-8 text-primary-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{twin.name}</h1>
              <p className="text-muted-foreground">
                {twin.public_name ? `${twin.public_name} · ` : ""}
                {twin.category ? twin.category.charAt(0).toUpperCase() + twin.category.slice(1) : "Creator"}
              </p>
              <div className="flex items-center gap-3 pt-1">
                {twin.certified_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="h-3 w-3" /> Certified
                  </span>
                ) : (
                  <Link
                    href="/twin/certification"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <ShieldCheck className="h-3 w-3" /> Not certified — Certify now
                  </Link>
                )}
                <span className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Updated {new Date(twin.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-6 mt-4 sm:mt-0">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg className="h-full w-full rotate-[-90deg]">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  className="stroke-muted/30"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${(animatedScore / 100) * 264} 264`}
                  className="stroke-primary-500 transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{Math.round(score)}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end sm:items-start">
              <p className="text-sm font-medium text-muted-foreground">Profile Status</p>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link href="/twin" className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  View Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Protection Status Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${cert ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              <ShieldCheck className={`h-6 w-6 ${cert ? "text-emerald-500" : "text-amber-500"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Certification</p>
              <p className="text-lg font-semibold">
                {cert ? "Active" : "Not Certified"}
              </p>
              {cert && (
                <p className="text-xs text-muted-foreground">
                  {new Date(cert.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500/10">
              <FileText className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Legal Documents</p>
              <p className="text-lg font-semibold">{docCount}</p>
              <p className="text-xs text-muted-foreground">
                {docCount === 0 ? "Generate your first" : `${docCount} generated`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${completedCount === protectionChecklist.length ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
              <Shield className={`h-6 w-6 ${completedCount === protectionChecklist.length ? "text-emerald-500" : "text-blue-500"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Protection Level</p>
              <p className="text-lg font-semibold">
                {completedCount === protectionChecklist.length ? "Full" : `${completedCount}/${protectionChecklist.length}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {completedCount === protectionChecklist.length ? "All protections active" : `${protectionChecklist.length - completedCount} remaining`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone 2: Protection Checklist + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Protection Checklist */}
        <Card className="lg:col-span-2 border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-500" />
                <h2 className="font-semibold">Protection Checklist</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{protectionChecklist.length} complete
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {protectionChecklist.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {!twin.certified_at && (
                <Button asChild variant="default" className="w-full justify-start gap-2" size="sm">
                  <Link href="/twin/certification">
                    <BadgeCheck className="h-4 w-4" /> Certify Identity
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full justify-start gap-2" size="sm">
                <Link href="/twin/documents/templates">
                  <FileText className="h-4 w-4" /> Generate Legal Document
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2" size="sm">
                <Link href="/twin">
                  <Fingerprint className="h-4 w-4" /> Edit Profile
                </Link>
              </Button>
              {cert && (
                <Button asChild variant="outline" className="w-full justify-start gap-2" size="sm">
                  <Link href={`/verify/${cert.hash}`}>
                    <ShieldCheck className="h-4 w-4" /> View Certificate
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone 3: Asset Overview Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {assetPanels.map((panel) => (
          <Link
            key={panel.title}
            href={panel.href}
            className="group rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-primary-500/30 hover:shadow-md hover:shadow-primary-500/5"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                <panel.icon className="h-5 w-5 text-primary-500 dark:text-primary-400" />
              </div>
              <span className={`text-xs font-medium ${panel.active ? "text-emerald-500" : "text-amber-500 dark:text-amber-400"}`}>
                {panel.status}
              </span>
            </div>
            <h3 className="mt-3 font-semibold group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
              {panel.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{panel.description}</p>
          </Link>
        ))}
      </div>

      {/* Zone 4: Activity Feed */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activity yet. Complete your profile to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {auditLogs.map((log) => (
                <li key={log.id} className="relative flex items-start gap-4 text-sm pb-4 last:pb-0 before:absolute before:left-[11px] before:top-6 before:bottom-0 before:w-px before:bg-border/60 last:before:hidden">
                  <div className="relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-card z-10">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-0.5">
                      <span className="font-medium capitalize text-foreground">
                        {log.action.replace(/_/g, " ")} <span className="text-muted-foreground font-normal lowercase">on</span> {log.entity_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Object.entries(log.details)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {auditLogs.length > 0 && (
            <Link
              href="/twin/certification"
              className="mt-4 flex items-center gap-1 text-xs text-primary-500 hover:underline"
            >
              View full audit trail <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


