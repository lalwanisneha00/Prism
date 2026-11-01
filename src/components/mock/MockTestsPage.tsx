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
import type { Paper } from "@/lib/mock/paper";
import type { MockResult, MockSettings } from "@/lib/storage/db";
import { findSubject } from "@/lib/subjects";

const loading = () => (
  <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
);
// The paper and the saved-mock view load only when needed (smaller page to open).
const PaperFlow = dynamic(() => import("@/components/mock/PaperFlow").then((m) => m.PaperFlow), {
  ssr: false,
  loading,
});
const SavedMock = dynamic(() => import("@/components/mock/SavedMock").then((m) => m.SavedMock), {
  ssr: false,
  loading,
});

type Scope = MockResult["scope"] & {};
type Phase =
  | { name: "setup"; start?: WizardStart }
  | { name: "paper"; setup: MockSetup; paper: Paper }
  | {
      name: "view";
      result: MockResult & { paper: Paper };
      show: "paper" | "answers";
    };

/**
 * The Mock Tests page: the paper-pattern banner, the step-by-step setup, the mock as a printed
 * paper (written on paper, then self-marked with the answer sheet), and past mocks.
 */
export default function MockTestsPage({ linked }: { linked?: string }) {
  const { list, loaded, hasProfile, hidden } = useMockSubjects(linked);
  const { papers, reload } = usePapers();
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
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

  function retake(
    subjectId: string,
    scope: Scope | undefined,
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

  if (phase.name === "paper") {
    const { setup, paper } = phase;
    return (
      <PaperFlow
        paper={paper}
        subjectName={setup.entry.subject.name}
        scopeLabel={setup.scope.label}
        onSave={async (score, timeTakenSec) => {
          await saveMockResult({
            subjectId: setup.entry.subject.id,
            title: paper.title,
            scope: setup.scope,
            settings: setup.settings,
            paper,
            score,
            timeTakenSec,
          });
          setPastVersion((v) => v + 1);
        }}
        onRetake={() => retake(setup.entry.subject.id, setup.scope, "multiple", setup.settings)}
        onDone={() => setPhase({ name: "setup" })}
      />
    );
  }

  if (phase.name === "view") {
    const { result } = phase;
    return (
      <SavedMock
        result={result}
        subjectName={entryFor(result.subject)?.subject.name ?? result.title}
        show={phase.show}
        onShow={(show) => setPhase({ ...phase, show })}
        onRetake={() => retake(result.subject, result.scope, result.chapter, result.settings)}
        onBack={() => setPhase({ name: "setup" })}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
          onReady={(setup, paper) => {
            setPhase({ name: "paper", setup, paper });
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      <PastMocks
        version={pastVersion}
        canOpen={(r) => Boolean(entryFor(r.subject))}
        onView={(r, show) => {
          if (!r.paper) return;
          setPhase({ name: "view", result: { ...r, paper: r.paper }, show });
          window.scrollTo({ top: 0 });
        }}
        onRetake={(r: MockResult) => retake(r.subject, r.scope, r.chapter, r.settings)}
      />
    </div>
  );
}
