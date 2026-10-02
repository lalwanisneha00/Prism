"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { speechSupported } from "@/components/audio/useSpeechPlayer";
import type { AudioEvent } from "@/lib/audio/audioEvents";
import { buildTimeline, cleanForSpeech, type AudioChapter } from "@/lib/audio/timeline";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import { readNdjson } from "@/lib/readLessonStream";
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

  async function write() {
    controller.current?.abort();
    controller.current = new AbortController();
    setChapters([]);
    setPhase({ name: "writing", done: 0, total: lesson.audioScript.length });
    try {
      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson }),
        signal: controller.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const written: AudioChapter[] = [];
      let failed: LessonErrorKind | null = null;
      await readNdjson<AudioEvent>(res.body, (event) => {
        if (event.type === "chapter") {
          written[event.index] = event.chapter;
          setChapters([...written]);
          setPhase({ name: "writing", done: event.index + 1, total: event.total });
        } else if (event.type === "error") {
          failed = event.kind;
        }
      });
      if (failed) return setPhase({ name: "error", kind: failed });
      try {
        localStorage.setItem(`${key}:script`, JSON.stringify(written));
      } catch {
        // Not cached: it will be written again next time.
      }
      setPhase({ name: "ready", short: false });
    } catch {
      if (controller.current?.signal.aborted) return;
      setPhase({ name: "error", kind: navigator.onLine ? "unavailable" : "offline" });
    }
  }

  function playShortVersion() {
    setChapters(outlineChapters(lesson));
    setPhase({ name: "ready", short: true });
  }

  const showPlayer = chapters.length > 0 && (phase.name === "ready" || phase.name === "writing");

  return (
    <section
      id="audio"
      aria-labelledby="audio-title"
      className="scroll-mt-20 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <h2 id="audio-title" className="text-xl font-bold tracking-tight">
        <span aria-hidden="true">🎧 </span>Audio lesson
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
                  Try again
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
              complete={phase.name === "ready"}
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
