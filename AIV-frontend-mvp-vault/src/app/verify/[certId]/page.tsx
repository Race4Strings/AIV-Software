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
        <Card className="w-full max-w-lg border-[oklch(0.25_0.02_262)] bg-[oklch(0.16_0.018_262)]">
          <CardHeader className="items-center gap-4 pb-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-px w-full bg-[oklch(0.25_0.02_262)]" />
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
        <Card className="w-full max-w-lg border-[oklch(0.25_0.02_262)] bg-[oklch(0.16_0.018_262)]">
          <CardHeader className="items-center gap-4">
            <Badge variant="destructive"
              className="gap-1.5 border-red-500/30 bg-red-500/15 px-3 py-1 text-sm text-red-400 hover:bg-red-500/15">
              <AlertCircle className="h-4 w-4" />
              Error
            </Badge>
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-semibold text-white">Unable to verify this certificate</h2>
              <p className="max-w-sm text-sm text-[oklch(0.65_0.015_262)]">
                The certificate may not exist or the service is temporarily unavailable.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button variant="outline" onClick={loadCert}>
              Try Again
            </Button>
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-xs text-[oklch(0.45_0.01_262)]">
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
          .text-emerald-400 { color: #065f46 !important; }
          .text-purple-400 { color: #6b21a8 !important; }
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
      <p className="mb-8 text-center text-sm text-[oklch(0.65_0.015_262)]">
        Certificate authenticity confirmed by the AIV platform
      </p>

      <Card className="relative w-full max-w-lg border-[oklch(0.25_0.02_262)] bg-[oklch(0.16_0.018_262)] overflow-hidden print:shadow-none print:border">
        {/* Watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center print:hidden">
          <Image src="/aiv.svg" alt="" width={280} height={280} className="opacity-[0.03] rotate-[-12deg] brightness-0 invert select-none" aria-hidden="true" />
        </div>
        <CardHeader className="relative items-center gap-4 pb-2">
          <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400 hover:bg-emerald-500/15 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
            Verified
          </Badge>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[oklch(0.55_0.2_262)]" />
              <span className="text-lg font-semibold text-white">Verified Identity</span>
            </div>
            <span className="text-sm uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
              Certificate of Digital Identity Ownership
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-5">
          <div className="h-px w-full bg-[oklch(0.25_0.02_262)]" />

          <div className="space-y-4">
            {/* Owner */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.2_262)]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                  Certified Identity
                </p>
                <p className="text-sm font-medium text-white">{cert.twin_name}</p>
                {cert.twin_public_name && cert.twin_public_name !== cert.twin_name && (
                  <p className="text-xs text-[oklch(0.55_0.015_262)]">({cert.twin_public_name})</p>
                )}
                {cert.twin_category && (
                  <p className="text-xs capitalize text-[oklch(0.55_0.015_262)]">{cert.twin_category}</p>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.2_262)]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                  Certification Date
                </p>
                <p className="text-sm text-white">{certDate}</p>
              </div>
            </div>

            {/* Version */}
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.2_262)]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                  Certification
                </p>
                <p className="text-sm text-white">Immutable Record</p>
              </div>
            </div>

            {/* Hash */}
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.2_262)]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                  SHA-256 Hash
                </p>
                <div className="mt-1 flex items-center gap-2 bg-[oklch(0.12_0.015_262)] rounded-lg p-3">
                  <code className="min-w-0 truncate font-mono text-xs text-emerald-400">
                    {truncatedHash}
                  </code>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 text-[oklch(0.65_0.015_262)] hover:text-white print:hidden"
                    onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Blockchain Anchor */}
            <div className="flex items-start gap-3 pt-3 pb-3 mt-1 rounded-lg bg-[oklch(0.14_0.015_262)] px-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                    Blockchain Seal
                  </p>
                  {cert.tx_hash ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400">
                      <div className="size-1 rounded-full bg-purple-500 animate-pulse" />
                      {cert.network === "polygon-amoy" ? "Polygon Amoy Testnet" : "Polygon Network"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
                      <div className="size-1 rounded-full bg-amber-500 animate-pulse" />
                      Pending
                    </div>
                  )}
                </div>
                {cert.tx_hash ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[oklch(0.55_0.2_262)]">Transaction Hash</span>
                      <a href={cert.network === "polygon-amoy"
                        ? `https://amoy.polygonscan.com/tx/${cert.tx_hash}`
                        : `https://polygonscan.com/tx/${cert.tx_hash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        {cert.tx_hash.slice(0, 8)}...{cert.tx_hash.slice(-6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {cert.block_number && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[oklch(0.55_0.2_262)]">Block Number</span>
                        <span className="font-mono text-white">{cert.block_number}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[oklch(0.55_0.2_262)] italic">
                    Anchoring transaction pending...
                  </p>
                )}
              </div>
            </div>

            {/* Covered */}
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.55_0.2_262)]" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[oklch(0.65_0.015_262)]">
                  What&apos;s Covered
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {coveredAssets.map((item) => (
                    <span key={item}
                      className="rounded-full bg-[oklch(0.22_0.02_262)] px-2.5 py-0.5 text-xs text-[oklch(0.75_0.01_262)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-[oklch(0.25_0.02_262)]" />

          <p className="text-center text-xs leading-relaxed text-[oklch(0.55_0.015_262)]">
            This certificate attests that {cert.twin_name}&apos;s digital identity profile
            was captured, reviewed, and certified through the AIV platform.
          </p>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-center print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-[oklch(0.25_0.02_262)] text-[oklch(0.65_0.015_262)] hover:text-white active:scale-[0.97] transition-transform duration-150">
          <Printer className="h-3.5 w-3.5" /> Print Certificate
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-[oklch(0.45_0.01_262)]">
        © {new Date().getFullYear()} AIV — Digital Identity Protection
      </p>
      <div className="text-center text-[10px] uppercase tracking-widest text-[oklch(0.40_0.01_262)] mt-6">
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

      <Card className="w-full max-w-lg border-[oklch(0.25_0.02_262)] bg-[oklch(0.16_0.018_262)]">
        <CardHeader className="items-center gap-4">
          <Badge variant="destructive"
            className="gap-1.5 border-red-500/30 bg-red-500/15 px-3 py-1 text-sm text-red-400 hover:bg-red-500/15">
            <AlertCircle className="h-4 w-4" />
            Invalid
          </Badge>
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-semibold text-white">Certification Not Found</h2>
            <p className="max-w-sm text-sm text-[oklch(0.65_0.015_262)]">
              The certification ID{" "}
              <code className="rounded bg-[oklch(0.13_0.015_262)] px-1.5 py-0.5 font-mono text-xs text-red-400">
                {certId.length > 20 ? `${certId.slice(0, 10)}...${certId.slice(-10)}` : certId}
              </code>{" "}
              could not be verified. It may be invalid, expired, or the URL may be incorrect.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-xs text-[oklch(0.55_0.015_262)]">
            If you believe this is an error, please contact the certificate holder or reach out to AIV support.
          </p>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-[oklch(0.45_0.01_262)]">
        © {new Date().getFullYear()} AIV — Digital Identity Protection
      </p>
    </main>
  );
}
