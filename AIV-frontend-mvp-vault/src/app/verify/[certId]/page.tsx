"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (certId.length < 16) {
      setLoading(false);
      return;
    }
    verifyCertification(certId).then((data) => {
      setCert(data);
      setLoading(false);
    });
  }, [certId]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(certId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash =
    certId.length > 24
      ? `${certId.slice(0, 12)}...${certId.slice(-12)}`
      : certId;

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
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

      <Card className="w-full max-w-lg border-[oklch(0.25_0.02_262)] bg-[oklch(0.16_0.018_262)]">
        <CardHeader className="items-center gap-4 pb-2">
          <Badge className="gap-1.5 border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400 hover:bg-emerald-500/15">
            <ShieldCheck className="h-4 w-4" />
            Verified
          </Badge>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[oklch(0.55_0.2_262)]" />
              <span className="text-lg font-semibold text-white">Verified Identity</span>
            </div>
            <span className="text-sm text-[oklch(0.65_0.015_262)]">
              Certificate of Digital Identity Ownership
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
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
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 truncate rounded bg-[oklch(0.13_0.015_262)] px-2 py-1 font-mono text-xs text-emerald-400">
                    {truncatedHash}
                  </code>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 text-[oklch(0.65_0.015_262)] hover:text-white"
                    onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Blockchain Anchor */}
            <div className="flex items-start gap-3 pt-2 pb-2">
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

      <p className="mt-8 text-center text-xs text-[oklch(0.45_0.01_262)]">
        © {new Date().getFullYear()} AIV — Digital Identity Protection
      </p>
    </main>
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
