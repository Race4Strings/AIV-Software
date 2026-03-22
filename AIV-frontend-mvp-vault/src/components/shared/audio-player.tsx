"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onError = () => { setError(true); setPlaying(false); };
    const onLoadedMetadata = () => { setDuration(audio.duration); setError(false); };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  // Reset error state when src changes
  useEffect(() => {
    setError(false);
    setProgress(0);
    setPlaying(false);
  }, [src]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
    } catch {
      setError(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <AlertCircle className="size-4 text-destructive" />
        <span>Unable to load audio. The voice sample URL may have expired.</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
      <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={toggle}>
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </Button>
      <div
        className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden cursor-pointer"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      {duration > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatTime((audioRef.current?.currentTime || 0))} / {formatTime(duration)}
        </span>
      )}
    </div>
  );
}
