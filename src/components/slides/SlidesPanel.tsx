"use client";

import "katex/dist/katex.min.css";
import Link from "next/link";
import { useRef, useState } from "react";
import { LessonError } from "@/components/lesson/LessonError";
import type { LevelSlug } from "@/data/levels";
import { generateFile, GenerateError, type Progress } from "@/lib/slides/generate";
import { lengthLabel } from "@/lib/slides/build";
import { FORMATS, PURPOSES, PURPOSE_INFO, type Format, type Purpose } from "@/lib/slides/plan";
import { fileName } from "@/lib/slides/store";
import { THEMES, SPECTRUM } from "@/lib/slides/themes";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import type { StoredSlideFile } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

const LENGTHS = [10, 15, 20, 30];

export function downloadBlob(file: Pick<StoredSlideFile, "blob" | "title" | "format" | "purpose">) {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(file);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type State =
  | { status: "idle" }
  | { status: "working"; progress: Progress }
  | { status: "done"; file: StoredSlideFile }
  | { status: "error"; kind: LessonErrorKind | "empty" | "other"; message: string };

const pill = (on: boolean) =>
  `cursor-pointer rounded-xl border px-3 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"}`;

/**
 * "Make slides or a PDF instead": built from the same checked lesson, so it says what the lesson
 * says. It uses the subject, chapter, topics and level chosen above it in the lesson maker.
 */
export function SlidesPanel({
  subject,
  chapterId,
  topicIds,
  level,
  title,
}: {
  subject: Subject;
  chapterId: string;
  topicIds: string[];
  level: LevelSlug | undefined;
  /** The name for the file: the topic, or the chapter. */
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>("teach");
  const [format, setFormat] = useState<Format>("pptx");
  const [slides, setSlides] = useState(15);
  const [customLength, setCustomLength] = useState(false);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [state, setState] = useState<State>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  const oneSheet = purpose === "summary";
  const ready = topicIds.length > 0 && Boolean(chapterId);

  async function make() {
    if (!ready) return;
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setState({ status: "working", progress: { phase: "Starting", done: 0, total: 1 } });
    try {
      const file = await generateFile(
        {
          subject,
          chapterId,
          topicIds,
          level: level ?? "building-blocks",
          purpose,
          format,
          slides: oneSheet ? 1 : slides,
          themeId,
          title,
        },
        (progress) => setState({ status: "working", progress }),
        c.signal,
      );
      setState({ status: "done", file });
      downloadBlob(file);
    } catch (err) {
      if (c.signal.aborted) return setState({ status: "idle" });
      if (err instanceof GenerateError) {
        setState({ status: "error", kind: err.kind, message: err.message });
      } else {
        setState({
          status: "error",
          kind: "other",
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    }
  }

  return (
    <section
      aria-label="Make slides or a PDF instead"
      className="rounded-2xl border border-border bg-surface"
      data-testid="slides-panel"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold"
      >
        <span>Make slides or a PDF instead</span>
        <span className="text-sm font-normal text-muted">{open ? "Hide" : "Show options"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-5 border-t border-border p-5">
          <p className="text-sm text-muted">
            You get only the file, built from the same checked lesson (same sources and fact-check).
            Uses the subject, topics and level chosen above.
          </p>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">What is it for?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PURPOSES.map((p) => (
                <label key={p} className={pill(purpose === p)}>
                  <input
                    type="radio"
                    name="purpose"
                    className="sr-only"
                    checked={purpose === p}
                    onChange={() => setPurpose(p)}
                  />
                  <span className="block font-semibold">{PURPOSE_INFO[p].label}</span>
                  <span className="block text-xs text-muted">{PURPOSE_INFO[p].hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-sm font-semibold">Format</legend>
            {FORMATS.map((f) => (
              <label key={f} className={pill(format === f)}>
                <input
                  type="radio"
                  name="format"
                  className="sr-only"
                  checked={format === f}
                  onChange={() => setFormat(f)}
                />
                {f === "pptx" ? "PowerPoint (.pptx)" : "PDF"}
              </label>
            ))}
          </fieldset>

          {!oneSheet && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-semibold">About how long?</legend>
              <div className="flex flex-wrap items-center gap-2">
                {LENGTHS.map((n) => (
                  <label key={n} className={pill(!customLength && slides === n)}>
                    <input
                      type="radio"
                      name="length"
                      className="sr-only"
                      checked={!customLength && slides === n}
                      onChange={() => {
                        setCustomLength(false);
                        setSlides(n);
                      }}
                    />
                    {lengthLabel(n, format)}
                  </label>
                ))}
                <label className={pill(customLength)}>
                  <input
                    type="radio"
                    name="length"
                    className="sr-only"
                    checked={customLength}
                    onChange={() => setCustomLength(true)}
                  />
                  Other
                </label>
                {customLength && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Number of slides</span>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={slides}
                      onChange={(e) =>
                        setSlides(Math.min(60, Math.max(3, Number(e.target.value) || 3)))
                      }
                      className="w-20 rounded-xl border border-border bg-bg px-3 py-2"
                    />
                    slides
                  </label>
                )}
              </div>
              <p className="text-xs text-muted">
                A guide, not a rule: the result can be up to about 6 slides longer or shorter,
                whatever teaches the topic best.
              </p>
            </fieldset>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold">Look</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {THEMES.map((t) => (
                <label key={t.id} className={pill(themeId === t.id)}>
                  <input
                    type="radio"
                    name="theme"
                    className="sr-only"
                    checked={themeId === t.id}
                    onChange={() => setThemeId(t.id)}
                  />
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-14 flex-col justify-between overflow-hidden rounded-md border border-border p-2"
                    style={{ background: `#${t.bg}` }}
                  >
                    <span
                      style={{ color: `#${t.ink}`, fontFamily: t.headingFont, fontWeight: 700 }}
                    >
                      {t.name}
                    </span>
                    <span className="flex h-1.5 gap-0.5">
                      {t.detail === "spectrum-bar" ? (
                        SPECTRUM.map((c) => (
                          <span key={c} className="flex-1" style={{ background: `#${c}` }} />
                        ))
                      ) : (
                        <>
                          <span className="w-8" style={{ background: `#${t.accent}` }} />
                          <span className="w-3" style={{ background: `#${t.accent2}` }} />
                        </>
                      )}
                    </span>
                  </span>
                  <span className="block text-xs text-muted">{t.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void make()}
              disabled={!ready || state.status === "working"}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            >
              {state.status === "working" ? "Making your file…" : "Make my file"}
            </button>
            {state.status === "working" && (
              <button
                type="button"
                onClick={() => controller.current?.abort()}
                className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2"
              >
                Cancel
              </button>
            )}
            {!ready && (
              <span className="text-sm text-muted">
                Choose a chapter and at least one topic first.
              </span>
            )}
            <Link href="/slides" className="text-sm font-semibold text-primary underline">
              My slides and PDFs
            </Link>
          </div>

          <div aria-live="polite">
            {state.status === "working" && (
              <div className="flex flex-col gap-1" data-testid="slides-progress">
                <p className="text-sm font-semibold">{state.progress.phase}…</p>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={state.progress.total}
                  aria-valuenow={state.progress.done}
                >
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{
                      width: `${Math.round((state.progress.done / Math.max(1, state.progress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {state.status === "done" && (
              <p
                className="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-3 text-sm"
                data-testid="slides-done"
              >
                <span>Done: {state.file.slides} slides, saved in My slides and PDFs.</span>
                <button
                  type="button"
                  onClick={() => downloadBlob(state.file)}
                  className="font-semibold text-primary underline"
                >
                  Download again
                </button>
              </p>
            )}
            {state.status === "error" &&
              (state.kind === "empty" || state.kind === "other" ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
                >
                  {state.message}
                </p>
              ) : (
                <LessonError kind={state.kind} onRetry={() => void make()} />
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
