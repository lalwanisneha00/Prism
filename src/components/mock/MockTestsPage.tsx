"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { saveMockResult } from "@/components/mock/engine";
import type { MockSetup } from "@/components/mock/GenerateStep";
import { MockWizard, type WizardStart } from "@/components/mock/MockWizard";
import { PastMocks } from "@/components/mock/PastMocks";
import { PatternBanner } from "@/components/mock/PatternBanner";
import { useMockSubjects, type MockSubject } from "@/components/mock/useMockSubjects";
import { usePapers } from "@/components/mock/usePapers";
import type { MockAnswer, QuestionGrade } from "@/lib/mock/grade";
import type { Paper } from "@/lib/mock/paper";
import { scopeTree } from "@/lib/mock/scope";
import { clearSession, restoreSession, saveSession, type MockSession } from "@/lib/mock/session";
import type { MockResult, MockSettings } from "@/lib/storage/db";
import { findSubject } from "@/lib/subjects";

const loading = () => (
  <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
);
// The runner and results load only when a test starts (smaller page to open).
const MockRunner = dynamic(() => import("@/components/mock/MockRunner").then((m) => m.MockRunner), {
  ssr: false,
  loading,
});
const MockResults = dynamic(
  () => import("@/components/mock/MockResults").then((m) => m.MockResults),
  { ssr: false, loading },
);

type Phase =
  | { name: "setup"; start?: WizardStart }
  | { name: "taking"; session: MockSession }
  | {
      name: "results";
      session: Pick<MockSession, "subject" | "paper" | "scope" | "settings">;
      answers: Record<string, MockAnswer>;
      saved?: Record<string, QuestionGrade>;
    };

/** The Mock Tests page: the paper-pattern banner, the step-by-step setup, the test, the results. */
export default function MockTestsPage({ linked }: { linked?: string }) {
  const { list, loaded, hasProfile, hidden } = useMockSubjects(linked);
  const { papers, reload } = usePapers();
  // A test that was being taken when the page closed: offered to resume, or handed in if its
  // time ran out meanwhile (as an exam hall would).
  const [restored] = useState(() => restoreSession("page"));
  const [phase, setPhase] = useState<Phase>(() =>
    restored?.state === "expired"
      ? { name: "results", session: restored.session, answers: restored.session.answers }
      : { name: "setup" },
  );
  const [resume, setResume] = useState<{ session: MockSession; minutesLeft: number } | null>(
    restored?.state === "running" ? restored : null,
  );
  const [pastVersion, setPastVersion] = useState(0);

  const entryFor = useCallback(
    (subjectId: string): MockSubject | undefined => {
      const own = list.find((s) => s.subject.id === subjectId);
      if (own) return own;
      const subject = findSubject(subjectId);
      return subject ? { subject } : undefined;
    },
    [list],
  );

  function begin(setup: MockSetup, paper: Paper) {
    const now = Date.now();
    const session: MockSession = {
      version: 1,
      subject: setup.entry.subject.id,
      origin: "page",
      scope: setup.scope,
      settings: setup.settings,
      paper,
      answers: {},
      review: [],
      startedAt: now,
      endsAt: now + setup.settings.minutes * 60_000,
    };
    saveSession(session);
    setResume(null);
    setPhase({ name: "taking", session });
    window.scrollTo({ top: 0 });
  }

  const submit = useCallback((session: MockSession, answers: Record<string, MockAnswer>) => {
    clearSession();
    setPhase({ name: "results", session, answers });
    window.scrollTo({ top: 0 });
  }, []);

  function retake(
    subjectId: string,
    scope: MockSession["scope"] | undefined,
    chapter: string,
    settings?: MockSettings,
  ) {
    const level = scope?.level ?? (chapter === "multiple" ? "subject" : "units");
    const picked = scope?.ids ?? (chapter === "multiple" ? [] : [chapter]);
    setPhase({
      name: "setup",
      start: { subjectId, level, picked, ...(settings ? { settings, generate: true } : {}) },
    });
    window.scrollTo({ top: 0 });
  }

  if (phase.name === "taking")
    return (
      <MockRunner session={phase.session} onSubmit={(answers) => submit(phase.session, answers)} />
    );

  if (phase.name === "results") {
    const entry = entryFor(phase.session.subject);
    if (!entry) return <p className="text-sm text-muted">This subject is no longer available.</p>;
    const { session, answers } = phase;
    return (
      <MockResults
        paper={session.paper}
        answers={answers}
        tree={scopeTree(entry.subject)}
        subjectId={entry.subject.id}
        saved={phase.saved}
        onSave={
          phase.saved
            ? undefined
            : async (grades) => {
                await saveMockResult({
                  subjectId: entry.subject.id,
                  title: session.paper.title,
                  scope: session.scope,
                  settings: session.settings,
                  paper: session.paper,
                  answers,
                  grades,
                  tree: scopeTree(entry.subject),
                });
                setPastVersion((v) => v + 1);
              }
        }
        onRetake={() => retake(entry.subject.id, session.scope, "multiple", session.settings)}
        onDone={() => setPhase({ name: "setup" })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {resume && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning bg-warning/10 p-4 text-sm"
        >
          <span>
            You have a mock in progress: <strong>{resume.session.paper.title}</strong> (about{" "}
            {resume.minutesLeft} min left).
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase({ name: "taking", session: resume.session })}
              className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => {
                setResume(null);
                submit(resume.session, resume.session.answers);
              }}
              className="rounded-full border border-border px-4 py-2 font-semibold"
            >
              Hand it in
            </button>
          </span>
        </div>
      )}

      <PatternBanner subjects={list} papers={papers} subject={linked} onAdded={reload} />

      {!loaded ? (
        loading()
      ) : list.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-border p-5 text-sm"
          data-testid="mock-no-subjects"
        >
          {hasProfile ? (
            <p>No subjects to test in your semester yet. Add your subjects on the Subjects page.</p>
          ) : (
            <p>Set your branch and semester first, so Mock Tests can show your subjects.</p>
          )}
          <Link href="/subjects" className="mt-2 inline-block font-semibold text-primary underline">
            Go to Subjects
          </Link>
        </div>
      ) : (
        <MockWizard
          key={JSON.stringify(phase.start ?? linked ?? "")}
          subjects={list}
          papers={papers}
          hidden={hidden}
          start={
            phase.start ??
            (linked && list.some((s) => s.subject.id === linked)
              ? { subjectId: linked, level: "units", picked: [], step: 1 }
              : undefined)
          }
          onPapersChanged={reload}
          onReady={begin}
        />
      )}

      <PastMocks
        version={pastVersion}
        canOpen={(r) => Boolean(entryFor(r.subject))}
        onReview={(r) =>
          r.paper &&
          setPhase({
            name: "results",
            session: {
              subject: r.subject,
              paper: r.paper,
              scope: r.scope ?? { level: "subject", ids: [], label: r.title },
              settings: r.settings ?? {
                marks: r.total,
                minutes: r.minutes,
                style: "default",
                difficulty: "mixed",
                pyqRepeat: false,
              },
            },
            answers: r.answers ?? {},
            saved: r.grades ?? {},
          })
        }
        onRetake={(r: MockResult) => retake(r.subject, r.scope, r.chapter, r.settings)}
      />
    </div>
  );
}
