"use client";

import { useEffect, useState } from "react";
import { Video, Monitor, Mic, PlayCircle, Fingerprint, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { fetchTwins } from "@/lib/api/twins";
import { integrationsApi } from "@/lib/api/integrations";

const SOURCES = [
  { id: "google_meet", name: "Google Meet", icon: Video, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "zoom", name: "Zoom", icon: Monitor, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "podcast", name: "Podcast", icon: Mic, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "youtube", name: "YouTube", icon: PlayCircle, color: "text-red-500", bg: "bg-red-500/10" },
];

export default function IntegrationsPage() {
  const [twinId, setTwinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState("google_meet");
  const [transcript, setTranscript] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");
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
          Create your digital twin first, then use integrations to feed content from meetings, podcasts, and interviews.
        </p>
        <Link href="/onboard"><Button className="mt-6">Start Onboarding</Button></Link>
      </div>
    );
  }

  const isMeetOrZoom = selectedSource === "google_meet" || selectedSource === "zoom";

  async function handleSubmit() {
    if (!transcript.trim() && !recordingUrl.trim()) {
      toast.error("Provide a transcript or recording URL");
      return;
    }
    setSubmitting(true);
    try {
      const result = isMeetOrZoom
        ? await integrationsApi.ingestMeeting(twinId!, {
            transcript_text: transcript || undefined,
            recording_url: recordingUrl || undefined,
            meeting_title: title || undefined,
          })
        : await integrationsApi.ingestTranscript(twinId!, {
            transcript_text: transcript,
            source: selectedSource.toUpperCase(),
            title: title || undefined,
          });
      toast.success(result.message || "Content ingested successfully");
      setTranscript("");
      setRecordingUrl("");
      setTitle("");
    } catch {
      toast.error("Failed to ingest content. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ingest Content</h1>
        <p className="text-muted-foreground mt-1">
          Feed meetings, interviews, and podcasts into your twin's identity profile.
        </p>
      </div>

      {/* Source Selector */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Select source</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            const isActive = selectedSource === source.id;
            return (
              <button
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${source.bg}`}>
                  <Icon className={`h-5 w-5 ${source.color}`} />
                </div>
                <span className="text-xs font-medium">{source.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ingestion Form */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Title (optional)</Label>
            <Input
              placeholder={isMeetOrZoom ? "Meeting title" : "Episode or interview title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Transcript</Label>
            <Textarea
              placeholder="Paste the full transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              className="resize-y"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The transcript will be analyzed to extract personality traits, communication patterns, and knowledge.
            </p>
          </div>

          {isMeetOrZoom && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Recording URL (optional)</Label>
              <Input
                placeholder="https://meet.google.com/... or recording link"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || (!transcript.trim() && !recordingUrl.trim())}
            className="w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            Ingest Content
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Content is processed through the identity engine and automatically applied to your twin's profile.
      </p>
    </div>
  );
}
