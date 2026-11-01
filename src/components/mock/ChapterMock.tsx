"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { saveMockResult } from "@/components/mock/engine";
import { GenerateStep, type MockSetup } from "@/components/mock/GenerateStep";
import { usePapers } from "@/components/mock/usePapers";
import type { TopicLesson } from "@/lib/chapter/extras";
import { toSubject, type CustomSubjectPayload } from "@/lib/custom/customSubject";
import type { MockAnswer } from "@/lib/mock/grade";
import type { Paper } from "@/lib/mock/paper";
import { minutesFor, papersFor, stylesFor } from "@/lib/mock/plan";
import { scopeTree } from "@/lib/mock/scope";
import { clearSession, restoreSession, saveSession, type MockSession } from "@/lib/mock/session";
import type { MockSettings } from "@/lib/storage/db";
import { findSubject } from "@/lib/subjects";

const loading = () => (
  <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
);
const MockRunner = dynamic(() => import("@/components/mock/MockRunner").then((m) => m.MockRunner), {
  ssr: false,
  loading,
});
const MockResults = dynamic(
  () => import("@/components/mock/MockResults").then((m) => m.MockResults),
  { ssr: false, loading },
);

const CHAPTER_MARKS = [10, 20, 30] as const;

type Phase =
  | { name: "setup" }
  | { name: "writing"; setup: MockSetup }
  | { name: "taking"; session: MockSession }
  | { name: "results"; session: MockSession; answers: Record<string, MockAnswer> };

/**
 * The mock test at the end of a whole-chapter lesson: the same engine as Mock Tests (your paper
 * pattern, checked questions, AI marking), on this chapter's topics, with fewer choices.
 */
export function ChapterMock({
  custom,
  subjectId,
  chapterId,
  chapterName,
  topics,
}: {
  custom?: CustomSubjectPayload;
  subjectId: string;
  chapterId: string;
  chapterName: string;
  topics: TopicLesson[];
}) {
  const subject = useMemo(
    () => (custom ? toSubject(custom) : findSubject(subjectId)),
    [custom, subjectId],
  );
  const { papers, reload } = usePapers();
  const mine = papersFor(papers, subjectId);
  const styles = stylesFor(mine);
  const style: MockSettings["style"] = styles.includes("internal")
    ? "internal"
    : (styles[0] ?? "default");
  const [marks, setMarks] = useState<number>(20);
  const ids = useMemo(() => topics.map((t) => t.topicId), [topics]);
  // A chapter test that was being taken when the page closed (same subject and topics).
  const [phase, setPhase] = useState<Phase>(() => {
    const r = restoreSession(
      "chapter",
      (s) => s.subject === subjectId && s.scope.ids.join() === topics.map((t) => t.topicId).join(),
    );
    if (r?.state === "running") return { name: "taking", session: r.session };
    if (r?.state === "expired")
      return { name: "results", session: r.session, answers: r.session.answers };
    return { name: "setup" };
  });
  const top = useRef<HTMLDivElement>(null);

  if (!subject) return null;
  const tree = scopeTree(subject);
  const known = new Set(tree.units.flatMap((u) => u.topics.map((t) => t.id)));
  const scopeTopics = topics
    .filter((t) => known.has(t.topicId))
    .map((t) => ({ id: t.topicId, name: t.name, unitId: chapterId }));
  const minutes = minutesFor(marks, mine, style);

  function startWriting() {
    if (!subject) return;
    const settings: MockSettings = { marks, minutes, style, difficulty: "mixed", pyqRepeat: false };
    setPhase({
      name: "writing",
      setup: {
        entry: { subject, ...(custom ? { custom } : {}) },
        topics: scopeTopics,
        scope: { level: "topics", ids, label: chapterName },
        settings,
        title: chapterName,
      },
    });
  }

  function begin(setup: MockSetup, paper: Paper) {
    const now = Date.now();
    const session: MockSession = {
      version: 1,
      subject: subjectId,
      origin: "chapter",
      scope: setup.scope,
      settings: setup.settings,
      paper,
      answers: {},
      review: [],
      startedAt: now,
      endsAt: now + setup.settings.minutes * 60_000,
    };
    saveSession(session);
    setPhase({ name: "taking", session });
    top.current?.scrollIntoView({ block: "start" });
  }

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-4" data-testid="mock-test">
      {phase.name === "setup" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            A timed paper on this chapter&apos;s {scopeTopics.length}{" "}
            {scopeTopics.length === 1 ? "topic" : "topics"},{" "}
            {styles.length === 0
              ? "in a standard university pattern"
              : "in the pattern of your uploaded papers"}
            , marked with feedback.
          </p>
          <div role="radiogroup" aria-label="Test size" className="flex flex-wrap gap-2">
            {CHAPTER_MARKS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={marks === m}
                onClick={() => setMarks(m)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${marks === m ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
              >
                {m} marks · {minutesFor(m, mine, style)} min
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={scopeTopics.length === 0}
              onClick={startWriting}
              className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
            >
              Start the mock test
            </button>
            <Link
              href={`/mock-test?subject=${subjectId}`}
              className="text-sm font-semibold text-primary underline"
            >
              More options in Mock Tests
            </Link>
          </div>
        </div>
      )}
      {phase.name === "writing" && (
        <GenerateStep
          setup={phase.setup}
          papers={mine}
          onPapersChanged={reload}
          onReady={(p) => begin(phase.setup, p)}
          autoStart
        />
      )}
      {phase.name === "taking" && (
        <MockRunner
          session={phase.session}
          onSubmit={(answers) => {
            clearSession();
            setPhase({ name: "results", session: phase.session, answers });
          }}
        />
      )}
      {phase.name === "results" && (
        <MockResults
          paper={phase.session.paper}
          answers={phase.answers}
          tree={tree}
          subjectId={subjectId}
          onSave={(grades) =>
            saveMockResult({
              subjectId,
              title: chapterName,
              scope: phase.session.scope,
              settings: phase.session.settings,
              paper: phase.session.paper,
              answers: phase.answers,
              grades,
              tree,
            })
          }
          onRetake={startWriting}
          onDone={() => setPhase({ name: "setup" })}
        />
      )}
    </div>
  );
}
