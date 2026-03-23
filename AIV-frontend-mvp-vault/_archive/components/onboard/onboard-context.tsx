"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cloneApi, OnboardStatus } from "@/lib/api/clone";
import { toast } from "sonner";

type Step = "intro" | "video" | "processing" | "complete";

interface OnboardContextType {
  step: Step;
  setStep: (step: Step) => void;
  cloneId: string | null;
  isLoading: boolean;
  // Video data
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  videoDuration: number;
  setVideoDuration: (duration: number) => void;
  // Rights settings
  rights: {
    is_public: boolean;
    allow_ai_learning: boolean;
    allow_audio_clone: boolean;
  };
  setRights: (rights: {
    is_public: boolean;
    allow_ai_learning: boolean;
    allow_audio_clone: boolean;
  }) => void;
  // Actions
  createClone: () => Promise<void>;
  submitOnboard: () => Promise<void>;
  // Processing status
  onboardStatus: OnboardStatus | null;
  isPolling: boolean;
}

const OnboardContext = createContext<OnboardContextType | null>(null);

export function OnboardProvider({
  children,
  previewMode = false,
}: {
  children: React.ReactNode;
  previewMode?: boolean;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [cloneId, setCloneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [rights, setRights] = useState({
    is_public: false,
    allow_ai_learning: true,
    allow_audio_clone: true,
  });
  const [onboardStatus, setOnboardStatus] = useState<OnboardStatus | null>(
    null
  );
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // REAL LOGIC (only runs when previewMode = false)
  // ============================================

  // Check for existing clone on mount (REAL MODE ONLY)
  useEffect(() => {
    if (previewMode) return;

    const checkExistingClone = async () => {
      try {
        const status = await cloneApi.getStatus();
        if (status.has_clone && status.clone_id) {
          setCloneId(status.clone_id);

          // Check if already completed
          if (status.status === "completed") {
            window.location.href = "/";
            return;
          }

          // Check onboard status
          if (status.onboard_status === "processing") {
            setStep("processing");
            startPolling(status.clone_id);
          } else if (status.onboard_status === "complete") {
            window.location.href = "/";
          } else {
            // Clone exists but not onboarded yet
            setStep("video");
          }
        }
      } catch {
        console.log("No existing clone found");
      }
    };
    checkExistingClone();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode]);

  // Real polling function (REAL MODE ONLY)
  const startPolling = useCallback(
    (id: string) => {
      if (previewMode) return;

      setIsPolling(true);

      const poll = async () => {
        try {
          const status = await cloneApi.getOnboardStatus(id);
          setOnboardStatus(status);

          if (status.overall_status === "complete") {
            setIsPolling(false);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
            }
            setStep("complete");
            toast.success("Person created successfully!");
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              window.location.href = "/";
            }, 2000);
          } else if (status.overall_status === "failed") {
            setIsPolling(false);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
            }
            toast.error(status.error || "Person creation failed");
          }
        } catch (error) {
          console.error("Error polling status:", error);
        }
      };

      // Poll immediately and then every 2 seconds
      poll();
      pollingRef.current = setInterval(poll, 2000);
    },
    [previewMode]
  );

  // ============================================
  // MOCK LOGIC (only runs when previewMode = true)
  // ============================================

  // Mock processing steps for preview (20 seconds total)
  const startMockPolling = useCallback(() => {
    if (!previewMode) return;

    setIsPolling(true);

    const mockSteps = [
      {
        delay: 0,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: false,
          audio_extracted: false,
          transcription_complete: false,
          dimensions_extracted: false,
          voice_cloned: false,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 2500,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: false,
          transcription_complete: false,
          dimensions_extracted: false,
          voice_cloned: false,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 5000,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: false,
          dimensions_extracted: false,
          voice_cloned: false,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 7500,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: false,
          voice_cloned: false,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 10000,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: true,
          voice_cloned: false,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 12500,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: true,
          voice_cloned: true,
          avatar_generated: false,
          personality_synthesized: false,
        },
      },
      {
        delay: 15000,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: true,
          voice_cloned: true,
          avatar_generated: true,
          personality_synthesized: false,
        },
      },
      {
        delay: 17500,
        status: {
          overall_status: "processing",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: true,
          voice_cloned: true,
          avatar_generated: true,
          personality_synthesized: true,
        },
      },
      {
        delay: 20000,
        status: {
          overall_status: "complete",
          video_saved: true,
          frames_extracted: true,
          audio_extracted: true,
          transcription_complete: true,
          dimensions_extracted: true,
          voice_cloned: true,
          avatar_generated: true,
          personality_synthesized: true,
        },
      },
    ];

    const timeouts: NodeJS.Timeout[] = [];

    mockSteps.forEach(({ delay, status }) => {
      const timeout = setTimeout(() => {
        setOnboardStatus(status as OnboardStatus);

        if (status.overall_status === "complete") {
          setIsPolling(false);
          setStep("complete");
          toast.success("[Preview] Person created successfully!");
          // In preview mode, don't redirect - just stay on complete screen
        }
      }, delay);
      timeouts.push(timeout);
    });

    // Cleanup on unmount
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [previewMode]);

  // ============================================
  // ACTIONS (branch between real and mock)
  // ============================================

  const createClone = useCallback(async () => {
    // PREVIEW MODE: Mock the action
    if (previewMode) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX
      setCloneId("preview-mock-clone-id");
      setStep("video");
      toast.success("[Preview] Person initialized!");
      setIsLoading(false);
      return;
    }

    // REAL MODE: Call actual API
    setIsLoading(true);
    try {
      // Get user name from localStorage
      let userName = "My";
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const parsed = JSON.parse(userStr);
          // Handle nested data structure from signin response
          const user = parsed.data || parsed;
          // Check both user_name (backend format) and username, plus name
          userName =
            user.name ||
            user.user_name ||
            user.username ||
            user.email?.split("@")[0] ||
            "My";
        }
      } catch (e) {
        console.warn("Could not parse user from localStorage:", e);
      }

      const clone = await cloneApi.create({
        name: userName,
        description: "",
      });
      setCloneId(clone.id);
      setStep("video");
      toast.success("Person initialized!");
    } catch (error) {
      // If clone already exists, use existing one
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        try {
          const status = await cloneApi.getStatus();
          if (status.clone_id) {
            setCloneId(status.clone_id);
            setStep("video");
            return;
          }
        } catch {
          // Ignore
        }
      }
      toast.error("Failed to initialize person");
    } finally {
      setIsLoading(false);
    }
  }, [previewMode]);

  const submitOnboard = useCallback(async () => {
    // PREVIEW MODE: Mock the submission
    if (previewMode) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX
      toast.success("[Preview] Video submitted! Processing...");
      setStep("processing");
      setIsLoading(false);
      startMockPolling();
      return;
    }

    // REAL MODE: Call actual API
    if (!cloneId || !videoBlob) {
      toast.error("Please record a video first");
      return;
    }

    setIsLoading(true);
    try {
      // Create FormData with video and rights
      const formData = new FormData();
      formData.append("video", videoBlob, "intro-video.webm");
      formData.append("is_public", String(rights.is_public));
      formData.append("allow_ai_learning", String(rights.allow_ai_learning));
      formData.append("allow_audio_clone", String(rights.allow_audio_clone));

      await cloneApi.submitOnboard(cloneId, formData);
      toast.success("Video submitted! Processing your person...");

      setStep("processing");
      startPolling(cloneId);
    } catch (error) {
      console.error("Error submitting onboard:", error);
      toast.error((error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to submit video");
    } finally {
      setIsLoading(false);
    }
  }, [previewMode, cloneId, videoBlob, rights, startPolling, startMockPolling]);

  return (
    <OnboardContext.Provider
      value={{
        step,
        setStep,
        cloneId,
        isLoading,
        videoBlob,
        setVideoBlob,
        videoDuration,
        setVideoDuration,
        rights,
        setRights,
        createClone,
        submitOnboard,
        onboardStatus,
        isPolling,
      }}
    >
      {children}
    </OnboardContext.Provider>
  );
}

export function useOnboard() {
  const context = useContext(OnboardContext);
  if (!context) {
    throw new Error("useOnboard must be used within OnboardProvider");
  }
  return context;
}
