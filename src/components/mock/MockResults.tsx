"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import { gradePaper } from "@/components/mock/engine";
import {
  breakdown,
  selfGrade,
  type MockAnswer,
  type QuestionGrade,
  type Tally,
} from "@/lib/mock/grade";
import { sourceLabel, type Paper } from "@/lib/mock/paper";
import { questionTypeLabel } from "@/lib/mock/pattern";
import type { ScopeTree } from "@/lib/mock/scope";

/**
 * The marked paper: total, split by unit and topic, weakest topics with a link to study them,
 * and every question with the student's answer, the marks, feedback, model answer and scheme.
 * Written answers the AI couldn't mark are marked by the student ticking the scheme's points.
 */
export function MockResults({
  paper,
  answers,
  tree,
  subjectId,
  saved: savedGrades,
  onSave,
  onRetake,
  onDone,
}: {
  paper: Paper;
  answers: Record<string, MockAnswer>;
  tree: ScopeTree;
  subjectId: string;
  /** Grades of a saved result (review): shown as they are, nothing is marked again. */
  saved?: Record<string, QuestionGrade>;
  onSave?: (grades: Record<string, QuestionGrade>) => Promise<void>;
  onRetake: () => void;
  onDone: () => void;
}) {
  const [grades, setGrades] = useState<Record<string, QuestionGrade> | null>(savedGrades ?? null);
  const [selfMark, setSelfMark] = useState<string[]>([]);
  const [ticks, setTicks] = useState<Record<string, number[]>>({});
  const [waiting, setWaiting] = useState<number | null>(null);
  const [saved, setSaved] = useState(Boolean(savedGrades));
  const ran = useRef(false);

  useEffect(() => {
    if (savedGrades || ran.current) return;
    ran.current = true;
    void gradePaper(paper, answers, setWaiting).then(async (r) => {
      setWaiting(null);
      setGrades(r.grades);
      setSelfMark(r.selfMark);
      if (r.selfMark.length === 0 && onSave) {
        await onSave(r.grades).catch(() => undefined);
        setSaved(true);
      }
    });
  }, [paper, answers, savedGrades, onSave]);

  if (!grades)
    return (
      <p role="status" className="animate-pulse text-sm" data-testid="mock-marking">
        {waiting ? `The free AI is busy; trying again in ${waiting} s…` : "Marking your answers…"}
      </p>
    );

  const all = { ...grades };
  for (const id of selfMark) {
    const q = paper.sections.flatMap((s) => s.questions).find((x) => x.id === id);
    if (q) all[id] = selfGrade(q, ticks[id] ?? []);
  }
  const b = breakdown(paper, answers, all, tree);
  const pct = b.total ? Math.round((100 * b.score) / b.total) : 0;
  const unitOf = new Map(tree.units.map((u) => [u.id, u]));

  async function saveSelf() {
    if (!onSave) return;
    await onSave(all).catch(() => undefined);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5" data-testid="mock-results">
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">{paper.title}</p>
        <p className="text-3xl font-bold" data-testid="mock-score">
          {b.score} / {b.total} <span className="text-lg text-muted">({pct}%)</span>
        </p>
        {selfMark.length > 0 && !saved && (
          <p className="text-sm">
            The AI couldn&apos;t mark {selfMark.length} written{" "}
            {selfMark.length === 1 ? "answer" : "answers"}. Tick the points you covered below, then
            save.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {selfMark.length > 0 && !saved && (
            <button
              type="button"
              onClick={() => void saveSelf()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
            >
              Save my result
            </button>
          )}
          {saved && onSave && (
            <span className="rounded-full bg-success/15 px-3 py-2 text-sm font-semibold">
              ✓ Result saved
            </span>
          )}
          <button
            type="button"
            onClick={onRetake}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Retake (new paper)
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </section>

      {b.weakest.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="weak-title">
          <h2 id="weak-title" className="text-xl font-bold">
            Weakest areas
          </h2>
          <ul className="flex flex-col gap-2">
            {b.weakest.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
              >
                <span>
                  <strong>{t.name}</strong>{" "}
                  <span className="text-muted">
                    · Unit {unitOf.get(t.unitId)?.number ?? "?"} · {t.score}/{t.total}
                  </span>
                </span>
                <Link
                  href={`/start?${new URLSearchParams({ subject: subjectId, chapter: t.unitId, topic: t.id })}`}
                  className="font-semibold text-primary underline"
                >
                  Study this
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <TallyTable
          title="By unit"
          rows={b.byUnit.map((u) => ({ ...u, name: `Unit ${u.number}: ${u.name}` }))}
        />
        <TallyTable title="By topic" rows={b.byTopic} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="answers-title">
        <h2 id="answers-title" className="text-xl font-bold">
          Your answers
        </h2>
        {paper.sections.map((s) => (
          <div key={s.id} className="flex flex-col gap-3">
            <h3 className="font-semibold">
              {s.name}
              {s.attempt ? (
                <span className="text-sm font-normal text-muted">
                  {" "}
                  · best {s.attempt} of {s.questions.length} count
                </span>
              ) : null}
            </h3>
            <ol className="flex flex-col gap-3">
              {s.questions.map((q) => {
                const a = answers[q.id] ?? {};
                const g = all[q.id];
                const self = selfMark.includes(q.id) && !saved;
                return (
                  <li
                    key={q.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
                  >
                    <p className="text-xs font-semibold text-muted uppercase">
                      {questionTypeLabel[q.type]} · {sourceLabel[q.source]} · {g?.marks ?? 0} /{" "}
                      {q.marks}
                    </p>
                    <Markdown>{q.question}</Markdown>
                    {q.type === "mcq" ? (
                      <ul className="grid gap-1">
                        {q.options?.map((o, k) => (
                          <li
                            key={`${k}-${o}`}
                            className={`rounded-lg border p-2 ${o === q.answer ? "border-success bg-success/10" : a.picked === o ? "border-danger bg-danger/10" : "border-border"}`}
                          >
                            <Markdown>{o}</Markdown>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        <p className="font-semibold">Your answer</p>
                        <p className="rounded-lg bg-surface-2 p-2 whitespace-pre-wrap">
                          {a.written?.trim() || "Not answered."}
                        </p>
                        {g?.feedback && (
                          <p>
                            <strong>Feedback:</strong> {g.feedback}
                          </p>
                        )}
                        <details>
                          <summary className="cursor-pointer font-semibold">
                            Model answer and marking scheme
                          </summary>
                          <div className="mt-2 flex flex-col gap-2">
                            <Markdown>{q.answer}</Markdown>
                            <ul className="flex flex-col gap-1">
                              {q.scheme.map((p, k) => (
                                <li key={`${k}-${p.point}`} className="flex items-start gap-2">
                                  {self ? (
                                    <input
                                      type="checkbox"
                                      className="mt-1"
                                      aria-label={`I covered: ${p.point}`}
                                      checked={(ticks[q.id] ?? []).includes(k)}
                                      onChange={(e) =>
                                        setTicks((t) => ({
                                          ...t,
                                          [q.id]: e.target.checked
                                            ? [...(t[q.id] ?? []), k]
                                            : (t[q.id] ?? []).filter((x) => x !== k),
                                        }))
                                      }
                                    />
                                  ) : (
                                    <span aria-hidden>{g?.met?.includes(k) ? "✓" : "•"}</span>
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <Markdown>{p.point}</Markdown>
                                  </span>
                                  <span className="text-muted">({p.marks})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}

function TallyTable({ title, rows }: { title: string; rows: readonly Tally[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1">
            <span className="flex justify-between gap-2">
              <span className="min-w-0">{r.name}</span>
              <span className="shrink-0 tabular-nums">
                {r.score}/{r.total}
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full bg-primary"
                style={{ width: `${r.total ? (100 * r.score) / r.total : 0}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
