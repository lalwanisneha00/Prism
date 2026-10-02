"use client";

import { Markdown } from "@/components/lesson/Markdown";
import type { ExplainState } from "@/components/explain/useExplain";

/** The AI's answer (or its loading / error state), as shown under a section or in the popup. */
export function ExplainAnswer({ state, onRetry }: { state: ExplainState; onRetry: () => void }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Thinking…</span>
        <div className="h-3 w-11/12 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-9/12 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-10/12 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="flex flex-col gap-2 text-sm">
        <p className="font-semibold">{state.title}</p>
        <p className="text-muted">{state.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="w-fit rounded-full border border-border px-3 py-1 font-semibold hover:bg-surface-2"
        >
          {state.rateLimited ? "Try again in a minute" : "Try again"}
        </button>
      </div>
    );
  }
  return (
    <div aria-live="polite">
      <Markdown className="text-[0.95rem]">{state.text}</Markdown>
      <p className="mt-2 text-xs text-muted">AI-written help. Check it against the lesson above.</p>
    </div>
  );
}
