"use client";

import { useEffect, useRef, useState } from "react";
import {
  analysePaper,
  generatePaper,
  MockError,
  saveMockPrefs,
  type GenProgress,
} from "@/components/mock/engine";
import type { MockSubject } from "@/components/mock/useMockSubjects";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import type { Paper } from "@/lib/mock/paper";
import {
  describePlan,
  patternForStyle,
  planPaper,
  styleNote,
  type PaperInfo,
} from "@/lib/mock/plan";
import type { ScopeTopic } from "@/lib/mock/scope";
import type { MockSettings } from "@/lib/storage/db";

export type MockSetup = {
  entry: MockSubject;
  topics: ScopeTopic[];
  scope: { level: "subject" | "units" | "topics"; ids: string[]; label: string };
  settings: MockSettings;
  title: string;
};

type State =
  | { name: "ready" }
  | { name: "reading-papers"; done: number; of: number }
  | { name: "writing"; progress: GenProgress }
  | { name: "error"; kind: LessonErrorKind };

/**
 * Step 5: the paper is written section by section while the student watches it fill in. Local
 * papers whose pattern hasn't been read yet are read first (once). Errors offer a retry and never
 * leave a blank screen.
 */
export function GenerateStep({
  setup,
  papers,
  onPapersChanged,
  onReady,
  autoStart = false,
}: {
  setup: MockSetup;
  papers: readonly PaperInfo[];
  onPapersChanged: () => void;
  onReady: (paper: Paper) => void;
  autoStart?: boolean;
}) {
  const [state, setState] = useState<State>({ name: "ready" });
  const abort = useRef<AbortController | null>(null);
  const { pattern } = patternForStyle(papers, setup.settings.style);
  const plan = planPaper(pattern, setup.settings.marks, setup.topics);

  async function run() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      void saveMockPrefs(setup.entry.subject.id, setup.settings);
      // Papers of this style on this device whose pattern hasn't been read yet: read them once.
      const style = setup.settings.style;
      const unread = papers.filter((p) => p.local && !p.pattern && p.kind === style);
      let list = papers;
      if (unread.length) {
        setState({ name: "reading-papers", done: 0, of: unread.length });
        const read = new Map<string, NonNullable<PaperInfo["pattern"]>>();
        for (const [i, p] of unread.entries()) {
          const got = await analysePaper(p.id).catch(() => undefined);
          if (got) read.set(p.id, got);
          setState({ name: "reading-papers", done: i + 1, of: unread.length });
        }
        list = papers.map((p) => (read.has(p.id) ? { ...p, pattern: read.get(p.id) } : p));
        onPapersChanged();
      }
      const chosen = patternForStyle(list, style);
      const paper = await generatePaper(
        {
          subjectId: setup.entry.subject.id,
          subjectName: setup.entry.subject.name,
          custom: setup.entry.custom,
          title: setup.title,
          plan: planPaper(chosen.pattern, setup.settings.marks, setup.topics),
          scope: setup.topics,
          settings: setup.settings,
          papers: list,
          styleNote: styleNote(style, chosen.fromPapers),
        },
        (progress) => setState({ name: "writing", progress }),
        controller.signal,
      );
      if (!controller.signal.aborted) onReady(paper);
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ name: "error", kind: err instanceof MockError ? err.kind : "unavailable" });
    }
  }

  // Asked to start straight away (a chapter mock, a retake): start on mount. Leaving the page
  // cancels the requests; a remount (React checks this in development) starts afresh.
  useEffect(() => {
    // Started on the next tick, so a remount's cleanup can cancel it before any request goes out.
    const t = autoStart ? setTimeout(() => void run(), 0) : undefined;
    return () => {
      clearTimeout(t);
      abort.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.name === "ready")
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {setup.settings.marks} marks · {setup.settings.minutes} min ·{" "}
          {plan.reduce((n, s) => n + s.slots.length, 0)} questions
        </p>
        <p className="text-sm">{describePlan(plan)}</p>
        <button
          type="button"
          onClick={() => void run()}
          className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Generate my paper
        </button>
      </div>
    );
  if (state.name === "reading-papers")
    return (
      <p role="status" className="animate-pulse text-sm">
        Reading the pattern of your uploaded papers ({state.done} of {state.of})…
      </p>
    );
  if (state.name === "error")
    return (
      <div role="alert" className="flex flex-col gap-2 text-sm">
        <p className="font-semibold">{errorCopy[state.kind].title}</p>
        <p className="text-muted">
          {state.kind === "bad-response"
            ? "Some questions still didn't pass the examiner's checks (syllabus, correctness or answer) after fixing, so we didn't show the paper. Trying again writes new questions."
            : errorCopy[state.kind].message}
        </p>
        <button
          type="button"
          onClick={() => void run()}
          className="w-fit font-semibold text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  const { progress } = state;
  const heading =
    progress.stage === "checking"
      ? progress.failing && progress.failing < progress.sections.reduce((n, s) => n + s.total, 0)
        ? `Checking ${progress.failing} rewritten ${progress.failing === 1 ? "question" : "questions"}…`
        : "An examiner is checking every question and answer…"
      : progress.stage === "fixing"
        ? `Fixing ${progress.failing} ${progress.failing === 1 ? "question" : "questions"} the examiner rejected…`
        : "Writing your paper…";
  return (
    <div className="flex flex-col gap-3" role="status" data-testid="mock-generating">
      <p className="font-semibold">{heading}</p>
      <ul className="flex flex-col gap-2">
        {progress.sections.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 text-sm">
            <span className="flex justify-between gap-2">
              <span>{s.name}</span>
              <span className="text-muted tabular-nums">
                {s.ready === s.total ? "✓ ready" : `${s.ready} of ${s.total} questions`}
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full bg-primary transition-all"
                style={{ width: `${(100 * s.ready) / s.total}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {progress.waiting
          ? `The free AI is busy; trying again in ${progress.waiting} s…`
          : "Every question is checked against your syllabus, and its answer by a separate examiner, before you see it."}
      </p>
    </div>
  );
}
