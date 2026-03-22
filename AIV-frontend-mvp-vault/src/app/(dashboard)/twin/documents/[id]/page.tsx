"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Download, FileText, MessageSquare, Send, Lock,
} from "lucide-react";
import { fetchTwins, Twin } from "@/lib/api/twins";
import { documentApi, Document } from "@/lib/api/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "sonner";

export default function DocumentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [twin, setTwin] = useState<Twin | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userTwins = await fetchTwins();
        if (userTwins.length > 0) {
          const best =
            userTwins.find((tw: { bio?: string; category?: string }) => tw.bio || tw.category) ||
            userTwins[0];
          setTwin(best);
          const doc = await documentApi.getDocument(best.id, id);
          setDocument(doc);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to load document", error);
        toast.error("Could not load document.");
        router.push("/twin/documents");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  const handleExportPdf = async () => {
    if (!document) return;
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const container = window.document.createElement("div");
      container.innerHTML = document.content || "";
      container.style.padding = "40px";
      container.style.fontFamily = "Georgia, serif";
      container.style.fontSize = "12px";
      container.style.lineHeight = "1.6";
      container.style.color = "#000";
      await html2pdf()
        .set({
          margin: [0.75, 0.75],
          filename: `${document.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(container)
        .save();
    } catch {
      const tempDiv = window.document.createElement("div");
      tempDiv.innerHTML = document.content || "";
      const text = tempDiv.textContent || tempDiv.innerText || "";
      const blob = new Blob([`# ${document.title}\n\n${text}`], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document || !twin) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col -m-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/twin/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold truncate">{document.title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={document.status} />
          <Button variant="outline" size="sm" disabled className="opacity-50">
            <Download className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Blurred editor mockup with Coming Soon overlay */}
      <div className="relative flex-1 overflow-hidden">
        {/* Coming Soon overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-background/90 px-10 py-8 shadow-lg text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI-Assisted Document Editor</h2>
              <p className="text-sm text-muted-foreground mt-1">Coming Soon</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              Edit documents and collaborate with AIV to draft, review, and refine content — all in one canvas.
            </p>
          </div>
        </div>

        {/* Blurred mockup of the split editor UI */}
        <div className="flex h-full select-none pointer-events-none blur-[2px] opacity-60">
          {/* Editor pane with realistic contract content */}
          <div className="flex-1 border-r border-border/30 p-8 overflow-hidden">
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 space-y-4">
              <h1 className="text-2xl font-bold">Brand Licensing Agreement</h1>
              <p className="text-xs text-muted-foreground">Date: March 7, 2026</p>
              <p>This Brand Licensing Agreement (&quot;Agreement&quot;) is entered into as of the date set forth above, by and between the Licensor and the Licensee identified below.</p>
              <h2 className="text-lg font-semibold mt-6">I. Parties</h2>
              <p><strong>Licensor:</strong> [Your Name], an individual whose digital identity has been certified through the AIV Identity Certification system.</p>
              <p><strong>Licensee:</strong> [Company Name], a corporation organized under the laws of [State/Country].</p>
              <h2 className="text-lg font-semibold mt-6">II. Grant of License</h2>
              <p>Subject to the terms and conditions of this Agreement, Licensor hereby grants to Licensee a non-exclusive, non-transferable, revocable license to use the Licensed Materials as defined herein for the purposes outlined in Section III.</p>
              <h2 className="text-lg font-semibold mt-6">III. Scope of Use</h2>
              <ul className="list-disc ml-4 space-y-1">
                <li>Digital advertising campaigns on approved platforms</li>
                <li>Social media content creation and distribution</li>
                <li>Promotional materials for the agreed-upon product line</li>
                <li>Virtual appearances and AI-generated endorsements</li>
              </ul>
              <h2 className="text-lg font-semibold mt-6">IV. Compensation</h2>
              <p>In consideration for the rights granted herein, Licensee shall pay Licensor a licensing fee as follows:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Base Fee: $[Amount] per calendar quarter</li>
                <li>Revenue Share: [Percentage]% of net revenue derived from Licensed Materials</li>
              </ul>
              <h2 className="text-lg font-semibold mt-6">V. Term and Termination</h2>
              <p>This Agreement shall commence on the Effective Date and continue for a period of twelve (12) months unless terminated earlier in accordance with the provisions herein.</p>
            </div>
          </div>

          {/* AI Chat sidebar mockup */}
          <div className="w-[340px] shrink-0 flex flex-col bg-muted/10">
            <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AIV Assistant</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground/60">Document Assistant</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Ask AIV to help draft or refine this document.</p>
            </div>
            <div className="border-t border-border/30 px-3 py-2">
              <div className="flex gap-2">
                <Input placeholder="Ask about this document..." className="text-sm" disabled />
                <Button size="icon" disabled className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
