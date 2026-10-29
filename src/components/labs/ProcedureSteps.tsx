"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ApparatusDiagram, type SetupLike } from "@/components/labs/ApparatusDiagram";
import { Markdown } from "@/components/lesson/Markdown";
import { setupStepTargets } from "@/lib/labs/stepTargets";

const STEP_MS = 4500;

/**
 * A procedure walked through one step at a time beside its diagram (syllabus fix, Phase 7C fixes):
 * the diagram shows what the current step uses, the step is read out in a large card with back,
 * play and next, and every step stays listed underneath (tap one to jump to it).
 */
export function ProcedurePlayer({
  steps,
  diagram,
  uses,
  playLabel = "Play the procedure",
  hint,
}: {
  steps: readonly { text: string }[];
  /** The drawing for a step (null: before the first step). */
  diagram: (step: number | null) => ReactNode;
  /** Names of the parts a step uses, shown under it. */
  uses: (step: number) => string[];
  playLabel?: string;
  /** One line under the diagram on how to read it. */
  hint?: string;
}) {
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const top = useRef<HTMLDivElement>(null);

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

  const go = (i: number) => {
    setPlaying(false);
    setCurrent(Math.max(0, Math.min(steps.length - 1, i)));
  };
  const at = current ?? 0;
  const names = current === null ? [] : uses(current);

  return (
    <div
      className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5"
      data-testid="procedure-player"
    >
      {/* On wide screens the drawing stays in view beside the steps. */}
      <div ref={top} className="flex scroll-mt-20 flex-col gap-2 lg:sticky lg:top-24">
        {diagram(current)}
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <div className="flex flex-col gap-3">
        <div
          className="flex flex-col gap-3 rounded-2xl border-2 border-primary/50 bg-primary-soft/30 p-3 sm:p-4"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-fg">
              {current === null ? "▶" : current + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-muted">
                {current === null
                  ? `${steps.length} steps`
                  : `Step ${current + 1} of ${steps.length}`}
              </p>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={current === null ? 0 : current + 1}
                aria-label="Progress through the steps"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{
                    width: `${current === null ? 0 : ((current + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          {current === null ? (
            <p className="text-muted">
              Start the walkthrough to see each step on the diagram, or tap any step below.
            </p>
          ) : (
            <div className="text-[1.05rem] leading-relaxed">
              <Markdown>{steps[current].text}</Markdown>
            </div>
          )}
          {names.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Parts used in this step">
              {names.map((n) => (
                <li
                  key={n}
                  className="rounded-full border border-primary/40 bg-surface px-2.5 py-0.5 text-xs font-semibold text-primary"
                >
                  {n}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => go(at - 1)}
              disabled={current === null || current === 0}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!playing && (current === null || current >= steps.length - 1)) setCurrent(0);
                setPlaying((p) => !p);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
            >
              <span aria-hidden="true">{playing ? "❚❚ " : "▶ "}</span>
              {playing ? "Pause" : current === null ? playLabel : "Play"}
            </button>
            <button
              type="button"
              onClick={() => go(current === null ? 0 : at + 1)}
              disabled={current !== null && current >= steps.length - 1}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        <ol className="flex flex-col gap-1.5" aria-label="All steps">
          {steps.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  go(i);
                  top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-pressed={i === current}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                  i === current
                    ? "border-primary bg-primary-soft/40"
                    : current !== null && i < current
                      ? "border-border bg-surface-2/60 text-muted"
                      : "border-border hover:bg-surface-2"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === current
                      ? "bg-primary text-primary-fg"
                      : current !== null && i < current
                        ? "bg-success/20 text-success"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {current !== null && i < current ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <Markdown>{s.text}</Markdown>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** A procedure over a setup diagram (lab lessons, and Phase 7B lessons). */
export function ProcedureSteps({
  lesson,
  playLabel = "Play the procedure",
}: {
  lesson: {
    procedure: readonly { text: string; parts: readonly string[] }[];
    apparatus: SetupLike;
  };
  /** Kept for Phase 7B lessons' simulation fallback; the player is the same. */
  animated?: boolean;
  /** The button's words, e.g. "Play the operations". */
  playLabel?: string;
}) {
  const targets = lesson.procedure.map((s) => setupStepTargets(s, lesson.apparatus));
  const label = (id: string) => lesson.apparatus.parts.find((p) => p.id === id)?.label ?? id;
  return (
    <ProcedurePlayer
      steps={lesson.procedure}
      playLabel={playLabel}
      diagram={(i) => (
        <ApparatusDiagram
          apparatus={lesson.apparatus}
          highlight={i === null ? [] : targets[i]}
          caption={false}
        />
      )}
      uses={(i) => targets[i].map(label)}
      hint="The parts each step uses light up on the drawing; the numbers match the parts list."
    />
  );
}
