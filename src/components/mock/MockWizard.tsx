"use client";

import { useEffect, useMemo, useState } from "react";
import { GenerateStep, type MockSetup } from "@/components/mock/GenerateStep";
import { ScopeStep } from "@/components/mock/ScopeStep";
import { SettingsStep } from "@/components/mock/SettingsStep";
import { lessonFacts, loadMockPrefs } from "@/components/mock/engine";
import type { MockSubject } from "@/components/mock/useMockSubjects";
import type { Paper } from "@/lib/mock/paper";
import { papersFor, startingSettings, stylesFor, type PaperInfo } from "@/lib/mock/plan";
import {
  describeScope,
  scopeProblem,
  scopeTree,
  topicsInScope,
  type ScopeLevel,
} from "@/lib/mock/scope";
import type { HiddenByFlags } from "@/lib/syllabusFix/myFlags";
import type { MockSettings } from "@/lib/storage/db";

const STEPS = ["Subject", "Scope", "Pick", "Settings", "Generate"] as const;

export type WizardStart = {
  subjectId: string;
  level: ScopeLevel;
  picked: string[];
  settings?: MockSettings;
  /** Go straight to writing the paper (a retake). */
  generate?: boolean;
  /** The step to open at (0 = subject); by default settings, or generate for a retake. */
  step?: number;
};

/** The step-by-step flow: subject → how much → what → settings → generate. */
export function MockWizard({
  subjects,
  papers,
  hidden,
  start,
  onPapersChanged,
  onReady,
}: {
  subjects: readonly MockSubject[];
  papers: readonly PaperInfo[];
  hidden: HiddenByFlags;
  start?: WizardStart;
  onPapersChanged: () => void;
  onReady: (setup: MockSetup, paper: Paper) => void;
}) {
  const [step, setStep] = useState(start?.step ?? (start ? (start.generate ? 4 : 3) : 0));
  const [subjectId, setSubjectId] = useState(start?.subjectId ?? "");
  const [level, setLevel] = useState<ScopeLevel>(start?.level ?? "units");
  const [picked, setPicked] = useState<string[]>(start?.picked ?? []);
  const [settings, setSettings] = useState<MockSettings | null>(start?.settings ?? null);
  const [studied, setStudied] = useState<{ id: string; set: Set<string> } | null>(null);

  const entry = subjects.find((s) => s.subject.id === subjectId);
  const tree = useMemo(() => (entry ? scopeTree(entry.subject, hidden) : null), [entry, hidden]);
  const subjectPapers = useMemo(() => papersFor(papers, subjectId), [papers, subjectId]);
  const styles = stylesFor(subjectPapers);

  // Which topics have a lesson on this device (for the "not studied yet" note).
  useEffect(() => {
    if (!subjectId) return;
    let alive = true;
    void lessonFacts(subjectId).then((f) => alive && setStudied({ id: subjectId, set: f.studied }));
    return () => {
      alive = false;
    };
  }, [subjectId]);

  // The last settings used for this subject (or sensible ones).
  useEffect(() => {
    if (!subjectId || settings) return;
    let alive = true;
    void loadMockPrefs(subjectId).then(
      (saved) => alive && setSettings(startingSettings(saved, styles)),
    );
    return () => {
      alive = false;
    };
  }, [subjectId, settings, styles]);

  const problem = tree ? scopeProblem(tree, level, picked) : "Pick a subject.";
  const canGo = [Boolean(entry), true, !problem, Boolean(settings), false];

  const setup: MockSetup | null =
    entry && tree && settings && !problem
      ? {
          entry,
          topics: topicsInScope(tree, level, picked),
          scope: {
            level,
            ids: level === "subject" ? [] : picked,
            label: describeScope(tree, level, picked),
          },
          settings,
          title: `${entry.subject.name}: ${describeScope(tree, level, picked)}`,
        }
      : null;

  return (
    <div className="flex flex-col gap-5" data-testid="mock-wizard">
      <ol className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Steps">
        {STEPS.map((name, i) => (
          <li key={name}>
            <button
              type="button"
              disabled={i > step && !canGo.slice(0, i).every(Boolean)}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1 ${i === step ? "bg-primary text-primary-fg" : i < step ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted"} disabled:opacity-50`}
            >
              {i + 1}. {name}
            </button>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
        {step === 0 && (
          <fieldset className="flex flex-col gap-2" data-testid="mock-subjects">
            <legend className="mb-2 font-semibold">Pick one subject</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {subjects.map((s) => {
                const n = papers.filter((p) => p.subject === s.subject.id).length;
                return (
                  <button
                    key={s.subject.id}
                    type="button"
                    role="radio"
                    aria-checked={subjectId === s.subject.id}
                    onClick={() => {
                      if (s.subject.id !== subjectId) {
                        setSubjectId(s.subject.id);
                        setPicked([]);
                        setSettings(null);
                      }
                      setStep(1);
                    }}
                    className={`rounded-xl border p-3 text-left ${subjectId === s.subject.id ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"}`}
                  >
                    <span className="block font-semibold">{s.subject.name}</span>
                    <span className="block text-xs text-muted">
                      {s.custom ? "Your subject" : s.subject.field}
                      {n ? ` · ${n} ${n === 1 ? "paper" : "papers"}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {(step === 1 || step === 2) && tree && entry && (
          <ScopeStep
            part={step === 1 ? "level" : "pick"}
            tree={tree}
            level={level}
            picked={picked}
            studied={studied?.id === subjectId ? studied.set : null}
            subjectId={subjectId}
            onLevel={(l) => {
              setLevel(l);
              setPicked([]);
              setStep(l === "subject" ? 1 : 2);
            }}
            onPicked={setPicked}
          />
        )}

        {step === 3 && settings && (
          <SettingsStep
            settings={settings}
            styles={styles}
            papers={subjectPapers}
            onChange={setSettings}
          />
        )}

        {step === 4 && setup && (
          <GenerateStep
            key={JSON.stringify([setup.scope, setup.settings])}
            setup={setup}
            papers={subjectPapers}
            onPapersChanged={onPapersChanged}
            onReady={(paper) => onReady(setup, paper)}
            autoStart={Boolean(start?.generate)}
          />
        )}

        {step > 0 && step < 4 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep(step === 3 && level === "subject" ? 1 : step - 1)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={step >= 2 ? !canGo[step] || (step === 2 && Boolean(problem)) : false}
              onClick={() => setStep(step === 1 && level === "subject" ? 3 : step + 1)}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-fg disabled:opacity-60"
            >
              Next
            </button>
            {step === 2 && problem && <span className="text-sm text-muted">{problem}</span>}
          </div>
        )}
      </section>
    </div>
  );
}
