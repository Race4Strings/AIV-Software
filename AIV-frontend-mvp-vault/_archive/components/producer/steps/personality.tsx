'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useProducer } from '../producer-context'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft } from 'lucide-react'

interface StepProps {
  stepLabel: string
}

const QUESTIONS = [
  {
    id: 'q1',
    category: '🧠 Mind',
    prompt: "Describe the inner architecture of your mind.",
    description: "Cover how you analyze problems, what information you retain easily, your humor style, your approach to learning new things, and the nature of your internal dialogue."
  },
  {
    id: 'q2',
    category: '❤️ Heart',
    prompt: "What is the emotional landscape you live within?",
    description: "Cover your core values, how you express love and anger, what reliably triggers joy or stress, your methods for coping with vulnerability, and your relationship with empathy."
  },
  {
    id: 'q3',
    category: '🌟 Spirit',
    prompt: "What gives your life its deepest meaning and direction?",
    description: "Cover your beliefs about purpose, your connection to any higher power or nature, your definition of \"the good life,\" and what legacy or wisdom you hope to leave behind."
  },
  {
    id: 'q4',
    category: '🏃‍♀️ Physicality',
    prompt: "How do you experience the world through your senses and body?",
    description: "Cover your energy cycles (morning/night), your favorite comfort sensations (smell, sound, touch), your relationship with physical activity and diet, and your physical habits or gestures."
  },
  {
    id: 'q5',
    category: '🗺️ Experiences',
    prompt: "What were the most significant turning points and lessons you've gained?",
    description: "Cover the most important decisions, greatest risks/failures, earliest vivid memories, and the most memorable places or moments that fundamentally changed your perspective."
  },
  {
    id: 'q6',
    category: '🫂 Relationships',
    prompt: "How do you connect with and navigate the people around you?",
    description: "Cover your typical social role (e.g., leader, listener), your boundaries, how you resolve conflict, who has influenced you the most, and how you express/receive affection and loyalty."
  },
  {
    id: 'q7',
    category: '🏡 Surroundings',
    prompt: "Describe the environment and routines that define your daily existence.",
    description: "Cover your ideal living space, your approach to order vs. clutter, your daily rituals, your financial habits, and your perspective on technology's role in your personal life."
  },
  {
    id: 'q8',
    category: '💼 Work',
    prompt: 'What drives your ambition, and how do you achieve success?',
    description: 'Cover what "success" means to you, the conditions under which you enter a "flow state," your leadership style, how you handle criticism, and your relationship with pressure and deadlines.'
  },
  {
    id: 'q9',
    category: '⚖️ Ethics',
    prompt: "What are the ethical pillars that govern your choices?",
    description: "Cover how you determine right from wrong, your view on absolute moral rules, how you balance self-interest with the common good, and what social issues you are most passionate about."
  },
  {
    id: 'q10',
    category: '🔮 Future',
    prompt: "What is the greatest change you anticipate, and what do you hope to become?",
    description: "Cover your idealized future self, the aspects of unpredictability you resist vs. embrace, what you believe the world fundamentally needs, and the deepest misconceptions people have of you."
  }
]

export function PersonalityStep({ stepLabel }: StepProps) {
  const { setStep, savePersonalityData, isLoading } = useProducer()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const currentQuestion = QUESTIONS[currentIndex]
  const currentAnswer = answers[currentQuestion.id] || ''

  const handleNext = async () => {
    if (!currentAnswer.trim()) {
      toast.error('Please provide an answer')
      return
    }

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setIsSaving(true)
      try {
        await savePersonalityData(answers)
        setStep('knowledge')
      } catch (error) {
        console.error(error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    } else {
      setStep('voice')
    }
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{stepLabel}: Capture Your Personality</span>
        <span>Question {currentIndex + 1} of {QUESTIONS.length}</span>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium text-primary uppercase tracking-wide">{currentQuestion.category}</div>
          <h2 className="text-3xl font-bold leading-tight">{currentQuestion.prompt}</h2>
        </div>

        <div className="bg-muted/30 p-4 rounded-lg border text-sm text-muted-foreground">
          {currentQuestion.description}
        </div>

        <Textarea 
          placeholder="Type your thoughts here..."
          className="min-h-[200px] text-lg p-6 bg-background focus:ring-2 ring-primary/20"
          value={currentAnswer}
          onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
          autoFocus
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        
        <Button size="lg" onClick={handleNext} disabled={isSaving || isLoading || !currentAnswer.trim()}>
          {currentIndex === QUESTIONS.length - 1 ? (
            isSaving ? 'Saving...' : 'Save & Continue'
          ) : (
            <>Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  )
}
