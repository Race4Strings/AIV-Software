"use client";

import { useState, useRef, useCallback } from "react";
import {
  FileUp, ArrowRight, ArrowLeft, Loader2, CheckCircle2, X, Eye, Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { onboardingApi } from "@/lib/api/onboarding";
import { uploadApi } from "@/lib/api/upload";
import type { AssetsStepProps } from "../types";

export function AssetsStep({
  sessionId,
  files,
  setFiles,
  setStep,
}: AssetsStepProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeFile = useCallback((index: number) => {
    setFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  }, [setFiles]);

  async function handleUpload() {
    if (files.length === 0) {
      await onboardingApi.recordUpload(sessionId).catch(() => {});
      setStep(3);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        await uploadApi.uploadFile(file, "onboarding");
      }
      await onboardingApi.recordUpload(sessionId).catch(() => {});
      toast.success(`${files.length} file(s) uploaded`);
      setStep(3);
    } catch {
      toast.error("Upload failed. Check file size (max 50MB) and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-2xl font-bold">Your identity media</h2>
        <p className="mt-2 text-muted-foreground">
          These files form your identity profile — the media clients use to produce accurate representations of you. Higher quality means higher deal value.
        </p>
      </div>

      {/* Required asset types */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Professional Headshots", desc: "High-res photos for visual identity", icon: Eye },
          { label: "Audio Samples", desc: "Interviews, podcasts for voice profile", icon: Mic },
          { label: "Video Footage", desc: "Appearances for behavioral modeling", icon: FileUp },
        ].map((asset) => {
          const AssetIcon = asset.icon;
          return (
            <div key={asset.label} className="rounded-lg border border-border/50 p-3 text-center">
              <AssetIcon className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
              <div className="text-xs font-medium">{asset.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{asset.desc}</div>
            </div>
          );
        })}
      </div>

      <Card
        className={`border-dashed border-2 transition-colors ${dragActive ? "border-primary bg-primary/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const dropped = Array.from(e.dataTransfer.files);
          const valid = dropped.filter(f => {
            if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50MB limit`); return false; }
            return true;
          });
          if (valid.length > 0) setFiles((prev: File[]) => {
            const combined = [...prev, ...valid];
            if (combined.length > 20) { toast.error("Maximum 20 files allowed"); return prev; }
            return combined;
          });
        }}
      >
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <FileUp className={`h-10 w-10 transition-colors ${dragActive ? "text-primary" : "text-muted-foreground/40"}`} />
          {files.length > 0 ? (
            <div className="space-y-1.5 text-sm w-full max-w-sm">
              {files.map((f, i) => (
                <div key={f.name + i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                  {f.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(f)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dragActive ? "Drop files here..." : "Drag and drop files here, or click to browse"}
            </p>
          )}
          <input ref={fileInputRef} type="file" multiple accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => {
            const newFiles = Array.from(e.target.files || []).filter(f => {
              if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50MB limit`); return false; }
              return true;
            });
            setFiles((prev: File[]) => {
              const combined = [...prev, ...newFiles];
              if (combined.length > 20) { toast.error("Maximum 20 files allowed"); return prev; }
              return combined;
            });
            e.target.value = "";
          }} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {files.length > 0 ? "Add More" : "Choose Files"}
          </Button>
          <p className="text-xs text-muted-foreground">Audio, Video, Images, PDF, Documents &mdash; up to 50MB each</p>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(1)} disabled={uploading}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={handleUpload} disabled={uploading} className="flex-1">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {files.length > 0 ? `Upload ${files.length} file(s) & continue` : "Skip for now"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
