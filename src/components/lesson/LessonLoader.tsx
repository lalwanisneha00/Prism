"use client";

import { useEffect, useState } from "react";
import { LessonError } from "@/components/lesson/LessonError";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonSkeleton } from "@/components/lesson/LessonSkeleton";
import { LessonView } from "@/components/lesson/LessonView";
import { SectionView } from "@/components/lesson/SectionView";
import type { LessonErrorKind, LessonEvent } from "@/lib/lessonEvents";
import type { LessonRequest } from "@/lib/lessonRequest";
import { readLessonStream } from "@/lib/readLessonStream";
import type { Lesson, Section } from "@/lib/schema";

type State =
  | { status: "loading"; stage: string; sections: Section[] }
  | { status: "ready"; lesson: Lesson }
  | { status: "error"; kind: LessonErrorKind };

const initial: State = { status: "loading", stage: "Getting started…", sections: [] };

/** Asks the server for a lesson and shows it as it streams in. */
export function LessonLoader({ request }: { request: LessonRequest }) {
  const [state, setState] = useState<State>(initial);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    function handle(event: LessonEvent) {
      setState((prev) => {
        if (event.type === "lesson") return { status: "ready", lesson: event.lesson };
        if (event.type === "error") return { status: "error", kind: event.kind };
        if (prev.status !== "loading") return prev;
        if (event.type === "stage") return { ...prev, stage: event.message };
        return { ...prev, sections: [...prev.sections, event.section] };
      });
    }

    (async () => {
      if (!navigator.onLine) return setState({ status: "error", kind: "offline" });
      try {
        const res = await fetch("/api/lesson", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            subject: request.subject.id,
            chapter: request.chapter.id,
            topic: request.topic.id,
            level: request.level.slug,
            duration: String(request.duration),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const event = (await res.json().catch(() => null)) as LessonEvent | null;
          handle(
            event?.type === "error" ? event : { type: "error", kind: "unavailable", message: "" },
          );
          return;
        }
        await readLessonStream(res.body, handle);
        // A stream that ends without a lesson or an error means the connection dropped.
        setState((prev) =>
          prev.status === "loading" ? { status: "error", kind: "unavailable" } : prev,
        );
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "error", kind: navigator.onLine ? "unavailable" : "offline" });
      }
    })();

    return () => controller.abort();
  }, [request, attempt]);

  if (state.status === "ready") return <LessonView lesson={state.lesson} request={request} />;
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-8">
        <LessonHeader request={request} />
        <LessonError
          kind={state.kind}
          onRetry={() => {
            setState(initial);
            setAttempt((a) => a + 1);
          }}
        />
      </div>
    );
  }
  return (
    <LessonSkeleton request={request} stage={state.stage}>
      {state.sections.map((s, i) => (
        <SectionView key={s.id} section={s} index={i} sources={[]} />
      ))}
    </LessonSkeleton>
  );
}
