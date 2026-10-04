"use client";

import { useEffect, useState } from "react";
import { LessonError } from "@/components/lesson/LessonError";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonSkeleton } from "@/components/lesson/LessonSkeleton";
import { LessonView } from "@/components/lesson/LessonView";
import { SectionView } from "@/components/lesson/SectionView";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import type { LessonErrorKind, LessonEvent } from "@/lib/lessonEvents";
import type { LessonRequest } from "@/lib/lessonRequest";
import { toPassages, type NotePassage } from "@/lib/notes/notesSources";
import { findRelevantPassages } from "@/lib/notes/store";
import { readLessonStream } from "@/lib/readLessonStream";
import type { Lesson, Section } from "@/lib/schema";
import { getSavedLesson, lessonId, recordRecent } from "@/lib/storage/library";

type State =
  | { status: "loading"; stage: string; sections: Section[] }
  | { status: "ready"; lesson: Lesson; fromLibrary: boolean; libraryKey?: string }
  | { status: "error"; kind: LessonErrorKind };

const initial: State = { status: "loading", stage: "Getting started…", sections: [] };

/**
 * Shows a lesson: from the student's saved library if it's there (instant, offline, no AI
 * quota used), otherwise asks the server and shows it as it streams in.
 */
export function LessonLoader({
  request,
  useNotes = false,
  custom,
}: {
  request: LessonRequest;
  useNotes?: boolean;
  /** A student's own subject (V3 · Step 4): sent with the request so the server can teach it. */
  custom?: CustomSubjectPayload;
}) {
  const [state, setState] = useState<State>(initial);
  const [attempt, setAttempt] = useState(0);
  const [skipLibrary, setSkipLibrary] = useState(false);
  const [notesMissing, setNotesMissing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    function handle(event: LessonEvent) {
      setState((prev) => {
        if (event.type === "lesson")
          return {
            status: "ready",
            lesson: event.lesson,
            fromLibrary: false,
            libraryKey: event.libraryKey,
          };
        if (event.type === "error") return { status: "error", kind: event.kind };
        if (prev.status !== "loading") return prev;
        if (event.type === "stage") return { ...prev, stage: event.message };
        return { ...prev, sections: [...prev.sections, event.section] };
      });
    }

    (async () => {
      if (!skipLibrary) {
        const saved = await getSavedLesson(
          lessonId({
            subject: request.subject.id,
            topic: request.topic.id,
            level: request.level.slug,
            durationMin: request.duration,
            fromNotes: useNotes,
          }),
        ).catch(() => undefined);
        if (controller.signal.aborted) return;
        if (saved) {
          return setState({
            status: "ready",
            lesson: saved.lesson,
            fromLibrary: true,
            libraryKey: saved.libraryKey,
          });
        }
      }
      if (!navigator.onLine) return setState({ status: "error", kind: "offline" });

      // The best-matching pages of the student's notes, found on this device.
      let notes: NotePassage[] = [];
      if (useNotes) {
        notes = toPassages(
          await findRelevantPassages(
            `${request.topic.name} ${request.chapter.name}`,
            8,
            request.subject.id,
          ).catch(() => []),
        );
        if (controller.signal.aborted) return;
        setNotesMissing(notes.length === 0);
      }
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
            fresh: skipLibrary,
            ...(notes.length > 0 ? { notes } : {}),
            ...(custom ? { custom } : {}),
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
  }, [request, attempt, skipLibrary, useNotes, custom]);

  // Every lesson opened goes to the top of "Recent topics" on the home page.
  const readyLesson = state.status === "ready" ? state.lesson : null;
  useEffect(() => {
    if (!readyLesson) return;
    recordRecent({
      subject: request.subject.id,
      chapter: request.chapter.id,
      topic: request.topic.id,
      level: request.level.slug,
      duration: request.duration,
      title: request.topic.name,
      chapterName: request.chapter.name,
    }).catch(() => {
      // Storage unavailable (e.g. private browsing): recent topics just aren't remembered.
    });
  }, [readyLesson, request]);

  if (state.status === "ready") {
    return (
      <div className="flex flex-col gap-4">
        {notesMissing && (
          <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm">
            📒 None of your uploaded notes mention this topic, so this lesson uses the standard
            sources only.
          </p>
        )}
        {state.fromLibrary && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm">
            <span>📚 Opened from your saved lessons. It works offline.</span>
            <button
              type="button"
              onClick={() => {
                setState(initial);
                setSkipLibrary(true);
                setAttempt((a) => a + 1);
              }}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Write a fresh version
            </button>
          </p>
        )}
        <LessonView lesson={state.lesson} request={request} libraryKey={state.libraryKey} />
      </div>
    );
  }
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
