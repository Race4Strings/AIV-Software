'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useProducer } from '../producer-context'
import { ArrowLeft, Shield, Eye, Lock, Users } from 'lucide-react'

interface StepProps {
  stepLabel: string
}

export function RightsStep({ stepLabel }: StepProps) {
  const { setStep, rightsData, setRightsData, saveRightsData } = useProducer()
  const [isSaving, setIsSaving] = useState(false)

  const handleNext = async () => {
    setIsSaving(true)
    try {
      await saveRightsData(rightsData)
      setStep('activate')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    setStep('visual')
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">{stepLabel}: Privacy & Rights</h2>
        <p className="text-muted-foreground">
          Configure how your clone can be used and who can interact with it.
        </p>
      </div>

      <div className="space-y-6">
        {/* Privacy Settings */}
        <div className="border rounded-xl p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Public Clone</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to discover and interact with your clone
                  </p>
                </div>
                <Switch
                  checked={rightsData.isPublic}
                  onCheckedChange={(checked) => setRightsData({ ...rightsData, isPublic: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Allow Training Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Permit conversations to be used for improving AI models
                  </p>
                </div>
                <Switch
                  checked={rightsData.allowTraining}
                  onCheckedChange={(checked) => setRightsData({ ...rightsData, allowTraining: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <Shield className="w-8 h-8 text-green-500 mb-2" />
            <h4 className="font-semibold">Data Security</h4>
            <p className="text-sm text-muted-foreground">
              Your data is encrypted and stored securely. You can delete your clone at any time.
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-muted/30">
            <Users className="w-8 h-8 text-blue-500 mb-2" />
            <h4 className="font-semibold">Access Control</h4>
            <p className="text-sm text-muted-foreground">
              You maintain full control over who can interact with your clone.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        
        <Button size="lg" onClick={handleNext} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Continue to Activation'}
        </Button>
      </div>
    </div>
  )
}
