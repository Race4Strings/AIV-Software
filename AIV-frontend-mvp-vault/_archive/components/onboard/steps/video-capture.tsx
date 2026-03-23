"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useOnboard } from "../onboard-context";
import { toast } from "sonner";
import {
  Video,
  Square,
  Play,
  Pause,
  RotateCcw,
  Upload,
  AlertCircle,
} from "lucide-react";

interface StepProps {
  stepLabel: string;
}

export function VideoCaptureStep({ stepLabel }: StepProps) {
  const {
    setVideoBlob,
    setVideoDuration,
    videoBlob,
    videoDuration,
    rights,
    setRights,
    submitOnboard,
    isLoading,
  } = useOnboard();

  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use ref to track recording time for accurate capture in onstop callback
  const recordingTimeRef = useRef(0);

  // Start camera preview on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        (error as { name: string }).name === "NotAllowedError"
          ? "Camera access denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please check your device."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      toast.error("Camera not available");
      return;
    }

    chunksRef.current = [];
    recordingTimeRef.current = 0;

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Get actual duration from recordingTimeRef
      const finalDuration = recordingTimeRef.current;
      console.log("Recording stopped, duration:", finalDuration, "seconds");

      setVideoBlob(blob);
      setVideoDuration(finalDuration);
      setPreviewUrl(url);
      setIsPreviewing(true);

      // Stop the camera since we're done recording
      stopCamera();
    };

    mediaRecorder.start(1000); // Collect data every second
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setRecordingTime(0);
    recordingTimeRef.current = 0;

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        recordingTimeRef.current = newTime;
        return newTime;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    // Clean up old preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setVideoBlob(null);
    setVideoDuration(0);
    setIsPreviewing(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    startCamera();
  };

  const togglePlayback = () => {
    if (!previewVideoRef.current) return;
    if (isPlaying) {
      previewVideoRef.current.pause();
    } else {
      previewVideoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }

    // Clean up old preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoBlob(file);
    setPreviewUrl(url);
    setIsPreviewing(true);

    // Get video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(Math.floor(video.duration));
    };
    video.src = url;

    stopCamera();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!videoBlob) {
      toast.error("Please record or upload a video");
      return;
    }

    if (videoDuration < 10) {
      toast.error("Video must be at least 10 seconds long");
      return;
    }

    await submitOnboard();
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">
          {stepLabel}: Record Your Introduction
        </h2>
        <p className="text-muted-foreground">
          Record a 30-60 second video introducing yourself naturally.
        </p>
      </div>

      {/* Video Area */}
      <div className="w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden relative">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-destructive/20 p-8">
            <AlertCircle className="w-12 h-12 mb-4 text-destructive" />
            <p className="text-center">{cameraError}</p>
            <Button variant="outline" className="mt-4" onClick={startCamera}>
              Retry Camera Access
            </Button>
          </div>
        ) : isPreviewing && previewUrl ? (
          <video
            ref={previewVideoRef}
            src={previewUrl}
            className="w-full h-full object-cover"
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controls={false}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="font-mono">{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isPreviewing ? (
          <>
            <Button variant="outline" size="lg" onClick={togglePlayback}>
              {isPlaying ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button variant="destructive" size="lg" onClick={resetRecording}>
              <RotateCcw className="w-5 h-5 mr-2" />
              Re-record
            </Button>
          </>
        ) : (
          <>
            <Button
              size="lg"
              className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!!cameraError}
            >
              {isRecording ? (
                <>
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <span className="text-muted-foreground">or</span>

            <Button
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Video
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </>
        )}
      </div>

      {/* Duration display */}
      {videoDuration > 0 && (
        <p className="text-sm text-muted-foreground">
          Video duration: {formatTime(videoDuration)}
          {videoDuration < 30 && (
            <span className="text-yellow-500 ml-2">
              (Recommended: 30-60 seconds)
            </span>
          )}
        </p>
      )}

      {/* Rights Settings */}
      <div className="w-full max-w-md space-y-4 p-4 border rounded-lg bg-card">
        <h3 className="font-semibold">Privacy Settings</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="public" className="flex flex-col gap-1">
            <span>Make person public</span>
            <span className="text-xs text-muted-foreground font-normal">
              Allow others to interact with your person
            </span>
          </Label>
          <Switch
            id="public"
            checked={rights.is_public}
            onCheckedChange={(checked) =>
              setRights({ ...rights, is_public: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="ai-learning" className="flex flex-col gap-1">
            <span>Allow AI learning</span>
            <span className="text-xs text-muted-foreground font-normal">
              Help improve our AI models
            </span>
          </Label>
          <Switch
            id="ai-learning"
            checked={rights.allow_ai_learning}
            onCheckedChange={(checked) =>
              setRights({ ...rights, allow_ai_learning: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="audio-clone" className="flex flex-col gap-1">
            <span>Enable voice cloning</span>
            <span className="text-xs text-muted-foreground font-normal">
              Create a voice clone from your video
            </span>
          </Label>
          <Switch
            id="audio-clone"
            checked={rights.allow_audio_clone}
            onCheckedChange={(checked) =>
              setRights({ ...rights, allow_audio_clone: checked })
            }
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        className="text-lg px-8"
        onClick={handleSubmit}
        disabled={isLoading || !videoBlob}
      >
        {isLoading ? "Submitting..." : "Submit & Create Person"}
      </Button>
    </div>
  );
}
