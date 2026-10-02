"use client";

import { useState } from "react";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import { GenericFrame } from "@/visuals/generic/Frame";
import type { StepsSpec } from "@/visuals/generic/specs";
import { WidgetButton } from "@/visuals/ui";

/** A process shown one step at a time, with Back / Next (SPEC §4.1 item 8). */
export function StepThrough({ spec }: { spec: StepsSpec }) {
  const [i, setI] = useState(0);
  const step = spec.steps[i];
  const last = spec.steps.length - 1;

  return (
    <GenericFrame
      icon="👣"
      title={`Step ${i + 1} of ${spec.steps.length}: ${step.title}`}
      caption={spec.caption}
      interactive
      controls={
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <WidgetButton onClick={() => setI((n) => Math.max(0, n - 1))}>← Back</WidgetButton>
          <WidgetButton onClick={() => setI((n) => Math.min(last, n + 1))}>Next →</WidgetButton>
          <span className="sr-only" aria-live="polite">
            Step {i + 1} of {spec.steps.length}: {step.title}
          </span>
        </div>
      }
    >
      <ol className="flex gap-1 px-3 pt-3" aria-hidden="true">
        {spec.steps.map((s, n) => (
          <li
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-surface-2"}`}
          />
        ))}
      </ol>
      <div className="flex flex-col gap-2 p-3">
        <Markdown>{step.body}</Markdown>
        {step.formula && (
          <div className="overflow-x-auto">
            <Formula latex={step.formula} />
          </div>
        )}
      </div>
    </GenericFrame>
  );
}
