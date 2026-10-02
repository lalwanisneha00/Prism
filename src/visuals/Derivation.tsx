"use client";

import { useState } from "react";
import { Formula, Markdown } from "@/components/lesson/Markdown";
import { WidgetButton } from "@/visuals/ui";

/**
 * A derivation revealed one line at a time, like a teacher writing on the board: try to
 * guess the next line before you press "Next step".
 */
export function Derivation({
  steps,
  caption,
}: {
  steps: { math: string; why: string }[];
  caption: string;
}) {
  const [shown, setShown] = useState(1);
  const done = shown >= steps.length;

  return (
    <figure className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">
        <span aria-hidden="true">✍️ </span>Step-by-step derivation{" "}
        <span className="font-normal text-muted">
          · step {Math.min(shown, steps.length)} of {steps.length}
        </span>
      </p>
      <ol className="flex flex-col gap-2" aria-live="polite">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface px-3 py-1">
            <div className="overflow-x-auto">
              <Formula latex={s.math} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 pb-2 text-sm text-muted">
              <span className="font-semibold text-fg">{i === 0 ? "Start:" : "Because:"}</span>
              <Markdown>{s.why}</Markdown>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {!done && <WidgetButton onClick={() => setShown((n) => n + 1)}>Next step →</WidgetButton>}
        {!done && <WidgetButton onClick={() => setShown(steps.length)}>Show all</WidgetButton>}
        {shown > 1 && <WidgetButton onClick={() => setShown(1)}>Start again</WidgetButton>}
      </div>
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
