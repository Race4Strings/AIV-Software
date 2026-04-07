"use client";

import { use, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  BadgeCheck,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  Hash,
  Layers,
  FileText,
  User,
  Loader2,
  ExternalLink,
  Printer,
} from "lucide-react";
import { verifyCertification, type PublicCertification } from "@/lib/api/verify";
import { ErrorState } from "@/components/shared/error-state";

interface VerifyPageProps {
  params: Promise<{ certId: string }>;
}

const FALLBACK_ASSETS = [
  "Identity Profile",
  "Personality Data",
  "Voice Clone",
  "Visual Identity",
  "Commercial Terms",
  "Governance Rules",
];

export default function VerifyPage({ params }: VerifyPageProps) {
  const { certId } = use(params);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<PublicCertification | null>(null);
  const [error, setError] = useState(false);

  const loadCert = useCallback(() => {
    if (certId.length < 16) {
      setLoading(false);
      return;
    }
    setError(false);
    setLoading(true);
    verifyCertification(certId)
      .then((data) => {
        setCert(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [certId]);

  useEffect(() => {
    loadCert();
  }, [loadCert]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(certId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash =
    certId.length > 24
      ? `${certId.slice(0, 12)}...${certId.slice(-12)}`
      : certId;

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 print:hidden">
        <div className="mb-8">
          <Skeleton className="h-[48px] w-[120px]" />
        </div>
        <Skeleton className="mb-2 h-8 w-72" />
        <Skeleton className="mb-8 h-4 w-56" />
        <Card className="w-full max-w-lg border-border bg-card">
          <CardHeader className="items-center gap-4 pb-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-px w-full bg-border" />
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-full rounded" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-5 w-20 rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8">
          <Image src="/aiv.svg" alt="AIV" width={200} height={200}
            className="h-[48px] w-auto object-contain brightness-0 invert" />
        </div>
        <ErrorState
          title="Unable to verify this certificate"
          description="The certificate may not exist or the service is temporarily unavailable."
          onRetry={loadCert}
        />
        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} AIV — Digital Identity Protection
        </p>
      </main>
    );
  }

  if (certId.length < 16 || !cert) {
    return <InvalidCertification certId={certId} />;
  }

  const certDate = new Date(cert.certified_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const coveredAssets = cert.covered_assets?.length ? cert.covered_assets : FALLBACK_ASSETS;

  return (
    <>
      <style>{`
        @media print {
          nav, header, footer, button, .print\\:hidden { display: none !important; }
          body, main { background: white !important; color: black !important; }
          main { padding: 0 !important; min-height: auto !important; }
          * { color: black !important; border-color: #ddd !important; background-color: transparent !important; }
          code { background-color: #f3f4f6 !important; color: #065f46 !important; }
          .text-success { color: #065f46 !important; }
          .text-accent-foreground { color: #6b21a8 !important; }
          .bg-emerald-500\\/15, .bg-purple-500\\/10 { background-color: #f0fdf4 !important; }
          .animate-pulse { animation: none !important; }
        }
      `}</style>
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Image src="/aiv.svg" alt="AIV" width={200} height={200}
          className="h-[48px] w-auto object-contain brightness-0 invert" />
      </div>

      <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-white">
        Digital Identity Verification
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Certificate authenticity confirmed by the AIV platform
      </p>

      <Card className="relative w-full max-w-lg border-border bg-card overflow-hidden print:shadow-none print:border">
        {/* Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center print:hidden">
          <Image src="/aiv.svg" alt="" width={280} height={280} className="opacity-[0.03] rotate-[-12deg] brightness-0 invert select-none" aria-hidden="true" />
        </div>
        <CardHeader className="relative items-center gap-4 pb-2">
          <Badge className="gap-1.5 border-success/30 bg-success/10 px-3 py-1 text-sm text-success hover:bg-success/10 shadow-lg shadow-success/20">
            <ShieldCheck className="h-4 w-4" />
            Verified
          </Badge>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold text-white">Verified Identity</span>
            </div>
            <span className="text-sm uppercase tracking-wider text-muted-foreground">
              Certificate of Digital Identity Ownership
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-5">
          <div className="h-px w-full bg-border" />

          <div className="space-y-4">
            {/* Owner */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Certified Identity
                </p>
                <p className="text-sm font-medium text-white">{cert.twin_name}</p>
                {cert.twin_public_name && cert.twin_public_name !== cert.twin_name && (
                  <p className="text-xs text-muted-foreground/70">({cert.twin_public_name})</p>
                )}
                {cert.twin_category && (
                  <p className="text-xs capitalize text-muted-foreground/70">{cert.twin_category}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Certification Date
                </p>
                <p className="text-sm text-white">{certDate}</p>
              </div>
            </div>

            {/* Version */}
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Certification
                </p>
                <p className="text-sm text-white">Immutable Record</p>
              </div>
            </div>

            {/* Hash */}
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  SHA-256 Hash
                </p>
                <div className="mt-1 flex items-center gap-2 bg-background rounded-lg p-3">
                  <code className="min-w-0 truncate font-mono text-xs text-success">
                    {truncatedHash}
                  </code>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-white print:hidden"
                    onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Blockchain Anchor */}
            <div className="flex items-start gap-3 pt-3 pb-3 mt-1 rounded-lg bg-muted/50 px-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Blockchain Seal
                  </p>
                  {cert.tx_hash ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent-foreground">
                      <div className="size-1 rounded-full bg-accent animate-pulse" />
                      {cert.network === "polygon-amoy" ? "Polygon Amoy Testnet" : "Polygon Network"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-xs text-warning">
                      <div className="size-1 rounded-full bg-warning animate-pulse" />
                      Pending
                    </div>
                  )}
                </div>
                {cert.tx_hash ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary">Transaction Hash</span>
                      <a href={cert.network === "polygon-amoy"
                        ? `https://amoy.polygonscan.com/tx/${cert.tx_hash}`
                        : `https://polygonscan.com/tx/${cert.tx_hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-success hover:text-success/90 flex items-center gap-1">
                        {cert.tx_hash.slice(0, 8)}...{cert.tx_hash.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {cert.block_number && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-primary">Block Number</span>
                        <span className="font-mono text-white">{cert.block_number}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-primary italic">
                    Anchoring transaction pending...
                  </p>
                )}
              </div>
            </div>

            {/* Covered */}
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  What&apos;s Covered
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {coveredAssets.map((item) => (
                    <span key={item}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          <p className="text-center text-xs leading-relaxed text-muted-foreground/70">
            This certificate attests that {cert.twin_name}&apos;s digital identity profile
            was captured, reviewed, and certified through the AIV platform.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-center print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-border text-muted-foreground hover:text-white active:scale-[0.97] transition-transform duration-150">
          <Printer className="h-3.5 w-3.5" /> Print Certificate
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} AIV — Digital Identity Protection
      </p>
      <div className="text-center text-xs uppercase tracking-widest text-muted-foreground/40 mt-6">
        Issued by AIV — Digital Identity Infrastructure
      </div>
    </main>
    </>
  );
}


function InvalidCertification({ certId }: { certId: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Image src="/aiv.svg" alt="AIV" width={200} height={200}
          className="h-[48px] w-auto object-contain brightness-0 invert" />
      </div>

      <Card className="w-full max-w-lg border-border bg-card">
        <CardHeader className="items-center gap-4">
          <Badge variant="destructive"
            className="gap-1.5 border-destructive/30 bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            Invalid
          </Badge>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-semibold text-white">Certification Not Found</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              The certification ID{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-destructive">
                {certId.length > 20 ? `${certId.slice(0, 10)}...${certId.slice(-10)}` : certId}
              </code>{" "}
              could not be verified. It may be invalid, expired, or the URL may be incorrect.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-xs text-muted-foreground/70">
            If you believe this is an error, please contact the certificate holder or reach out to AIV support.
          </p>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} AIV — Digital Identity Protection
      </p>
    </main>
  );
}
