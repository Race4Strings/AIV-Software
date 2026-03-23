'use client'

import { OnboardProvider } from '@/components/onboard/onboard-context'
import { OnboardWizard } from '@/components/onboard/onboard-wizard'

export default function PortalPage() {
  return (
    <div className="h-full overflow-y-auto">
      <OnboardProvider>
        <OnboardWizard />
      </OnboardProvider>
    </div>
  )
}

