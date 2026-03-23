"use client";

import { OnboardProvider } from "@/components/onboard/onboard-context";
import { OnboardWizard } from "@/components/onboard/onboard-wizard";

export default function PortalPreviewPage() {
  return (
    <div className="h-full overflow-y-auto">
      <OnboardProvider previewMode={true}>
        <OnboardWizard />
      </OnboardProvider>
    </div>
  );
}
