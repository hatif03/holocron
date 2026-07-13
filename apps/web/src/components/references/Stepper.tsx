"use client";

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              i + 1 <= current
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-sm ${i + 1 <= current ? "font-medium" : "text-muted-foreground"}`}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px bg-border mx-1 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}
