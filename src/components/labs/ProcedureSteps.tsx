"use client";

import { useEffect, useState } from "react";
import { ApparatusDiagram } from "@/components/labs/ApparatusDiagram";
import { Markdown } from "@/components/lesson/Markdown";
import type { PracticalLesson } from "@/lib/labs/practicalSchema";

const STEP_MS = 3500;

/**
 * The procedure as numbered steps beside the setup diagram. Tapping a step lights up the parts it
 * uses; "Play the procedure" steps through them on its own (this is also the experiment's
 * animation when no simulation template fits it).
 */
export function ProcedureSteps({
  lesson,
  animated = false,
}: {
  lesson: Pick<PracticalLesson, "procedure" | "apparatus">;
  /** Shown as the simulation section's fallback: a larger "play" call to action. */
  animated?: boolean;
}) {
  const [current, setCurrent] = useState<number | null>(animated ? 0 : null);
  const [playing, setPlaying] = useState(false);
  const steps = lesson.procedure;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setCurrent((c) => {
        const next = (c ?? -1) + 1;
        if (next >= steps.length) {
          setPlaying(false);
          return c;
        }
        return next;
      });
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [playing, steps.length]);

  const highlight = current === null ? [] : (steps[current]?.parts ?? []);
  return (
    <div className="flex flex-col gap-3">
      <ApparatusDiagram apparatus={lesson.apparatus} highlight={highlight} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!playing && (current === null || current >= steps.length - 1)) setCurrent(0);
            setPlaying((p) => !p);
          }}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          {playing ? "Pause" : "Play the procedure"}
        </button>
        {current !== null && (
          <span className="text-sm text-muted" aria-live="polite">
            Step {current + 1} of {steps.length}
          </span>
        )}
      </div>
      {animated && current !== null ? (
        <div className="rounded-xl border border-primary/40 bg-primary-soft/40 p-3">
          <Markdown>{steps[current].text}</Markdown>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setCurrent(i === current ? null : i);
                }}
                aria-pressed={i === current}
                className={`flex w-full gap-3 rounded-xl border px-3 py-2 text-left ${
                  i === current
                    ? "border-primary bg-primary-soft/40"
                    : "border-border hover:bg-surface-2"
                }`}
              >
                <span className="w-6 shrink-0 text-right font-semibold text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <Markdown>{s.text}</Markdown>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
