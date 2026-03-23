"use client";

import { Button } from "@/components/ui/button";
import { useOnboard } from "../onboard-context";
import { Video, Sparkles, User, Brain } from "lucide-react";

export function IntroStep() {
  const { createClone, isLoading } = useOnboard();

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 py-12 animate-in fade-in slide-in-from-bottom-4">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Video className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-4xl font-bold tracking-tight">
        Create Your Digital Likeness
      </h1>

      <p className="text-lg leading-relaxed max-w-xl">
        Record a 30-60 second introduction. We&apos;ll capture your voice,
        personality, and create your avatar automatically.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-xl">
        <div className="p-4 border rounded-lg bg-card">
          <User className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Voice</div>
          <div className="text-xs text-muted-foreground">
            Your unique voice pattern
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Avatar</div>
          <div className="text-xs text-muted-foreground">
            Your visual representation
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Personality</div>
          <div className="text-xs text-muted-foreground">
            Your unique traits & style
          </div>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg max-w-xl">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Introduce yourself naturally and share what
          you&apos;re passionate about.
        </p>
      </div>

      <Button
        size="lg"
        className="text-lg px-8 py-6 rounded-full"
        onClick={() => createClone()}
        disabled={isLoading}
      >
        {isLoading ? "Initializing..." : "Get Started"}
      </Button>
    </div>
  );
}
