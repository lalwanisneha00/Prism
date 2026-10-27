"use client";

import { Icon } from "@/components/Icon";
import { emphasisForRequest } from "@/lib/syllabus/emphasisClient";
import { apiFetch, sharedKeyForNextRequest } from "@/lib/byok/apiFetch";
import { useEffect, useState } from "react";
import { LessonError } from "@/components/lesson/LessonError";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonSkeleton } from "@/components/lesson/LessonSkeleton";
import { LessonView } from "@/components/lesson/LessonView";
import { SectionView } from "@/components/lesson/SectionView";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";
import { loadSyllabusOverlay } from "@/components/subjects/useSyllabusOverlay";
import { UPDATING_MESSAGE, type LessonErrorKind, type LessonEvent } from "@/lib/lessonEvents";
import type { LessonRequest } from "@/lib/lessonRequest";
import { toPassages, type NotePassage } from "@/lib/notes/notesSources";
import { findRelevantPassages } from "@/lib/notes/store";
import { readLessonStream } from "@/lib/readLessonStream";
import type { Lesson, Section } from "@/lib/schema";
import { getSavedLesson, lessonId, recordRecent, saveLesson } from "@/lib/storage/library";

type State =
  | {
      status: "loading";
      stage: string;
      sections: Section[];
      /** Phase 7: the copy we had predates a syllabus change, so a new one is being written. */
      updating?: boolean;
    }
  | {
      status: "ready";
      lesson: Lesson;
      fromLibrary: boolean;
      libraryKey?: string;
      /** Phase 5: students reported this lesson again after a rebuild; an admin checks it. */
      underReview?: boolean;
      /** Phase 5: rewritten just now from students' reports. */
      rebuilt?: boolean;
      /** Phase 7: rewritten just now because its topic changed in the syllabus. */
      updated?: boolean;
    }
  | { status: "error"; kind: LessonErrorKind; ownKey?: string };

const initial: State = { status: "loading", stage: "Getting started…", sections: [] };

/**
 * Whether a saved copy predates a syllabus change to its topic (moved, split, renamed). The map
 * of changed topics loads only when there is a saved copy to check.
 */
async function savedCopyStale(lesson: Lesson): Promise<boolean> {
  const [{ isLessonStale, staleTopics }, { staleFromOverlay }, overlay] = await Promise.all([
    import("@/lib/syllabusFix/stale"),
    import("@/lib/syllabusFix/overlay"),
    loadSyllabusOverlay(),
  ]);
  const map = overlay.changes.length ? staleFromOverlay(overlay, staleTopics) : staleTopics;
  const { subject, topic, createdAt } = lesson.meta;
  return isLessonStale(map, subject, topic, createdAt);
}

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
    // A saved copy that is out of date is replaced by the new lesson (same place in the library).
    let replaceSaved = false;

    function handle(event: LessonEvent) {
      if (event.type === "lesson" && replaceSaved)
        void saveLesson(event.lesson, Date.now(), event.libraryKey).catch(() => undefined);
      setState((prev) => {
        if (event.type === "lesson")
          return {
            status: "ready",
            lesson: event.lesson,
            fromLibrary: false,
            libraryKey: event.libraryKey,
            underReview: event.underReview,
            rebuilt: event.rebuiltFromFlags,
            updated: prev.status === "loading" && prev.updating,
          };
        if (event.type === "error")
          return { status: "error", kind: event.kind, ownKey: event.usedUserKey };
        if (prev.status !== "loading") return prev;
        if (event.type === "updating") return { ...prev, updating: true, stage: UPDATING_MESSAGE };
        if (event.type === "stage" && prev.updating) return prev;
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
        // Phase 7: a saved copy older than a syllabus change is rewritten (offline: kept for now).
        const stale =
          saved && navigator.onLine && (await savedCopyStale(saved.lesson).catch(() => false));
        if (controller.signal.aborted) return;
        if (saved && !stale) {
          return setState({
            status: "ready",
            lesson: saved.lesson,
            fromLibrary: true,
            libraryKey: saved.libraryKey,
          });
        }
        if (saved) {
          replaceSaved = true;
          setState({ status: "loading", stage: UPDATING_MESSAGE, sections: [], updating: true });
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
      // The student's course outcomes for this topic, if their uploaded syllabus covers it.
      const emphasis = await emphasisForRequest(
        request.subject,
        request.chapter.id,
        request.topic.id,
      );
      try {
        const res = await apiFetch("/api/lesson", {
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
            ...(emphasis ? { emphasis } : {}),
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
            <Icon name="book" /> None of your uploaded notes mention this topic, so this lesson uses
            the standard sources only.
          </p>
        )}
        {state.underReview && (
          <p
            role="note"
            data-testid="lesson-under-review"
            className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2 text-sm"
          >
            <Icon name="flag" /> Students reported issues here. It&apos;s being reviewed.
          </p>
        )}
        {state.rebuilt && (
          <p
            role="note"
            data-testid="lesson-rebuilt"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm"
          >
            <Icon name="flag" /> Updated just now: students reported problems in the earlier
            version, and this one was written to fix them.
          </p>
        )}
        {state.updated && (
          <p
            role="note"
            data-testid="lesson-updated"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm"
          >
            <Icon name="again" /> Updated just now: this topic changed in your syllabus since the
            earlier version was written.
          </p>
        )}
        {state.fromLibrary && (
          <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm">
            <span>
              <Icon name="library" /> Opened from your saved lessons. It works offline.
            </span>
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
          ownKey={state.ownKey}
          onUseShared={() => {
            sharedKeyForNextRequest();
            setState(initial);
            setAttempt((a) => a + 1);
          }}
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
