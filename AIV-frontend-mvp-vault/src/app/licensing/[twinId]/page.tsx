"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, Send, Check, X, Loader2, Globe, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { humanizeEnum } from "@/lib/humanize";

interface LicensingInfo {
  twin_id: string;
  display_name: string;
  category: string[];
  available: boolean;
  available_modules: string[];
  pricing_floor: number | null;
  currency: string;
  territories_restricted: string[];
  permitted_use_cases: string[];
  blacklisted_use_cases: string[];
  exclusivity_available: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ALL_MODULES = ["identity_profile", "knowledge_base", "voice_identity", "visual_identity"];

const STARTER_QUESTIONS = [
  "What modules are available?",
  "What's the minimum deal value?",
  "Can I get exclusivity?",
  "What territories are restricted?",
];

export default function LicensingAssistantPage() {
  const { twinId } = useParams<{ twinId: string }>();
  const [info, setInfo] = useState<LicensingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!twinId) return;
    fetch(`/api/backend/twins/${twinId}/licensing-info`)
      .then((r) => r.json())
      .then((data) => {
        setInfo(data);
        setMessages([
          {
            role: "assistant",
            content: `Welcome to ${data.display_name}'s Licensing Portal. I can help you understand what's available for licensing, answer questions about terms, and guide you through the inquiry process. What would you like to know?`,
          },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [twinId]);

  async function sendQuestion(question: string) {
    if (!question.trim() || sending) return;
    setInput("");
    setShowStarters(false);
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);
    try {
      const res = await fetch(`/api/backend/twins/${twinId}/licensing-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.response || "I couldn't process that question. Please try rephrasing.",
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    }
    setSending(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Licensing information not available</h1>
          <p className="text-sm text-muted-foreground">This identity may not be available for licensing at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-semibold">AIV</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">Licensing Portal</span>
          </div>
          <h1 className="text-sm font-medium">{info.display_name}</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Info Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Licensing Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Available Modules</p>
                  <div className="space-y-1.5">
                    {ALL_MODULES.map((mod) => {
                      const available = info.available_modules.includes(mod);
                      return (
                        <div key={mod} className="flex items-center gap-2 text-sm">
                          {available ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                          <span className={available ? "text-foreground" : "text-muted-foreground"}>{humanizeEnum(mod)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {info.pricing_floor != null && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Minimum Deal Value</p>
                    <p className="text-lg font-bold">
                      ${info.pricing_floor.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">{info.currency}</span>
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Territory</p>
                  {info.territories_restricted.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {info.territories_restricted.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t} restricted</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-success flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> Global availability
                    </p>
                  )}
                </div>

                {info.permitted_use_cases.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Permitted Use Cases</p>
                    <div className="flex flex-wrap gap-1">
                      {info.permitted_use_cases.map((uc) => (
                        <Badge key={uc} variant="secondary" className="text-xs">{humanizeEnum(uc)}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {info.blacklisted_use_cases.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Restricted</p>
                    <div className="flex flex-wrap gap-1">
                      {info.blacklisted_use_cases.map((uc) => (
                        <Badge key={uc} variant="destructive" className="text-xs">{humanizeEnum(uc)}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm pt-2 border-t border-border/50">
                  {info.exclusivity_available ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>Exclusivity {info.exclusivity_available ? "available" : "not available"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  AI Licensing Assistant
                </CardTitle>
              </CardHeader>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {showStarters && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {STARTER_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendQuestion(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border/50 shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendQuestion(input); }} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about licensing terms, availability, pricing..."
                    disabled={sending}
                    className="flex-1"
                    aria-label="Ask about licensing"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
