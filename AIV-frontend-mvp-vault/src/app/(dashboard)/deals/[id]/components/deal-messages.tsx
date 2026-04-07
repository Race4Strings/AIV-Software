"use client";

import { useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DealMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface DealMessagesProps {
  messages: DealMessage[];
  currentUserId: string;
  msgInput: string;
  sending: boolean;
  onMsgInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export function DealMessages({
  messages,
  currentUserId,
  msgInput,
  sending,
  onMsgInputChange,
  onSendMessage,
}: DealMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <Card className="flex flex-col" style={{ height: "400px" }}>
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isSystem = msg.sender_id === "system";
          const isCurrentUser = !isSystem && currentUserId === msg.sender_id;
          const senderLabel = isSystem ? "System" : isCurrentUser ? "You" : `Participant ${msg.sender_id.slice(0, 6)}`;
          return (
            <div key={msg.id} className="mb-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium">{senderLabel}</span>
                {!isSystem && !isCurrentUser && <Badge variant="outline" className="text-xs py-0">Client</Badge>}
                <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className={`text-sm rounded-lg px-3 py-2 ${isCurrentUser ? "bg-primary/10 ml-8" : "bg-muted/30 mr-8"}`}>{msg.content}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="border-t p-3 flex gap-2">
        <Textarea
          value={msgInput}
          onChange={(e) => onMsgInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[80px] resize-none"
          rows={1}
        />
        <Button size="icon" onClick={onSendMessage} disabled={!msgInput.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
