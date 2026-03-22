"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeSwitcher } from "./mode-switcher";
import { MessageBubble } from "./message-bubble";
import {
  assistantApi,
  streamMessage,
  type AgentSession,
  type AgentMessage,
} from "@/lib/api/assistant";

type Mode = "ASSISTANT" | "DIGITAL_SELF" | "TRAINING" | "REFINEMENT";

interface DisplayMessage {
  id: string;
  role: "USER" | "AGENT" | "SYSTEM";
  content: string;
  mode_at_time: string;
}

interface AssistantInterfaceProps {
  twinId?: string;
}

export function AssistantInterface({ twinId }: AssistantInterfaceProps) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, streamingContent, scrollToBottom]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const list = await assistantApi.listSessions();
      setSessions(list);
      if (list.length > 0) {
        await selectSession(list[0]);
      } else {
        await createNewSession();
      }
    } catch {
      await createNewSession();
    } finally {
      setIsLoading(false);
    }
  }

  async function createNewSession() {
    try {
      const newSession = await assistantApi.createSession(twinId);
      setSession(newSession);
      setMessages([]);
      setSessions((prev) => [newSession, ...prev]);
    } catch (err) {
      toast.error("Failed to create session");
    }
  }

  async function selectSession(s: AgentSession) {
    setSession(s);
    try {
      const history = await assistantApi.getMessages(s.id);
      setMessages(
        history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          mode_at_time: m.mode_at_time,
        }))
      );
    } catch {
      setMessages([]);
    }
  }

  async function handleModeChange(mode: Mode) {
    if (!session || isStreaming) return;
    try {
      const updated = await assistantApi.switchMode(session.id, mode);
      setSession(updated);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "SYSTEM",
          content: `Mode switched to ${mode.toLowerCase().replace("_", " ")}`,
          mode_at_time: mode,
        },
      ]);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Cannot switch mode");
    }
  }

  async function handleSend() {
    if (!input.trim() || !session || isStreaming) return;
    const content = input.trim();
    setInput("");

    // Add user message immediately
    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "USER",
      content,
      mode_at_time: session.current_mode,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Stream response
    setIsStreaming(true);
    setStreamingContent("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let fullResponse = "";
      for await (const chunk of streamMessage(session.id, content, controller.signal)) {
        fullResponse += chunk;
        setStreamingContent(fullResponse);
      }

      // Add completed agent message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "AGENT",
          content: fullResponse,
          mode_at_time: session.current_mode,
        },
      ]);
      setStreamingContent("");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Message failed");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: Mode switcher + session controls */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <ModeSwitcher
          currentMode={(session?.current_mode as Mode) || "ASSISTANT"}
          onModeChange={handleModeChange}
          disabled={isStreaming}
        />
        <Button variant="ghost" size="sm" onClick={createNewSession} disabled={isStreaming} aria-label="New session">
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Session sidebar (collapsed to pill row for now) */}
      {sessions.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
          {sessions.slice(0, 10).map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                s.id === session?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {new Date(s.started_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" aria-live="polite" aria-label="Conversation messages">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Your assistant (by AIV)
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Ask anything about your digital twin, deals, or the platform.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            modeAtTime={msg.mode_at_time}
          />
        ))}

        {isStreaming && streamingContent && (
          <MessageBubble
            role="AGENT"
            content={streamingContent}
            modeAtTime={session?.current_mode}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message input"
            placeholder={
              session?.current_mode === "DIGITAL_SELF"
                ? "Talk to your digital self..."
                : session?.current_mode === "TRAINING"
                ? "Paste content, share a link, or describe what to add..."
                : session?.current_mode === "REFINEMENT"
                ? "Describe what needs correction..."
                : "Ask your assistant anything..."
            }
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            aria-label={isStreaming ? "Sending..." : "Send message"}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
