"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface HashDisplayProps {
  hash: string;
  className?: string;
}

export function HashDisplay({ hash, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false);
  const truncated = hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-muted/80 transition-colors",
        className
      )}
      title="Click to copy full hash"
    >
      <span>{truncated}</span>
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}
