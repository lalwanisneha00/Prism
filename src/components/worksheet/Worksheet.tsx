"use client";

import { apiFetch } from "@/lib/byok/apiFetch";
import { useState } from "react";
import { PastPaperInput } from "@/components/worksheet/PastPaperInput";
import { WorksheetQuestionCard } from "@/components/worksheet/WorksheetQuestionCard";
import { errorCopy } from "@/lib/lessonEvents";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import type { Lesson } from "@/lib/schema";
import { lessonId } from "@/lib/storage/library";
import { recordQuizAttempt } from "@/lib/storage/progress";
import {
  marksEarned,
  PRACTICE_SIZES,
  WorksheetSchema,
  type SelfMark,
  type Worksheet as WorksheetData,
  type WorksheetMode,
} from "@/lib/worksheet/schema";

type State =
  | { status: "idle" }
  | { status: "loading"; mode: WorksheetMode["mode"] }
  | { status: "ready"; sheet: WorksheetData; source: WorksheetMode["mode"] }
  | { status: "error"; title: string; message: string; retry: WorksheetMode };

const cacheKey = (meta: Lesson["meta"]) => `prism-worksheet:${lessonId(meta)}`;

/** The last worksheet for this lesson, so a reload doesn't lose it (per device only). */
function loadCached(meta: Lesson["meta"]): State {
  try {
    const raw = localStorage.getItem(cacheKey(meta));
    if (!raw) return { status: "idle" };
    const data = JSON.parse(raw) as { sheet?: unknown; source?: unknown };
    const sheet = WorksheetSchema.safeParse(data.sheet);
    const source = data.source === "pyq" ? "pyq" : "practice";
    return sheet.success ? { status: "ready", sheet: sheet.data, source } : { status: "idle" };
  } catch {
    return { status: "idle" };
  }
}

/** Exam Prep: a practice worksheet, or the student's own past-paper questions solved. */
export function Worksheet({ lesson }: { lesson: Lesson }) {
  const [state, setState] = useState<State>(() =>
    typeof window === "undefined" ? { status: "idle" } : loadCached(lesson.meta),
  );
  const [tab, setTab] = useState<WorksheetMode["mode"]>("practice");
  const [size, setSize] = useState<(typeof PRACTICE_SIZES)[number]>(6);
  const [marks, setMarks] = useState<Record<number, SelfMark>>({});

  async function build(mode: WorksheetMode) {
    setState({ status: "loading", mode: mode.mode });
    setMarks({});
    try {
      const res = await apiFetch("/api/worksheet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson, mode }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        worksheet?: unknown;
        kind?: string;
      } | null;
      const sheet = WorksheetSchema.safeParse(body?.worksheet);
      if (body?.ok && sheet.success) {
        setState({ status: "ready", sheet: sheet.data, source: mode.mode });
        try {
          localStorage.setItem(
            cacheKey(lesson.meta),
            JSON.stringify({ sheet: sheet.data, source: mode.mode }),
          );
        } catch {
          // Storage full or blocked: the worksheet just won't survive a reload.
        }
        return;
      }
      const kind = (body?.kind ?? "unavailable") as LessonErrorKind;
      const copy = errorCopy[kind] ?? errorCopy.unavailable;
      setState({ status: "error", title: copy.title, message: copy.message, retry: mode });
    } catch {
      const copy = navigator.onLine ? errorCopy.unavailable : errorCopy.offline;
      setState({ status: "error", title: copy.title, message: copy.message, retry: mode });
    }
  }

  function mark(i: number, value: SelfMark) {
    if (state.status !== "ready" || marks[i]) return;
    const next = { ...marks, [i]: value };
    setMarks(next);
    const questions = state.sheet.questions;
    if (Object.keys(next).length === questions.length) {
      // Saved like a quiz attempt, in marks, so the dashboard can spot weak topics.
      const { meta } = lesson;
      void recordQuizAttempt({
        lessonId: `${lessonId(meta)}:worksheet`,
        subject: meta.subject,
        chapter: meta.chapter,
        topic: meta.topic,
        level: meta.level,
        duration: meta.durationMin,
        title: `${meta.title} (worksheet)`,
        score: questions.reduce((s, q, j) => s + marksEarned(q.marks, next[j]), 0),
        total: questions.reduce((s, q) => s + q.marks, 0),
      }).catch(() => undefined);
    }
  }

  if (state.status === "ready") {
    const questions = state.sheet.questions;
    const total = questions.reduce((s, q) => s + q.marks, 0);
    const earned = questions.reduce(
      (s, q, i) => s + (marks[i] ? marksEarned(q.marks, marks[i]) : 0),
      0,
    );
    const marked = Object.keys(marks).length;
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {state.source === "pyq" ? "Your past-paper questions, solved." : "Practice worksheet."}{" "}
          {questions.length} questions · {total} marks. Try each one on paper first, then open the
          model answer and mark yourself honestly.
        </p>
        {questions.map((q, i) => (
          <WorksheetQuestionCard
            key={`${i}-${q.question.slice(0, 20)}`}
            question={q}
            index={i}
            mark={marks[i]}
            onMark={(m) => mark(i, m)}
          />
        ))}
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <p className="font-semibold">
            {marked === questions.length
              ? `You scored ${earned} / ${total} marks (${Math.round((earned / total) * 100)}%).`
              : `Marked ${marked} of ${questions.length} · ${earned} marks so far`}
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ status: "idle" });
              setMarks({});
              try {
                localStorage.removeItem(cacheKey(lesson.meta));
              } catch {
                // Nothing cached.
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            New worksheet
          </button>
        </div>
      </div>
    );
  }

  const busy = state.status === "loading";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div role="tablist" aria-label="Worksheet type" className="flex flex-wrap gap-2">
        {(
          [
            ["practice", "Practice worksheet"],
            ["pyq", "Solve my past paper"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === value
                ? "bg-primary text-primary-fg"
                : "border border-border hover:bg-surface-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "practice" ? (
        <div className="flex flex-col gap-3" role="tabpanel">
          <p className="text-sm text-muted">
            End-semester style questions on this topic, from 2-mark definitions to 10-mark
            numericals, each with a model answer and what examiners give marks for.
          </p>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-2 text-sm font-semibold">How many questions?</legend>
            {PRACTICE_SIZES.map((n) => (
              <label
                key={n}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold ${
                  size === n ? "border-primary bg-primary-soft text-primary" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="worksheet-size"
                  value={n}
                  checked={size === n}
                  onChange={() => setSize(n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            disabled={busy}
            onClick={() => build({ mode: "practice", count: size })}
            className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? "Writing your worksheet…" : `Make a ${size}-question worksheet`}
          </button>
        </div>
      ) : (
        <PastPaperInput busy={busy} onSolve={(questions) => build({ mode: "pyq", questions })} />
      )}

      {busy && (
        <p className="animate-pulse text-sm text-muted" aria-live="polite">
          The examiner is writing model answers. This takes about 20–40 seconds…
        </p>
      )}
      {state.status === "error" && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm"
        >
          <p className="font-semibold">{state.title}</p>
          <p>{state.message}</p>
          <button
            type="button"
            onClick={() => build(state.retry)}
            className="w-fit rounded-full border border-border bg-surface px-4 py-1.5 font-semibold hover:bg-surface-2"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
