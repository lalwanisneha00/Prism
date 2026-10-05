"use client";

import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/byok/apiFetch";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { speechSupported } from "@/components/audio/useSpeechPlayer";
import type { AudioRequest, AudioResponse } from "@/lib/audio/audioEvents";
import type { ChapterPlan } from "@/lib/audio/generateNarration";
import {
  buildTimeline,
  cleanForSpeech,
  splitSentences,
  type AudioChapter,
} from "@/lib/audio/timeline";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import type { Lesson } from "@/lib/schema";
import { lessonId } from "@/lib/storage/library";
import { getAudioPosition } from "@/lib/storage/progress";

type Phase =
  | { name: "idle" }
  | { name: "writing"; done: number; total: number }
  | { name: "ready"; short: boolean }
  | { name: "error"; kind: LessonErrorKind };

function readCache(key: string): AudioChapter[] | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AudioChapter[]) : null;
  } catch {
    return null;
  }
}

/** The lesson's outline narration: short, but available instantly and without the AI. */
function outlineChapters(lesson: Lesson): AudioChapter[] {
  return lesson.audioScript.map((c) => ({ ...c, text: cleanForSpeech(c.text) }));
}

/** "Listen to this lesson": writes a narration of the chosen length, then plays it. */
export function AudioLesson({ lesson }: { lesson: Lesson }) {
  const { topic, level, durationMin } = lesson.meta;
  const key = `prism-audio:${topic}:${level}:${durationMin}`;
  // A narration written earlier for this exact lesson is reused, not rewritten.
  const [chapters, setChapters] = useState<AudioChapter[]>(() => readCache(`${key}:script`) ?? []);
  const [phase, setPhase] = useState<Phase>(() =>
    chapters.length ? { name: "ready", short: false } : { name: "idle" },
  );
  const [supported] = useState(() => typeof window === "undefined" || speechSupported());
  const controller = useRef<AbortController | null>(null);
  const timeline = useMemo(() => buildTimeline(chapters), [chapters]);

  // Where the student stopped last time, possibly on another device (synced, in seconds).
  const positionId = lessonId(lesson.meta);
  const [syncedSeconds, setSyncedSeconds] = useState<number | null>(null);
  useEffect(() => {
    getAudioPosition(positionId)
      .then((p) => setSyncedSeconds(p?.seconds ?? 0))
      .catch(() => setSyncedSeconds(0));
  }, [positionId]);

  useEffect(() => {
    const pending = controller;
    return () => pending.current?.abort();
  }, []);

  // Progress of the current narration, kept so "Try again" resumes instead of starting over.
  const plan = useRef<ChapterPlan[] | null>(null);
  const written = useRef<AudioChapter[]>([]);

  async function call(body: AudioRequest, signal: AbortSignal): Promise<AudioResponse> {
    const res = await apiFetch("/api/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    return (await res.json()) as AudioResponse;
  }

  async function write() {
    controller.current?.abort();
    const signal = (controller.current = new AbortController()).signal;
    if (phase.name === "ready") {
      // A fresh narration (e.g. after the short summary): start from scratch.
      plan.current = null;
      written.current = [];
    }
    setChapters([...written.current]);
    try {
      if (!plan.current) {
        setPhase({ name: "writing", done: 0, total: lesson.audioScript.length });
        const outline = await call({ step: "outline", lesson }, signal);
        if (!outline.ok) return setPhase({ name: "error", kind: outline.kind });
        if (!("plan" in outline)) throw new Error("unexpected reply");
        plan.current = outline.plan;
      }
      const chapterPlan = plan.current;
      for (let i = written.current.length; i < chapterPlan.length; i++) {
        setPhase({ name: "writing", done: i, total: chapterPlan.length });
        const previousEnding = splitSentences(written.current[i - 1]?.text ?? "")
          .slice(-2)
          .join(" ");
        const res = await call(
          { step: "chapter", lesson, plan: chapterPlan, index: i, previousEnding },
          signal,
        );
        if (!res.ok) return setPhase({ name: "error", kind: res.kind });
        if (!("chapter" in res)) throw new Error("unexpected reply");
        written.current = [...written.current, res.chapter];
        setChapters(written.current);
      }
      try {
        localStorage.setItem(`${key}:script`, JSON.stringify(written.current));
      } catch {
        // Not cached: it will be written again next time.
      }
      setPhase({ name: "ready", short: false });
    } catch {
      if (signal.aborted) return;
      setPhase({ name: "error", kind: navigator.onLine ? "unavailable" : "offline" });
    }
  }

  function playShortVersion() {
    controller.current?.abort();
    setChapters(outlineChapters(lesson));
    setPhase({ name: "ready", short: true });
  }

  const showPlayer = chapters.length > 0;

  return (
    <section
      id="audio"
      aria-labelledby="audio-title"
      className="scroll-mt-20 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <h2 id="audio-title" className="text-xl font-bold tracking-tight">
        <Icon name="audio" /> Audio lesson
        <span className="ml-2 text-sm font-normal text-muted">about {durationMin} min</span>
      </h2>

      {!supported ? (
        <p className="mt-3 text-sm text-muted">
          This browser can&apos;t read text aloud. Try Chrome, Edge or Safari.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {phase.name === "idle" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={write}
                className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Create my {durationMin}-minute audio lesson
              </button>
              <button
                type="button"
                onClick={playShortVersion}
                className="text-sm font-semibold text-primary underline underline-offset-2"
              >
                or play a 1-minute summary now
              </button>
            </div>
          )}

          {phase.name === "writing" && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Writing chapter {Math.min(phase.done + 1, phase.total)} of {phase.total}…
              {chapters.length > 0 && " You can start listening already."}
            </p>
          )}

          {phase.name === "error" && (
            <div role="alert" className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <p className="font-semibold">{errorCopy[phase.kind].title}</p>
              <p className="text-muted">{errorCopy[phase.kind].message}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={write}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {chapters.length ? `Continue from chapter ${chapters.length + 1}` : "Try again"}
                </button>
                <button
                  type="button"
                  onClick={playShortVersion}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  Play the 1-minute summary instead
                </button>
              </div>
            </div>
          )}

          {phase.name === "ready" && phase.short && (
            <p className="text-sm text-muted">
              Playing the short summary.{" "}
              <button
                type="button"
                onClick={write}
                className="font-semibold text-primary underline underline-offset-2"
              >
                Create the full {durationMin}-minute version
              </button>
            </p>
          )}

          {showPlayer && syncedSeconds !== null && (
            <AudioPlayer
              key={phase.name === "ready" && phase.short ? "short" : "full"}
              chapters={chapters}
              timeline={timeline}
              complete={phase.name !== "writing"}
              resumeKey={`${key}:${phase.name === "ready" && phase.short ? "short" : "full"}:position`}
              positionId={positionId}
              title={lesson.meta.title}
              resumeSeconds={phase.name === "ready" && phase.short ? 0 : syncedSeconds}
            />
          )}
        </div>
      )}
    </section>
  );
}
