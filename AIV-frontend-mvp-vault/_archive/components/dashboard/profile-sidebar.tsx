"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Volume2,
  Pause,
  Pencil,
  X,
  Loader2,
  ImagePlus,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EntityIndicator } from "@/components/ui/entity-indicator";
import { cloneApi } from "@/lib/api/clone";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ProfileSidebarProps {
  cloneId?: string | null;
  user?: { name: string };
  isTrainingView?: boolean;
  className?: string;
}

export function ProfileSidebar({
  cloneId,
  user,
  isTrainingView = false,
  className,
}: ProfileSidebarProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isAvailable] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Avatar Upload State
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = React.useState(false);
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = React.useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch Clone Details if not provided or to ensure fresh data
  const {
    data: clone,
    refetch: refetchClone,
  } = useQuery({
    queryKey: ["clone", cloneId],
    queryFn: () => cloneApi.getClone(cloneId!),
    enabled: !!cloneId,
  });

  // --- HANDLERS ---

  // Audio
  const toggleAudio = () => {
    if (!clone?.intro_audio_url) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(clone.intro_audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Avatar Upload Handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const totalPhotos = photos.length + files.length;
    if (totalPhotos > 3) {
      toast.error("Maximum 3 photos allowed");
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    const newPreviewUrls = files.map((file) => URL.createObjectURL(file));
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (photos.length === 0 || !cloneId) return;
    setIsUploadingPhotos(true);
    try {
      await cloneApi.enhancePhotos(cloneId, photos);
      toast.success("Photos uploaded!", {
        description: "Avatar will be regenerated shortly.",
      });
      setPhotos([]);
      setPhotoPreviewUrls([]);
      setIsAvatarDialogOpen(false);
      refetchClone();
    } catch {
      toast.error("Failed to upload photos");
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  // Data Ready
  const cloneData = clone;
  const personality = (cloneData?.personality as { traits?: string[] }) || {};
  const traits = personality?.traits;
  
  let displayName = user?.name || clone?.name || "My Person";
  if (displayName.includes("undefined")) displayName = "My Person";
  displayName = displayName.replace(/'s Clone$/i, "").trim();

  return (
    <aside className={cn("lg:col-span-3 space-y-8 lg:px-8 px-6 py-12", className)}>
      <div className="sticky top-12 space-y-4">
        {/* Profile Header */}
        <div className="space-y-6">
          <Dialog
            open={isAvatarDialogOpen}
            onOpenChange={setIsAvatarDialogOpen}
          >
            <DialogTrigger asChild>
              <div className="relative inline-block group cursor-pointer">
                {/* Avatar Container */}
                <div
                  className={cn(
                    "relative rounded-full",
                    !isAvailable &&
                      "after:absolute after:inset-0 after:rounded-full after:bg-slate-500/20 after:pointer-events-none"
                  )}
                >
                  <Avatar className="h-32 w-32 rounded-full border-4 border-white shadow-xl shadow-slate-100 group-hover:ring-4 group-hover:ring-slate-50 transition-all">
                    <AvatarImage
                      src={
                        cloneData?.avatar_profile_url ||
                        cloneData?.image_data?.frontal ||
                        ""
                      }
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-slate-900 text-white text-3xl">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Edit Overlay on Hover */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="w-8 h-8 text-white" />
                </div>

                {/* Entity Indicator */}
                <div className="absolute bottom-1 right-1 z-10">
                  <EntityIndicator
                    type="ai"
                    isAvailable={isAvailable}
                    size="lg"
                  />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enhance Avatar</DialogTitle>
                <DialogDescription>
                  Upload up to 3 photos to generate a better digital
                  likeness.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900">
                      Click to upload photos
                    </p>
                    <p className="text-xs text-slate-500">
                      JPEG, PNG, WebP (Max 3)
                    </p>
                  </div>
                </div>

                {photoPreviewUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photoPreviewUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(i);
                          }}
                          className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAvatarDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={uploadPhotos}
                    disabled={isUploadingPhotos || photos.length === 0}
                  >
                    {isUploadingPhotos && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Update Avatar
                  </Button>
                </div>

                <input
                  type="file"
                  ref={photoInputRef}
                  className="hidden"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                />
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              {displayName}
            </h2>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            {/* Train Button */}
            {isTrainingView ? (
              <Button
                className="rounded-lg h-8 bg-black hover:bg-slate-800 text-white px-4 gap-2 font-medium text-xs"
                asChild
              >
                <Link href="/?view=my-clone">
                  <CheckCircle2 className="size-3.5" />
                  Finish training
                </Link>
              </Button>
            ) : (
              <Button
                className="rounded-lg h-8 bg-blue-600 hover:bg-blue-700 text-white px-4 gap-2 font-medium text-xs"
                asChild
              >
                <Link href="/?view=training">
                  <GraduationCap className="size-3.5" />
                  Train
                </Link>
              </Button>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-8 w-8 border-slate-200"
                    onClick={toggleAudio}
                  >
                    {isPlaying ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hear voice sample</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator className="bg-slate-100" />

        {/* Metadata */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            About
          </h4>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Knowledge Sources</span>
              <span className="font-medium text-slate-900">
                {cloneData?.knowledge_files?.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Traits Analyzed</span>
              <span className="font-medium text-slate-900">
                {traits?.length || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 text-xs text-slate-400">
          <p>Last updated just now</p>
        </div>
      </div>
    </aside>
  );
}

