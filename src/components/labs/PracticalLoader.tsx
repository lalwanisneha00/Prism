"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonFlag } from "@/components/flags/LessonFlag";
import { apiFetch } from "@/lib/byok/apiFetch";
import { FLAGS } from "@/lib/flags";
import { LabLessonView } from "@/components/labs/LabLessonView";
import { PracticalView } from "@/components/labs/PracticalView";
import { errorCopy, needsKey, UPDATING_MESSAGE, type LessonErrorKind } from "@/lib/lessonEvents";
import type { PracticalEvent } from "@/lib/labs/practicalEvents";
import { PRACTICAL_DURATION, PRACTICAL_LEVEL } from "@/lib/labs/practicalSchema";
import { isLabV2, type LabLessonAny } from "@/lib/labs/labLesson";
import { readNdjson } from "@/lib/readLessonStream";
import type { Subject } from "@/lib/subjects";

type State =
  | { kind: "loading"; message: string }
  | { kind: "error"; error: LessonErrorKind }
  | { kind: "ready"; lesson: LabLessonAny; note?: string };

/** Loads one experiment's lab lesson from /api/practical and shows it, with every state handled. */
export function PracticalLoader({ subject, topicId }: { subject: Subject; topicId: string }) {
  const [state, setState] = useState<State>({
    kind: "loading",
    message: "Opening the lab lesson…",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const load = async () => {
      // Offline: the fetch fails at once and the catch below says so.
      let finished = false;
      try {
        // The student's own AI key (Your API keys) goes along, like theory lessons.
        const res = await apiFetch("/api/practical", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subject: subject.id, topic: topicId }),
          signal,
        });
        if (!res.body) throw new Error("no body");
        if (!res.ok && !res.headers.get("content-type")?.includes("ndjson")) {
          const data = (await res.json().catch(() => null)) as PracticalEvent | null;
          setState({ kind: "error", error: data?.type === "error" ? data.kind : "unavailable" });
          return;
        }
        await readNdjson<PracticalEvent>(res.body, (event) => {
          if (event.type === "stage") setState({ kind: "loading", message: event.message });
          else if (event.type === "updating")
            setState({ kind: "loading", message: UPDATING_MESSAGE });
          else if (event.type === "lesson") {
            finished = true;
            setState({
              kind: "ready",
              lesson: event.lesson,
              note: event.underReview
                ? "Students reported issues here. It's being reviewed."
                : event.rebuiltFromFlags
                  ? "Rewritten just now to fix problems students reported."
                  : undefined,
            });
          } else if (event.type === "error") {
            finished = true;
            setState({ kind: "error", error: event.kind });
          }
        });
        if (!finished) setState({ kind: "error", error: "unavailable" });
      } catch {
        if (signal.aborted) return;
        setState({ kind: "error", error: navigator.onLine === false ? "offline" : "unavailable" });
      }
    };
    void load();
    return () => controller.abort();
  }, [subject.id, topicId, attempt]);

  if (state.kind === "loading")
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <p role="status" className="text-sm font-semibold text-muted">
          {state.message}
        </p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  if (state.kind === "error") {
    const copy = errorCopy[state.error];
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
      >
        <h2 className="text-2xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-muted">{copy.message}</p>
        {state.error !== "invalid-request" && state.error !== "not-configured" && (
          <button
            type="button"
            onClick={() => {
              setState({ kind: "loading", message: "Trying again…" });
              setAttempt((a) => a + 1);
            }}
            className="self-start rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Try again
          </button>
        )}
        {FLAGS.byoKey && needsKey(state.error) && (
          <Link
            href="/settings/keys"
            className="self-start rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2"
          >
            Add my own AI key
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {state.note ? (
          <p
            role="note"
            className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
          >
            {state.note}
          </p>
        ) : (
          <span />
        )}
        <LessonFlag
          subject={subject}
          chapterId={state.lesson.meta.chapter}
          topicId={topicId}
          level={PRACTICAL_LEVEL}
          durationMin={PRACTICAL_DURATION}
        />
      </div>
      {isLabV2(state.lesson) ? (
        <LabLessonView lesson={state.lesson} />
      ) : (
        <PracticalView lesson={state.lesson} />
      )}
    </div>
  );
}
