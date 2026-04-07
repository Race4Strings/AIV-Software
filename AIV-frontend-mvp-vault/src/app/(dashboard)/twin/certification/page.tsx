"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  BadgeCheck,
  ShieldCheck,
  Clock,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { fetchTwins, fetchTwin } from "@/lib/api/twins";
import {
  fetchLatestCert,
  createCertification,
} from "@/lib/api/certifications";
import { fetchAuditLogs } from "@/lib/api/audit";
import { toast } from "sonner";
import { humanizeEnum } from "@/lib/humanize";
import type { Twin } from "@/lib/api/twins";
import type { Certification } from "@/lib/api/certifications";
import type { AuditLog } from "@/lib/api/audit";
import { generateCertificatePdf } from "@/lib/generate-certificate-pdf";

const COVERED_ASSETS = [
  "Identity Profile",
  "Personality Data",
  "Voice Likeness",
  "Visual Identity",
  "Commercial Terms",
  "Governance Rules",
];

export default function CertificationPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [latest, setLatest] = useState<Certification | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [certifying, setCertifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async (id: string) => {
    const [t, latestCert, logs] = await Promise.all([
      fetchTwin(id),
      fetchLatestCert(id),
      fetchAuditLogs(id),
    ]);
    setTwin(t);
    setLatest(latestCert);
    setAuditLogs(logs.filter((l) => l.entity_type === "certification" || l.action.includes("certif")));
  }, []);

  useEffect(() => {
    async function init() {
      const twins = await fetchTwins();
      if (twins.length > 0) {
        const best = twins.find((tw) => tw.bio || tw.category) || twins[0];
        await loadData(best.id);
      }
      setLoading(false);
    }
    init().catch(() => {
      toast.error("Failed to load certification data");
      setLoading(false);
    });
  }, [loadData]);

  const handleCertify = async () => {
    if (!twin) return;
    setCertifying(true);
    try {
      const cert = await createCertification(twin.id);
      if (cert) await loadData(twin.id);
    } catch {
      toast.error("Certification failed. Please try again.");
    }
    setCertifying(false);
  };

  const handleCopyHash = async () => {
    if (!latest) return;
    await navigator.clipboard.writeText(latest.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twin) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="No twin to certify"
        description="Complete onboarding first to create your digital twin."
        ctaLabel="Start Onboarding"
        ctaHref="/onboard"
      />
    );
  }

  const isProduction = process.env.NEXT_PUBLIC_CHAIN_ENV === "production" || process.env.NEXT_PUBLIC_CHAIN_ENV === "mainnet";

  const getNetworkLabel = (network?: string) => {
    if (isProduction) return "Blockchain Verified";
    if (network === "polygon-amoy") return "Polygon Amoy Testnet";
    return "Polygon Network";
  };

  const verifyUrl = latest ? `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${latest.hash}` : null;

  const handleDownloadPdf = () => {
    if (!latest || !twin || !verifyUrl) return;
    generateCertificatePdf({
      ownerName: twin.name,
      publicName: twin.public_name || undefined,
      certifiedAt: latest.created_at,
      hash: latest.hash,
      version: latest.version,
      txHash: latest.tx_hash,
      blockNumber: latest.block_number,
      network: latest.network,
      coveredAssets: COVERED_ASSETS,
      verifyUrl,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Identity Certification</h1>
          <p className="text-sm text-muted-foreground">
            Cryptographic proof of ownership for your digital identity
          </p>
        </div>
        {!latest ? (
          <Button onClick={handleCertify} disabled={certifying} className="active:scale-[0.97] transition-transform duration-150">
            {certifying ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Certify Now
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Button variant="outline" onClick={handleCertify} disabled={certifying} className="active:scale-[0.97] transition-transform duration-150">
              {certifying ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Update Certification
            </Button>
            <span className="text-xs text-muted-foreground">Creates a new version reflecting your latest identity data.</span>
          </div>
        )}
      </div>

      {latest ? (
        <Card id="certificate-card" className="overflow-hidden border border-border/50 ring-1 ring-border/20 ring-inset print:shadow-none print:border">
          {/* Certificate Header Bar */}
          <div className="bg-primary/10 px-6 py-3 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-success" />
              <span className="text-sm font-medium text-success">Verified Certificate</span>
            </div>
            <span className="text-xs text-muted-foreground">Version {latest.version}</span>
          </div>

          <CardContent className="p-8 md:p-10 space-y-8">
            {/* Title */}
            <div className="text-center space-y-3">
              <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">
                Certificate of Digital Identity Ownership
              </p>
              <div className="mx-auto h-px w-24 bg-primary/30" />
            </div>

            {/* Owner Name */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">This certifies that</p>
              <p className="text-xl font-semibold">{twin.name}</p>
              {twin.public_name && twin.public_name !== twin.name && (
                <p className="text-sm text-muted-foreground">({twin.public_name})</p>
              )}
            </div>

            {/* Attestation */}
            <p className="text-center text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              has captured, reviewed, and certified their digital identity profile
              through the AIV Identity Protection Platform on{" "}
              <span className="font-medium text-foreground">
                {new Date(latest.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              .
            </p>

            {/* Hash & Blockchain Seal */}
            <div className="rounded-lg border-t border border-border/50 bg-muted/30 p-6 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" />
                  Blockchain-Anchored Cryptographic Seal
                </p>
                <div className="flex items-center gap-2">
                  {latest.tx_hash ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent-foreground">
                      <div className="size-1.5 rounded-full bg-accent animate-pulse" />
                      {getNetworkLabel(latest.network)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-xs text-warning">
                      <div className="size-1.5 rounded-full bg-warning animate-pulse" />
                      Blockchain Pending
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleCopyHash} className="h-7 gap-1.5 text-xs">
                    {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <code className="block break-all font-mono text-xs text-success leading-relaxed mb-3">
                {latest.hash}
              </code>
              
              {/* Blockchain info from API */}
              {latest.tx_hash ? (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Transaction Hash</span>
                    <a 
                      href={latest.network === "polygon-amoy"
                        ? `https://amoy.polygonscan.com/tx/${latest.tx_hash}`
                        : `https://polygonscan.com/tx/${latest.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      {latest.tx_hash.slice(0, 10)}...{latest.tx_hash.slice(-8)}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Block Number</span>
                    <span className="font-mono text-foreground">{latest.block_number}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <span className="inline-block px-2 py-1 bg-muted rounded text-xs uppercase text-muted-foreground font-medium tracking-wider">
                    Blockchain Anchoring Incoming
                  </span>
                </div>
              )}
            </div>

            {/* Covered Assets */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Certified Assets
              </p>
              <div className="flex flex-wrap gap-2">
                {COVERED_ASSETS.map((asset) => (
                  <span
                    key={asset}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs"
                  >
                    <BadgeCheck className="size-3 text-success" />
                    {asset}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification URL */}
            {verifyUrl && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Public Verification URL
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-xs text-primary">
                    {verifyUrl}
                  </code>
                  <Link href={`/verify/${latest.hash}`} target="_blank">
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
                      <ExternalLink className="size-3" /> Open
                    </Button>
                  </Link>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this URL to prove ownership of your certified digital identity.
                </p>
              </div>
            )}

            {/* What This Means */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What This Certification Means
              </p>
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>
                  This certificate is a <span className="text-foreground font-medium">cryptographically sealed, immutable record</span> proving
                  you created and own this digital identity at the date and time shown above. It cannot be altered, re-issued, or revoked.
                </p>
                <p>
                  In the event of unauthorized use, deepfakes, or impersonation of your likeness, this certification
                  serves as <span className="text-foreground font-medium">documented proof of prior existence and ownership</span>. The SHA-256 hash
                  and blockchain anchor provide tamper-proof verification that your identity profile existed before any infringing content.
                </p>
                <p>
                  Share the public verification URL or download the PDF certificate to present as documentation in disputes,
                  DMCA takedowns, or platform enforcement actions.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" className="gap-2 active:scale-[0.97] transition-transform duration-150" onClick={handleDownloadPdf}>
                <Download className="size-3.5" /> Download Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title="No certifications yet"
          description="Certify your digital twin to create a tamper-proof record of your identity data. This is the foundation for all legal protection."
        />
      )}

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Certification Audit Trail</h2>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
              >
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">
                      {humanizeEnum(log.action)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.details && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.entries(log.details)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
