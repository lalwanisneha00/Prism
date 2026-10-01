"use client";

import { useEffect, useId, useRef } from "react";
import { useSpeechPlayer } from "@/components/audio/useSpeechPlayer";
import {
  chapterStart,
  formatClock,
  totalSeconds,
  type AudioChapter,
  type TimelineItem,
} from "@/lib/audio/timeline";

const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

const button =
  "rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

/** Play/pause, ±15 s, speed, voice, chapters and a transcript that follows the voice. */
export function AudioPlayer({
  chapters,
  timeline,
  complete,
  resumeKey,
}: {
  chapters: AudioChapter[];
  timeline: TimelineItem[];
  complete: boolean;
  resumeKey: string;
}) {
  const player = useSpeechPlayer(timeline, complete, resumeKey);
  const id = useId();
  const transcript = useRef<HTMLDivElement>(null);
  const current = timeline[Math.min(player.index, timeline.length - 1)];
  const elapsed = current ? current.start / player.rate : 0;
  const total = totalSeconds(timeline) / player.rate;
  const playing = player.status === "playing" || player.status === "waiting";

  // Keep the spoken sentence visible inside the transcript box (without scrolling the page).
  useEffect(() => {
    const box = transcript.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (box && el) box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight / 3;
  }, [player.index]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={playing ? player.pause : player.play}
          className="grid size-12 place-items-center rounded-full bg-primary text-xl text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={playing ? "Pause" : player.index > 0 ? "Resume" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          type="button"
          className={button}
          onClick={() => player.skip(-15)}
          aria-label="Back 15 seconds"
        >
          ↺ 15s
        </button>
        <button
          type="button"
          className={button}
          onClick={() => player.skip(15)}
          aria-label="Forward 15 seconds"
        >
          15s ↻
        </button>
        <p className="ml-auto font-mono text-sm" aria-live="off">
          {formatClock(elapsed)} / {complete ? "" : "~"}
          {formatClock(total)}
        </p>
      </div>

      {player.status === "idle" && player.index > 0 && (
        <p className="text-sm text-muted">
          You stopped at {formatClock(elapsed)} last time: press play to resume.
        </p>
      )}
      {player.status === "waiting" && (
        <p className="text-sm text-muted" role="status">
          Waiting for the next chapter to be written…
        </p>
      )}

      <input
        type="range"
        aria-label="Position in the audio lesson"
        min={0}
        max={Math.max(0, timeline.length - 1)}
        value={Math.min(player.index, Math.max(0, timeline.length - 1))}
        onChange={(e) => player.seek(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-speed`} className="flex flex-col gap-1 text-sm">
          Speed
          <select
            id={`${id}-speed`}
            value={player.rate}
            onChange={(e) => player.setRate(Number(e.target.value))}
            className="rounded-xl border border-border bg-surface px-3 py-2"
          >
            {speeds.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-voice`} className="flex flex-col gap-1 text-sm">
          Voice
          <select
            id={`${id}-voice`}
            value={player.voiceURI}
            onChange={(e) => player.setVoice(e.target.value)}
            className="rounded-xl border border-border bg-surface px-3 py-2"
          >
            <option value="">Browser default</option>
            {player.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label="Audio chapters">
        <ol className="flex flex-wrap gap-2">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => player.seek(chapterStart(timeline, i))}
                className={`${button} ${current?.chapter === i ? "border-primary bg-primary-soft text-primary" : ""}`}
              >
                {i + 1}. {c.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div
        ref={transcript}
        className="max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-4 leading-relaxed"
        aria-label="Transcript"
      >
        {chapters.map((c, ci) => (
          <p key={c.id} className="mb-3">
            <span className="mb-1 block text-sm font-semibold text-primary">
              {ci + 1}. {c.title}
            </span>
            {timeline.map((item, ti) =>
              item.chapter === ci ? (
                <span
                  key={ti}
                  aria-current={ti === player.index ? "true" : undefined}
                  onClick={() => player.seek(ti)}
                  className={`cursor-pointer rounded px-0.5 ${ti === player.index ? "bg-primary-soft text-fg" : "text-muted hover:text-fg"}`}
                >
                  {item.text}{" "}
                </span>
              ) : null,
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
