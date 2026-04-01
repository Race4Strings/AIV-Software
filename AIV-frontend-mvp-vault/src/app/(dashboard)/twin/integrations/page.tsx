"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, ArrowRight, Link2, FileText, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { fetchTwins } from "@/lib/api/twins";
import { integrationsApi } from "@/lib/api/integrations";

export default function IntegrationsPage() {
  const [twinId, setTwinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTwins()
      .then((twins) => {
        if (twins.length > 0) setTwinId((twins[0] as unknown as { id: string }).id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!twinId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Fingerprint className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No digital twin yet</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Create your digital twin first, then feed it content from interviews, meetings, and media appearances.
        </p>
        <Link href="/onboard"><Button className="mt-6">Start Onboarding</Button></Link>
      </div>
    );
  }

  function isYouTubeUrl(inputUrl: string): boolean {
    const lower = inputUrl.toLowerCase();
    return lower.includes("youtube.com") || lower.includes("youtu.be");
  }

  async function handleSubmit() {
    if (!content.trim() && !url.trim()) {
      toast.error("Paste a transcript, article, or drop a link");
      return;
    }
    setSubmitting(true);
    try {
      const result = await integrationsApi.ingest(twinId!, {
        content: content.trim() || undefined,
        url: url.trim() || undefined,
        title: title.trim() || undefined,
      });

      toast.success(result.message || "Content submitted — your twin is learning from it");
      setContent("");
      setUrl("");
      setTitle("");
    } catch {
      toast.error("Failed to submit content. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feed Your Twin</h1>
        <p className="text-muted-foreground mt-1">
          Paste transcripts, articles, or links. Your twin automatically learns from everything you share.
        </p>
      </div>

      {/* Quick context */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-3 text-center">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">Paste transcripts</span>
          <span className="text-[10px] text-muted-foreground">Meetings, interviews, podcasts</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-3 text-center">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">YouTube links</span>
          <span className="text-[10px] text-muted-foreground">Auto-extracts transcripts</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 p-3 text-center">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium">Or use the chat</span>
          <span className="text-[10px] text-muted-foreground">Training Area handles it all</span>
        </div>
      </div>

      {/* Single unified form */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Content</Label>
            <Textarea
              placeholder="Paste a transcript, article text, interview notes, or any content about you..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-y"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Link</Label>
            <Input
              placeholder="Paste a YouTube link — transcript auto-extracted"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {url && (
              <p className="text-[10px] mt-1">
                {isYouTubeUrl(url) ? (
                  <span className="text-primary">YouTube detected — transcript will be auto-extracted</span>
                ) : (
                  <span className="text-muted-foreground">URL saved for reference. For best results, paste the text content above.</span>
                )}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Title (optional)</Label>
            <Input
              placeholder="What is this? e.g., 'Joe Rogan Podcast Episode 412'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && !url.trim())}
            className="w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Feed to Twin
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Everything you share is analyzed by the identity engine and applied to your twin's personality, knowledge, and communication style. You can also do this directly in the <Link href="/twin/training-area" className="text-primary hover:underline">Training Area</Link> chat.
      </p>
    </div>
  );
}
