"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Loader2 } from "lucide-react";
import { updateTwin } from "@/lib/api/twins";
import { toast } from "sonner";
import type { Twin } from "@/lib/api/twins";

interface Props {
  twin: Twin;
  onUpdate?: () => Promise<void>;
}

export function TwinTabVisual({ twin, onUpdate }: Props) {
  const visual = (twin.alcm_data?.visual as Record<string, string>) || {};
  const images = Object.entries(visual).filter(([, url]) => url && typeof url === "string");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newVisual = { ...visual };

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/backend/upload?folder=images", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        const label = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        newVisual[label] = data.url;
      }

      await updateTwin(twin.id, {
        alcm_data: { visual: newVisual },
      });

      toast.success(files.length === 1 ? "Image uploaded" : `${files.length} images uploaded`);
      onUpdate?.();
    } catch {
      toast.error("Failed to upload visual assets");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (images.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ImageIcon className="size-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Build your visual identity</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Upload your profile photos, brand colors, mood boards, and style guides to build your visual identity.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button className="mt-6" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
            Upload Visual Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Upload
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map(([label, url]) => (
          <div key={label} className="overflow-hidden rounded-lg border bg-muted/50">
            <img src={url} alt={label} className="aspect-square w-full object-cover" />
            <p className="p-2 text-center text-xs capitalize text-muted-foreground">
              {label.replace(/_/g, " ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
