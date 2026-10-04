"use client";

import { useState } from "react";
import { ExplainAnswer } from "@/components/explain/ExplainAnswer";
import { useExplain, useLesson } from "@/components/explain/useExplain";
import type { ExplainAction } from "@/lib/explain/explain";
import { recordSignal } from "@/lib/priority/signals";

/** "Explain simpler" and "Another analogy" under a section (SPEC §8). */
export function SectionHelp({ sectionId }: { sectionId: string }) {
  const lesson = useLesson();
  const { state, run, reset } = useExplain(lesson);
  const [action, setAction] = useState<Extract<ExplainAction, "simpler" | "analogy"> | null>(null);
  // Analogies already shown, so each press gives a new one.
  const [shown, setShown] = useState<string[]>([]);

  if (!lesson) return null;

  const hasAnalogy = shown.length > 0 || (action === "analogy" && state.status === "ready");

  function ask(next: "simpler" | "analogy") {
    // Remember the analogy on screen so the next one is different.
    const seen =
      action === "analogy" && state.status === "ready" ? [...shown, state.text].slice(-5) : shown;
    setShown(seen);
    setAction(next);
    if (next === "simpler" && lesson) {
      void recordSignal({ kind: "simpler", subject: lesson.meta.subject, topic: lesson.meta.topic }).catch(
        () => {
          // Storage unavailable: the signal is just not remembered.
        },
      );
    }
    void run({ action: next, sectionId, avoid: next === "analogy" ? seen : undefined });
  }

  const button =
    "rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const busy = state.status === "loading";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={busy} onClick={() => ask("simpler")}>
          🪶 Explain simpler
        </button>
        <button type="button" className={button} disabled={busy} onClick={() => ask("analogy")}>
          🔄 {hasAnalogy ? "Another analogy" : "Give me an analogy"}
        </button>
      </div>
      {state.status !== "idle" && (
        <div className="relative rounded-xl border border-primary/30 bg-primary-soft/40 p-3 pr-9">
          <p className="mb-2 text-xs font-semibold tracking-wide text-primary uppercase">
            {action === "analogy" ? "Analogy" : "In simpler words"}
          </p>
          <ExplainAnswer state={state} onRetry={() => action && ask(action)} />
          <button
            type="button"
            onClick={() => {
              reset();
              setAction(null);
            }}
            aria-label="Close"
            className="absolute top-2 right-2 rounded-full px-2 text-muted hover:bg-surface-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
