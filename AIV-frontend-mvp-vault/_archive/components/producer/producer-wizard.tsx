'use client'

import { useProducer } from './producer-context'
import { IntroStep } from './steps/intro'
import { VoiceCaptureStep } from './steps/voice-capture'
import { PersonalityStep } from './steps/personality'
import { KnowledgeStep } from './steps/knowledge'
import { VisualStep } from './steps/visual'
import { RightsStep } from './steps/rights'
import { ActivateStep } from './steps/activate'
import { Progress } from '@/components/ui/progress'

export function ProducerWizard() {
  const { step } = useProducer()

  const getProgress = () => {
    switch (step) {
      case 'intro': return 0
      case 'voice': return 16
      case 'personality': return 33
      case 'knowledge': return 50
      case 'visual': return 66
      case 'rights': return 83
      case 'activate': return 100
      default: return 0
    }
  }

  const getStepNumber = () => {
    switch (step) {
      case 'voice': return '1 / 6'
      case 'personality': return '2 / 6'
      case 'knowledge': return '3 / 6'
      case 'visual': return '4 / 6'
      case 'rights': return '5 / 6'
      case 'activate': return '6 / 6'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Progress Bar */}
      {step !== 'intro' && (
        <div className="w-full h-2 bg-muted sticky top-0 z-50">
          <Progress value={getProgress()} className="h-full rounded-none" />
        </div>
      )}

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        {step === 'intro' && <IntroStep />}
        {step === 'voice' && <VoiceCaptureStep stepLabel={getStepNumber()} />}
        {step === 'personality' && <PersonalityStep stepLabel={getStepNumber()} />}
        {step === 'knowledge' && <KnowledgeStep stepLabel={getStepNumber()} />}
        {step === 'visual' && <VisualStep stepLabel={getStepNumber()} />}
        {step === 'rights' && <RightsStep stepLabel={getStepNumber()} />}
        {step === 'activate' && <ActivateStep />}
      </main>
    </div>
  )
}
