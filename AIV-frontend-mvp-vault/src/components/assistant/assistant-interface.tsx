"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Plus, Upload, Sparkles, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeSwitcher } from "./mode-switcher";
import { humanizeEnum } from "@/lib/humanize";
import { MessageBubble } from "./message-bubble";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  assistantApi,
  streamMessage,
  type AgentSession,
  type AgentMessage,
} from "@/lib/api/assistant";
import { uploadApi } from "@/lib/api/upload";
import { integrationsApi } from "@/lib/api/integrations";
import { apiClient } from "@/lib/api/client";

const MODE_PROMPTS: Record<string, string[]> = {
  ASSISTANT: [
    "What's my deal pipeline status?",
    "How does the commission structure work?",
    "Show me my recent revenue",
  ],
  DIGITAL_SELF: [
    "How would you introduce yourself?",
    "What's your take on AI in music?",
    "Tell me about your creative process",
  ],
  TRAINING: [
    "Find my latest podcast interview",
    "Here's a recent article about me...",
    "Update my position on social media strategy",
  ],
  REFINEMENT: [
    "I'd say that differently — more casual",
    "My tone should be warmer here",
    "Correct: I prefer 'collaborate' not 'partner'",
  ],
};

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
  const [healthData, setHealthData] = useState<{cfs?: number; coverage?: number; confidence?: number; status?: string} | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Load twin health for coverage indicator
  useEffect(() => {
    if (!twinId) return;
    apiClient.get(`/twins/${twinId}/health`).then(res => {
      setHealthData(res.data);
    }).catch(() => {});
  }, [twinId]);

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
    // Show session summary if there were messages in the current session
    if (messages.length > 0) {
      const userMsgs = messages.filter((m) => m.role === "USER").length;
      const agentMsgs = messages.filter((m) => m.role === "AGENT").length;
      toast.success(`Session complete: ${userMsgs} message${userMsgs !== 1 ? "s" : ""} sent, ${agentMsgs} response${agentMsgs !== 1 ? "s" : ""} received.`);
    }
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
          content: `Mode switched to ${humanizeEnum(mode)}`,
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
      textareaRef.current?.focus();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    try {
      const result = await uploadApi.uploadFile(file, "uploads");
      const content = `[Uploaded file: ${file.name}]\nURL: ${result.url}`;
      setInput(content);
      toast.success(`Uploaded ${file.name}`);
    } catch {
      toast.error("Upload failed");
    }
    e.target.value = "";
  }

  async function handleIngest() {
    if (!ingestUrl.trim() || ingesting || !twinId) return;
    setIngesting(true);
    try {
      await integrationsApi.ingest(twinId, { url: ingestUrl.trim() });
      toast.success("Content submitted for processing");
      setIngestUrl("");
      setIngestOpen(false);
    } catch {
      toast.error("Failed to ingest content");
    }
    setIngesting(false);
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

  // Derive session title from first user message or mode
  function getSessionTitle(s: AgentSession, _idx: number): string {
    // If this is the active session and we have messages, use first user message
    if (s.id === session?.id && messages.length > 0) {
      const firstUser = messages.find(m => m.role === "USER");
      if (firstUser) return firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "..." : "");
    }
    const mode = humanizeEnum(s.current_mode || "ASSISTANT");
    return `${mode} session`;
  }

  return (
    <div className="flex h-full">
      {/* Session sidebar */}
      {!isMobile && sidebarOpen && sessions.length > 0 && (
        <div className="w-60 shrink-0 border-r flex flex-col bg-muted/20">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessions</span>
            <Button variant="ghost" size="sm" onClick={createNewSession} disabled={isStreaming} className="h-7 px-2 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(() => {
              const grouped: Record<string, typeof sessions> = {};
              sessions.slice(0, 15).forEach((s, idx) => {
                const d = new Date(s.started_at);
                const today = new Date();
                const isToday = d.toDateString() === today.toDateString();
                const isYesterday = d.toDateString() === new Date(today.getTime() - 86400000).toDateString();
                const weekAgo = new Date(today.getTime() - 7 * 86400000);
                const label = isToday ? "Today" : isYesterday ? "Yesterday" : d > weekAgo ? "This Week" : "Earlier";
                if (!grouped[label]) grouped[label] = [];
                grouped[label].push(s);
              });
              return Object.entries(grouped).map(([label, groupSessions]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider px-3 pt-2 pb-1">{label}</p>
                  {groupSessions.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        s.id === session?.id
                          ? "bg-primary/10 text-foreground border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <div className="text-xs font-medium truncate">{getSessionTitle(s, idx)}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{humanizeEnum(s.current_mode || "ASSISTANT")}</Badge>
                        <span className="text-xs text-muted-foreground/60">
                          {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mode accent indicator */}
        <div className={`h-0.5 transition-colors ${
          session?.current_mode === "DIGITAL_SELF" ? "bg-accent" :
          session?.current_mode === "TRAINING" ? "bg-primary" :
          session?.current_mode === "REFINEMENT" ? "bg-warning" :
          "bg-primary"
        }`} />
        {/* Header: Mode switcher + session toggle */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
              aria-label={sidebarOpen ? "Hide sessions" : "Show sessions"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            </button>
            <ModeSwitcher
              currentMode={(session?.current_mode as Mode) || "ASSISTANT"}
              onModeChange={handleModeChange}
              disabled={isStreaming}
            />
          </div>
          {!sidebarOpen && (
            <Button variant="ghost" size="sm" onClick={createNewSession} disabled={isStreaming} aria-label="New session">
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>

      {/* Session Progress Indicator */}
      {messages.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
          <span>{messages.filter((m) => m.role === "USER").length} message{messages.filter((m) => m.role === "USER").length !== 1 ? "s" : ""}</span>
          <span className="h-3 w-px bg-border" />
          <span>{messages.filter((m) => m.role === "AGENT").length} response{messages.filter((m) => m.role === "AGENT").length !== 1 ? "s" : ""}</span>
          {messages.some((m) => m.content?.includes("[Uploaded file:")) && (
            <>
              <span className="h-3 w-px bg-border" />
              <span>{messages.filter((m) => m.content?.includes("[Uploaded file:")).length} file{messages.filter((m) => m.content?.includes("[Uploaded file:")).length !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" aria-label="Conversation messages">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-8 w-8 text-primary/40 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">
              Your assistant (by AIV)
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60 max-w-md">
              {session?.current_mode === "DIGITAL_SELF"
                ? "Talk to your digital twin. Test how it responds and deepen its accuracy."
                : session?.current_mode === "TRAINING"
                ? "Add information — paste content, share links, or upload files to train your twin."
                : session?.current_mode === "REFINEMENT"
                ? "Correct your twin's responses. Side-by-side comparison and fine-tuning."
                : "Ask about deals, revenue, platform features, or get guidance."}
            </p>
            <p className="mt-4 text-xs text-muted-foreground/40 max-w-sm">
              Start with a message below. The more you interact, the stronger your identity profile becomes.
            </p>

            {/* Building status — activity encouragement (replaces ALCM metrics) */}
            {healthData && healthData.status === "BUILDING" && (
              <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-left max-w-sm w-full">
                <p className="text-xs font-medium text-muted-foreground mb-1">Identity Status: Building</p>
                <p className="text-xs text-muted-foreground">
                  Each conversation strengthens your identity profile. Upload media, share content, and refine responses to increase your deal value.
                </p>
              </div>
            )}

            {/* Guided prompts */}
            <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg">
              {(MODE_PROMPTS[session?.current_mode || "ASSISTANT"] || []).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
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
        <div aria-live="polite" className="sr-only">
          {messages.length > 0 && messages[messages.length - 1].role === "AGENT"
            ? messages[messages.length - 1].content
            : streamingContent || ""}
        </div>
      </ScrollArea>

      {/* Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt" />
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            aria-label="Upload file"
            className="shrink-0"
          >
            <Upload className="h-4 w-4" />
          </Button>
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
          <Popover open={ingestOpen} onOpenChange={setIngestOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Add content to train your twin">
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <p className="text-sm font-medium mb-2">Train your twin</p>
              <p className="text-xs text-muted-foreground mb-3">Paste a URL (YouTube, article, podcast) to add to your twin&apos;s knowledge.</p>
              <div className="flex gap-2">
                <Input
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleIngest(); }}
                />
                <Button size="sm" onClick={handleIngest} disabled={!ingestUrl.trim() || ingesting}>
                  {ingesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
      </div>{/* close main chat area */}
    </div>
  );
}
