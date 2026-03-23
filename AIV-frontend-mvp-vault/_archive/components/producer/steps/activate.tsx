'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useProducer } from '../producer-context'
import { Loader2, Rocket } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'

export function ActivateStep() {
  const { activate, isLoading, voiceData, personalityData, imageData, setStep } = useProducer()
  const [isActivating, setIsActivating] = useState(false)

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      await activate()
      // The activate function will redirect to dashboard
    } catch (error) {
      console.error(error)
      setIsActivating(false)
    }
  }

  const handleBack = () => {
    setStep('rights')
  }

  const completedSteps = [
    { name: 'Voice Sample', complete: !!voiceData.sampleUrl },
    { name: 'Personality Profile', complete: Object.keys(personalityData).length > 0 },
    { name: 'Knowledge Base', complete: true }, // Optional, always true
    { name: 'Visual Identity', complete: !!imageData.frontal },
    { name: 'Privacy Settings', complete: true }, // Always configured
  ]

  if (isActivating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] max-w-2xl mx-auto space-y-8 py-12 text-center animate-in fade-in zoom-in-95">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Activating Your Clone...</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Your clone is being queued for synthesis. You will be redirected to the dashboard shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Ready to Activate</h2>
        <p className="text-muted-foreground">
          Review your data and activate your digital clone
        </p>
      </div>

      {/* Summary */}
      <div className="border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-lg">Data Summary</h3>
        {completedSteps.map((step, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
            <span>{step.name}</span>
            {step.complete ? (
              <span className="text-green-500 font-medium">✓ Complete</span>
            ) : (
              <span className="text-yellow-500 font-medium">○ Optional</span>
            )}
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> After activation, you will be redirected to your dashboard. 
          Clone synthesis happens in the background - you will receive a notification when your clone is ready.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        
        <Button 
          size="lg" 
          className="text-lg px-8 py-6 rounded-full"
          onClick={handleActivate}
          disabled={isLoading || isActivating}
        >
          <Rocket className="w-5 h-5 mr-2" />
          Activate My Clone
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        By activating, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
