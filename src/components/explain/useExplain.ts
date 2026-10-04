"use client";

import { apiFetch } from "@/lib/byok/apiFetch";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ExplainInput } from "@/lib/explain/explain";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import type { Lesson } from "@/lib/schema";

/** The lesson on screen, for tools that ask the AI about it (null while a lesson streams in). */
export const LessonContext = createContext<Lesson | null>(null);
export const useLesson = () => useContext(LessonContext);

export type ExplainState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error"; title: string; message: string; rateLimited: boolean };

/** Asks /api/explain about the current lesson; keeps loading, answer and error states. */
export function useExplain(lesson: Lesson | null) {
  const [state, setState] = useState<ExplainState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (input: ExplainInput) => {
      if (!lesson) return;
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState({ status: "loading" });
      try {
        const res = await apiFetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lesson, input }),
          signal: current.signal,
        });
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          text?: unknown;
          kind?: string;
        } | null;
        if (body?.ok && typeof body.text === "string") {
          setState({ status: "ready", text: body.text });
          return;
        }
        const kind = (body?.kind ?? "unavailable") as LessonErrorKind;
        const copy = errorCopy[kind] ?? errorCopy.unavailable;
        setState({ status: "error", ...copy, rateLimited: kind === "rate-limit" });
      } catch {
        if (current.signal.aborted) return;
        const copy = navigator.onLine ? errorCopy.unavailable : errorCopy.offline;
        setState({ status: "error", ...copy, rateLimited: false });
      }
    },
    [lesson],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
