"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { AudioPlayer } from "@/components/shared/audio-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Volume2,
  Sparkles,
  Loader2,
  Play,
  Save,
  Upload,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

const DEFAULT_TTS_SCRIPT =
  "Hey, welcome to my world. This is my digital voice — powered by AIV. Pretty cool, right?";
const MAX_CHARS = 500;
const TTS_STORAGE_KEY = "aiv_tts_saved";

interface SavedTTS {
  text: string;
  audioUrl?: string;
  twinId: string;
}

export function TwinTabVoice({ twin, onUpdate }: { twin: Twin; onUpdate?: () => void }) {
  const [ttsText, setTtsText] = useState(DEFAULT_TTS_SCRIPT);
  const [generating, setGenerating] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [savedText, setSavedText] = useState<string | null>(null);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);
  const [quickSampleUrl, setQuickSampleUrl] = useState<string | null>(null);
  const [quickSampleLoading, setQuickSampleLoading] = useState(false);
  const generatingRef = useRef(false);

  const voiceReady = twin.voice_status === "ready";

  // Debug info for diagnosing voice cloning issues
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const fetchDebugInfo = useCallback(async () => {
    setDebugLoading(true);
    try {
      const res = await fetch(`/api/backend/twins/${twin.id}/voice/debug`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDebugInfo(data);
      }
    } catch {
      // ignore
    } finally {
      setDebugLoading(false);
    }
  }, [twin.id]);

  // Load saved TTS from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TTS_STORAGE_KEY);
      if (raw) {
        const saved: SavedTTS = JSON.parse(raw);
        if (saved.twinId === twin.id && saved.text) {
          setSavedText(saved.text);
          setTtsText(saved.text);
        }
      }
    } catch {
      // ignore
    }
  }, [twin.id]);

  // Auto-generate the quick sample on mount if voice is ready and we don't have one
  useEffect(() => {
    if (!voiceReady || quickSampleUrl || generatingRef.current) return;

    // Check if we have a saved audio blob in session
    const sessionKey = `aiv_quick_sample_${twin.id}`;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      setQuickSampleUrl(cached);
      return;
    }

    // Auto-generate with default script
    generatingRef.current = true;
    setQuickSampleLoading(true);
    fetch(`/api/backend/twins/${twin.id}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text: DEFAULT_TTS_SCRIPT }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQuickSampleUrl(url);
        // Cache the blob URL in session so tab switches don't re-generate
        sessionStorage.setItem(sessionKey, url);
      })
      .catch((err) => {
        console.warn("[Voice] Quick sample generation failed:", err);
      })
      .finally(() => {
        setQuickSampleLoading(false);
        generatingRef.current = false;
      });
  }, [voiceReady, twin.id, quickSampleUrl]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (ttsAudioUrl) URL.revokeObjectURL(ttsAudioUrl);
    };
  }, [ttsAudioUrl]);

  const handleGenerate = useCallback(async () => {
    if (!ttsText.trim() || generating || !voiceReady) return;
    setGenerating(true);
    setTtsAudioUrl(null);

    try {
      const res = await fetch(`/api/backend/twins/${twin.id}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: ttsText.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setTtsAudioUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate audio";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [ttsText, generating, voiceReady, twin.id]);

  const handleSave = useCallback(() => {
    if (!ttsText.trim()) return;
    const saved: SavedTTS = { text: ttsText.trim(), twinId: twin.id };
    localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(saved));
    setSavedText(ttsText.trim());
    setSavedAudioUrl(ttsAudioUrl);
    toast.success("Voice script saved");
  }, [ttsText, twin.id, ttsAudioUrl]);

  const textChanged = ttsText.trim() !== (savedText || DEFAULT_TTS_SCRIPT);
  const needsRegenerate = ttsAudioUrl && textChanged;

  // ── PENDING STATE ──
  if (!voiceReady) {
    return (
      <div className="space-y-4">
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Mic className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Voice Clone Status</p>
                <p className="text-xs text-muted-foreground">
                  {twin.voice_status === "processing"
                    ? "Your voice is being cloned. This may take a few minutes."
                    : twin.voice_status === "failed"
                      ? "Voice cloning failed. Try re-cloning below."
                      : "Voice is captured during onboarding. If you've completed onboarding, it may still be processing."}
                </p>
              </div>
            </div>
            <StatusBadge status={twin.voice_status} variant="voice" />
          </CardContent>
        </Card>

        {(twin.voice_status === "pending" || twin.voice_status === "failed") && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <Mic className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {twin.voice_status === "failed"
                  ? "Something went wrong during voice cloning. Click Diagnose to see details."
                  : "Your voice identity will appear here once cloning completes."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdate?.()}
                  className="gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh Status
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDebugInfo}
                  disabled={debugLoading}
                  className="gap-1.5 text-xs"
                >
                  {debugLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                  Diagnose
                </Button>
              </div>
              {debugInfo && (
                <div className="mt-3 text-left bg-black/30 rounded-lg p-3 text-xs font-mono space-y-1 max-w-md mx-auto">
                  <p>ffmpeg: {debugInfo.ffmpeg_installed ? "✅" : "❌"} {String(debugInfo.ffmpeg_path ?? "not found")}</p>
                  <p>elevenlabs: {debugInfo.elevenlabs_configured ? "✅" : "❌"} key={String(debugInfo.elevenlabs_key_prefix ?? "")}</p>
                  <p>voice_id: {String(debugInfo.voice_id ?? "none")}</p>
                  <p>voice_status: {String(debugInfo.voice_status ?? "")}</p>
                  <p>voice_sample_url: {debugInfo.voice_sample_url ? "set" : "none"}</p>
                  {debugInfo.voice_error != null && (
                    <p className="text-red-400">error: {String(debugInfo.voice_error)}</p>
                  )}
                  {debugInfo.onboarding_session != null && (() => {
                    const s = debugInfo.onboarding_session as Record<string, unknown>;
                    return (
                      <>
                        <p className="pt-1 border-t border-white/10">session: {String(s.status ?? "")}</p>
                        <p>voice_urls: {JSON.stringify(s.voice_sample_urls ?? [])}</p>
                        <p>voice_video_url: {s.has_voice_video_url ? "✅" : "❌"}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Coming soon cards still show */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Upload className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upload Voice Samples</p>
                <p className="text-xs text-muted-foreground/70">Add more recordings to improve your voice clone</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Re-clone from Scratch</p>
                <p className="text-xs text-muted-foreground/70">Start fresh with new voice recordings</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── READY STATE ──
  return (
    <div className="space-y-4">
      {/* Voice Status */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
              <Mic className="size-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Voice Clone Active</p>
              <p className="text-xs text-muted-foreground">Your voice is ready for text-to-speech</p>
            </div>
          </div>
          <StatusBadge status={twin.voice_status} variant="voice" />
        </CardContent>
      </Card>

      {/* Quick Voice Sample — auto-generated with default script */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Play className="size-4 text-primary" />
            Voice Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground italic">&ldquo;{DEFAULT_TTS_SCRIPT}&rdquo;</p>
          {quickSampleLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Generating voice preview...</span>
            </div>
          ) : quickSampleUrl ? (
            <AudioPlayer src={quickSampleUrl} />
          ) : (
            <p className="text-xs text-muted-foreground/70">Could not generate preview. Try the TTS box below.</p>
          )}
        </CardContent>
      </Card>

      {/* Original Voice Sample from onboarding (if available) */}
      {twin.voice_sample_url && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Original Voice Sample</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer src={twin.voice_sample_url} />
          </CardContent>
        </Card>
      )}

      {/* TTS Playground */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Volume2 className="size-4 text-primary" />
            Text-to-Speech
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Type anything and hear it in your cloned voice. Save to keep it as your default sample.
          </p>
          <Textarea
            value={ttsText}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CHARS) setTtsText(e.target.value);
            }}
            placeholder="Type something to hear your voice say it..."
            rows={3}
            className="resize-none text-sm"
            disabled={generating}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {ttsText.length}/{MAX_CHARS}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={!ttsAudioUrl || generating}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                Save
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!ttsText.trim() || generating}
                className="gap-1.5"
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {generating ? "Synthesizing..." : needsRegenerate ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </div>

          {/* Generated audio player */}
          {generating && (
            <div className="flex items-center gap-2 py-3 border-t border-border/50">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Synthesizing your voice...</span>
            </div>
          )}
          {ttsAudioUrl && !generating && (
            <div className="pt-2 border-t border-border/50">
              <p className="mb-2 text-xs text-muted-foreground">Generated Audio</p>
              <AudioPlayer src={ttsAudioUrl} />
            </div>
          )}

          {/* Show saved audio if exists and no new generation */}
          {savedAudioUrl && !ttsAudioUrl && !generating && (
            <div className="pt-2 border-t border-border/50">
              <p className="mb-2 text-xs text-muted-foreground">Saved Audio</p>
              <AudioPlayer src={savedAudioUrl} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon: Upload more samples */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Upload className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upload Voice Samples</p>
              <p className="text-xs text-muted-foreground/70">Add more recordings to improve your voice clone</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
        </CardContent>
      </Card>

      {/* Coming Soon: Re-clone */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <RotateCcw className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Re-clone from Scratch</p>
              <p className="text-xs text-muted-foreground/70">Start fresh with new voice recordings</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
        </CardContent>
      </Card>
    </div>
  );
}
