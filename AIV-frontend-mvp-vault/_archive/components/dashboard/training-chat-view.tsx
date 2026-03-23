"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trainingApi, TrainingMessage } from "@/lib/api/training";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Plus,
  Mic,
  ArrowUp,
  Square,
  MoreHorizontal,
} from "lucide-react";
import { ProfileSidebar } from "./profile-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { cloneApi } from "@/lib/api/clone";
import { cn } from "@/lib/utils";

interface TrainingChatViewProps {
  cloneId?: string;
  onBack?: () => void;
}

// Map dimension keys to display names
const dimensionLabels: Record<string, string> = {
  mind: "🧠 Mind",
  work: "💼 Work",
  heart: "❤️ Heart",
  ethics: "⚖️ Ethics",
  future: "🔮 Future",
  spirit: "✨ Spirit",
  experiences: "🌟 Experiences",
  physicality: "💪 Physicality",
  surroundings: "🏠 Surroundings",
  relationships: "👥 Relationships",
};

export function TrainingChatView({ cloneId }: TrainingChatViewProps) {
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [, setSessionId] = useState<string | null>(null);
  const [lastDimensionUpdated, setLastDimensionUpdated] = useState<
    string | null
  >(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Clone Details for Avatar
  const { data: clone } = useQuery({
    queryKey: ["clone", cloneId],
    queryFn: () => cloneApi.getClone(cloneId!),
    enabled: !!cloneId,
  });

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat history on mount
  useEffect(() => {
    const loadChat = async () => {
      if (!cloneId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await trainingApi.getChat(cloneId);
        setSessionId(response.session_id);
        setMessages(response.messages);
      } catch (error) {
        console.error("Failed to load chat:", error);
        toast.error("Failed to load training chat");
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [cloneId]);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !cloneId || isSending) return;

    const content = inputValue.trim();
    setInputValue("");
    setIsSending(true);
    setLastDimensionUpdated(null);

    // Optimistically add user message
    const tempUserMessage: TrainingMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await trainingApi.sendMessage(cloneId, content);

      // Replace temp message with real messages
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [...filtered, response.user_message, response.assistant_message];
      });

      // Show dimension update if any
      if (response.dimension_updated) {
        setLastDimensionUpdated(response.dimension_updated);
        const label =
          dimensionLabels[response.dimension_updated] ||
          response.dimension_updated;
        toast.success(`Person learned something!`, {
          description: `Updated: ${label}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      setInputValue(content); // Restore input
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!cloneId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No clone selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-white h-full">
      <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-full h-full">
        {/* LEFT COLUMN - MAIN CONTENT */}
        <main className="lg:col-span-9 lg:border-r lg:border-slate-100 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-12 pt-8 pb-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Start Training Your Person
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Have a conversation to help your person understand your
                      personality, values, and how you think. The more you chat, the
                      better it knows you.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 max-w-md justify-center">
                    {[
                      "Tell me about your hobbies",
                      "What motivates you?",
                      "Describe your ideal day",
                    ].map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setInputValue(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 border border-slate-200">
                          <AvatarImage
                            src={
                              clone?.avatar_profile_url ||
                              clone?.image_data?.frontal ||
                              ""
                            }
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {clone?.name?.slice(0, 2).toUpperCase() || "AI"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] ${
                          message.role === "user"
                            ? "rounded-2xl px-4 py-2 bg-muted"
                            : ""
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Dimension update indicator */}
                  {lastDimensionUpdated && (
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                        <Sparkles className="h-3 w-3" />
                        Person updated:{" "}
                        {dimensionLabels[lastDimensionUpdated] ||
                          lastDimensionUpdated}
                      </div>
                    </div>
                  )}

                  {/* Typing indicator */}
                  {isSending && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 border border-slate-200">
                        <AvatarImage
                          src={
                            clone?.avatar_profile_url ||
                            clone?.image_data?.frontal ||
                            ""
                          }
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {clone?.name?.slice(0, 2).toUpperCase() || "AI"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <div className="flex gap-1">
                          <span
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Floating Input Bar */}
            <div className="px-12 pt-0 pb-8 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors border-gray-200">
                  {/* Textarea */}
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message to train your person..."
                    disabled={isSending}
                    rows={1}
                    className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-base focus:outline-none focus:ring-0 placeholder:text-gray-400 min-h-[44px] disabled:cursor-not-allowed"
                    style={{ maxHeight: '200px' }}
                  />
                  
                  {/* Actions Bar */}
                  <div className={cn(
                    "flex items-center justify-between gap-2 px-3 pb-3",
                    isSending && "pointer-events-none opacity-50"
                  )}>
                    {/* Left actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full border-gray-200 hover:bg-gray-50"
                        disabled={isSending}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isSending}
                        size="icon"
                        className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isSending ? (
                          <Square className="h-4 w-4 fill-current" />
                        ) : (
                          <ArrowUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT COLUMN - SIDEBAR */}
        <ProfileSidebar cloneId={cloneId} isTrainingView={true} />
      </div>
    </div>
  );
}
