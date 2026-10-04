"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { speechSupported } from "@/components/audio/useSpeechPlayer";
import type { AudioRequest, AudioResponse } from "@/lib/audio/audioEvents";
import {
  buildTimeline,
  cleanForSpeech,
  splitSentences,
  type AudioChapter,
} from "@/lib/audio/timeline";
import type { TopicLesson } from "@/lib/chapter/extras";
import type { ChapterParts } from "@/lib/chapter/parts";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import { getAudioPosition } from "@/lib/storage/progress";

type Phase =
  | { name: "idle" }
  | { name: "writing"; topic: number; total: number }
  | { name: "ready"; short: boolean }
  | { name: "error"; kind: LessonErrorKind };

/** Markdown glue (intro, bridges, wrap-up) as plain spoken text. */
const speak = (md: string) =>
  cleanForSpeech(md.replace(/[*_#>`]/g, "").replace(/^\s*\d+\.\s+/gm, ""));

/**
 * One continuous audio lesson for the whole chapter, with a chapter per topic. The short
 * version is ready at once (each topic's built-in narration); the full version is written
 * topic by topic, so the student can start listening while the rest is prepared.
 */
export function ChapterAudio({
  id,
  title,
  minutes,
  parts,
  topics,
}: {
  /** The chapter lesson's id: the listening position is saved (and synced) under it. */
  id: string;
  title: string;
  minutes: number;
  parts: ChapterParts | null;
  topics: TopicLesson[];
}) {
  const cacheKey = `prism-chapter-audio:${id}`;
  const [chapters, setChapters] = useState<AudioChapter[]>(() => readCache(cacheKey));
  const [phase, setPhase] = useState<Phase>(() =>
    chapters.length ? { name: "ready", short: false } : { name: "idle" },
  );
  const [supported] = useState(() => typeof window === "undefined" || speechSupported());
  const [resumeSeconds, setResumeSeconds] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timeline = useMemo(() => buildTimeline(chapters), [chapters]);

  useEffect(() => {
    getAudioPosition(id)
      .then((p) => setResumeSeconds(p?.seconds ?? 0))
      .catch(() => setResumeSeconds(0));
  }, [id]);
  useEffect(() => () => controller.current?.abort(), []);

  const glue = (key: string, label: string, text: string | undefined): AudioChapter[] =>
    text ? [{ id: key, title: label, text: speak(text) }] : [];
  const bridgeAfter = (i: number) =>
    parts?.bridges.find((b) => b.from === topics[i]?.topicId && b.to === topics[i + 1]?.topicId)
      ?.text;

  function playShort() {
    controller.current?.abort();
    const list: AudioChapter[] = [
      ...glue("intro", "Introduction", parts?.intro.whyItMatters),
      ...topics.flatMap((t, i) => [
        ...t.lesson.audioScript.map((c, k) => ({
          id: `${t.topicId}-${k}`,
          title: `${i + 1}. ${t.name}${k ? ` (${k + 1})` : ""}`,
          text: cleanForSpeech(c.text),
        })),
        ...glue(`bridge-${i}`, "Next", bridgeAfter(i)),
      ]),
      ...glue("wrap", "Wrap-up", parts?.wrapUp.summary),
    ];
    setChapters(list);
    setPhase({ name: "ready", short: true });
  }

  async function call(body: AudioRequest, signal: AbortSignal): Promise<AudioResponse> {
    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    return (await res.json()) as AudioResponse;
  }

  async function writeFull() {
    controller.current?.abort();
    const signal = (controller.current = new AbortController()).signal;
    // Topics already written are kept, so "Continue" after a quota stop picks up where it was.
    const written = phase.name === "error" ? [...chapters] : [];
    const doneTopics = new Set(written.map((c) => c.id.split("~")[0]));
    if (written.length === 0)
      written.push(...glue("intro", "Introduction", parts?.intro.whyItMatters));
    setChapters([...written]);
    try {
      for (const [i, t] of topics.entries()) {
        if (doneTopics.has(t.topicId)) continue;
        setPhase({ name: "writing", topic: i, total: topics.length });
        const outline = await call({ step: "outline", lesson: t.lesson }, signal);
        if (!outline.ok)
          return setPhase({
            name: "error",
            kind: outline.kind === "invalid-request" ? "unavailable" : outline.kind,
          });
        if (!("plan" in outline)) throw new Error("unexpected reply");
        for (let k = 0; k < outline.plan.length; k++) {
          const previousEnding = splitSentences(written[written.length - 1]?.text ?? "")
            .slice(-2)
            .join(" ");
          const res = await call(
            { step: "chapter", lesson: t.lesson, plan: outline.plan, index: k, previousEnding },
            signal,
          );
          if (!res.ok)
            return setPhase({
              name: "error",
              kind: res.kind === "invalid-request" ? "unavailable" : res.kind,
            });
          if (!("chapter" in res)) throw new Error("unexpected reply");
          written.push({
            ...res.chapter,
            id: `${t.topicId}~${k}`,
            title: `${i + 1}. ${t.name}: ${res.chapter.title}`,
          });
          setChapters([...written]);
        }
        written.push(...glue(`bridge-${i}`, "Next", bridgeAfter(i)));
        setChapters([...written]);
      }
      written.push(...glue("wrap", "Wrap-up", parts?.wrapUp.summary));
      setChapters([...written]);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(written));
      } catch {
        // Not cached: it is written again next time.
      }
      setPhase({ name: "ready", short: false });
    } catch {
      if (signal.aborted) return;
      setPhase({ name: "error", kind: navigator.onLine ? "unavailable" : "offline" });
    }
  }

  return (
    <section
      aria-labelledby="chapter-audio"
      className="rounded-2xl border border-border bg-surface p-5"
      data-testid="chapter-audio"
    >
      <h2 id="chapter-audio" className="text-xl font-bold tracking-tight">
        <span aria-hidden="true">🎧 </span>Chapter audio
        <span className="ml-2 text-sm font-normal text-muted">about {minutes} min</span>
      </h2>
      {!supported ? (
        <p className="mt-3 text-sm text-muted">
          This browser can&apos;t read text aloud. Try Chrome, Edge or Safari.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {(phase.name === "idle" || (phase.name === "ready" && phase.short)) && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void writeFull()}
                className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
              >
                Create my {minutes}-minute chapter audio
              </button>
              {phase.name === "idle" && (
                <button
                  type="button"
                  onClick={playShort}
                  className="text-sm font-semibold text-primary underline"
                >
                  or play the short version now
                </button>
              )}
            </div>
          )}
          {phase.name === "writing" && (
            <p role="status" className="text-sm">
              Writing topic {phase.topic + 1} of {phase.total}…
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
                  onClick={() => void writeFull()}
                  className="font-semibold text-primary underline"
                >
                  {chapters.length > 1 ? "Continue writing" : "Try again"}
                </button>
                <button
                  type="button"
                  onClick={playShort}
                  className="font-semibold text-primary underline"
                >
                  Play the short version instead
                </button>
              </div>
            </div>
          )}
          {chapters.length > 0 && resumeSeconds !== null && (
            <AudioPlayer
              key={phase.name === "ready" && phase.short ? "short" : "full"}
              chapters={chapters}
              timeline={timeline}
              complete={phase.name !== "writing"}
              resumeKey={`${cacheKey}:${phase.name === "ready" && phase.short ? "short" : "full"}:position`}
              positionId={id}
              title={title}
              resumeSeconds={phase.name === "ready" && phase.short ? 0 : resumeSeconds}
            />
          )}
        </div>
      )}
    </section>
  );
}

function readCache(key: string): AudioChapter[] {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? (value as AudioChapter[]) : [];
  } catch {
    return [];
  }
}
