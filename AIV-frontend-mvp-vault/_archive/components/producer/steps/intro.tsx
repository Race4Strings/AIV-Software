'use client'

import { Button } from '@/components/ui/button'
import { useProducer } from '../producer-context'
import { Mic, Brain, FileText, Camera, Shield, Rocket } from 'lucide-react'

export function IntroStep() {
  const { createDraft, isLoading } = useProducer()

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 py-12 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-4xl font-bold tracking-tight">Create Your Digital Clone</h1>
      <h2 className="text-2xl text-muted-foreground">Your Portal to Self-Replication</h2>
      
      <p className="text-lg leading-relaxed">
        This channel is your portal to self-replication. We will capture your mind, heart, and voice 
        to build a dedicated digital twin. The process involves six stages of data capture:
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-xl">
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <Mic className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Voice</div>
          <div className="text-xs text-muted-foreground">Your speech patterns</div>
        </div>
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Personality</div>
          <div className="text-xs text-muted-foreground">Your essence</div>
        </div>
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Knowledge</div>
          <div className="text-xs text-muted-foreground">Your expertise</div>
        </div>
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <Camera className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Visual</div>
          <div className="text-xs text-muted-foreground">Your appearance</div>
        </div>
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Rights</div>
          <div className="text-xs text-muted-foreground">Your privacy</div>
        </div>
        <div className="p-4 border rounded-lg bg-card hover:border-primary transition-colors">
          <Rocket className="w-8 h-8 mx-auto mb-2 text-primary" />
          <div className="font-semibold">Activate</div>
          <div className="text-xs text-muted-foreground">Launch your clone</div>
        </div>
      </div>

      <Button 
        size="lg" 
        className="text-lg px-8 py-6 rounded-full"
        onClick={() => createDraft()}
        disabled={isLoading}
      >
        {isLoading ? 'Initializing...' : 'Start Data Capture'}
      </Button>
    </div>
  )
}
