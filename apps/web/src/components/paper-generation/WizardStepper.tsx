"use client";

import { metadataWizardSteps } from "@holocron/shared";

interface WizardStepperProps {
  current: number;
}

export function WizardStepper({ current }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto">
      {metadataWizardSteps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i + 1 <= current
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs mr-2 ${i + 1 <= current ? "font-medium" : "text-muted-foreground"}`}
          >
            {step}
          </span>
          {i < metadataWizardSteps.length - 1 && (
            <div className="w-6 h-px bg-border" />
          )}
        </div>
      ))}
    </div>
  );
}
