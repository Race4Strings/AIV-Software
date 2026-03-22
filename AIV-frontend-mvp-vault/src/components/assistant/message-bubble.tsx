"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "USER" | "AGENT" | "SYSTEM";
  content: string;
  modeAtTime?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, modeAtTime, isStreaming }: MessageBubbleProps) {
  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
          {content}
        </span>
      </div>
    );
  }

  const isUser = role === "USER";

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[80%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5" />
          )}
        </div>
        {modeAtTime && !isUser && (
          <span className="text-[10px] text-muted-foreground/60 px-1">
            {modeAtTime.toLowerCase().replace("_", " ")}
          </span>
        )}
      </div>
    </div>
  );
}
