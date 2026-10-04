"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import type { LevelSlug } from "@/data/levels";
import { mergeRevision, type TopicLesson } from "@/lib/chapter/extras";
import { sectionText } from "@/lib/extract/types";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import { MOCK_LENGTHS, selfMarks, type MockQuestion, type MockTest } from "@/lib/mock/mockTest";
import { recordMockResult } from "@/lib/mock/results";
import { listLocalNotes } from "@/lib/notes/store";
import { splitPaper } from "@/lib/worksheet/splitPaper";

type Phase =
  | { name: "setup" }
  | { name: "making" }
  | { name: "taking"; test: MockTest; endsAt: number }
  | { name: "marking"; test: MockTest }
  | { name: "error"; kind: LessonErrorKind };

type Answer = { picked?: string; written?: string; ticked: number[] };

/**
 * A timed mock test for the chapter. Multiple choice is marked automatically; for written
 * and numerical answers the student ticks the points an examiner looks for.
 */
export function MockTestPanel({
  subjectId,
  chapterId,
  chapterName,
  level,
  topics,
}: {
  subjectId: string;
  chapterId: string;
  chapterName: string;
  level: LevelSlug;
  topics: TopicLesson[];
}) {
  const [minutes, setMinutes] = useState<(typeof MOCK_LENGTHS)[number]>(30);
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [saved, setSaved] = useState(false);
  const [now, setNow] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  async function start() {
    setPhase({ name: "making" });
    setAnswers({});
    setSaved(false);
    const sheet = mergeRevision(topics);
    const facts = [...sheet.keyPoints, ...sheet.formulas.map((f) => `Formula: $${f}$`)]
      .map((f) => f.slice(0, 400))
      .slice(0, 80);
    // Up to 20 questions from the student's previous-year papers, for style.
    const notes = await listLocalNotes().catch(() => []);
    const pyqs = notes
      .filter((n) => n.kind === "pyq" && (!n.subject || n.subject === subjectId))
      .flatMap((n) => splitPaper((n.sections ?? []).map(sectionText).join("\n")))
      .map((q) => q.slice(0, 500))
      .slice(0, 20);
    try {
      const res = await fetch("/api/mock-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: subjectId,
          chapter: chapterId,
          topics: topics.map((t) => t.topicId),
          level,
          minutes,
          facts,
          pyqs,
        }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (body && typeof body === "object" && "ok" in body && body.ok && "test" in body) {
        const startedAt = Date.now();
        setNow(startedAt);
        setPhase({
          name: "taking",
          test: body.test as MockTest,
          endsAt: startedAt + minutes * 60_000,
        });
        topRef.current?.scrollIntoView({ block: "start" });
        return;
      }
      const kind =
        body && typeof body === "object" && "kind" in body && body.kind === "rate-limit"
          ? "rate-limit"
          : "unavailable";
      setPhase({ name: "error", kind });
    } catch {
      setPhase({ name: "error", kind: navigator.onLine ? "unavailable" : "offline" });
    }
  }

  // The countdown: ticks every second and hands the paper in when time is up.
  const endsAt = phase.name === "taking" ? phase.endsAt : 0;
  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        clearInterval(timer);
        setPhase((p) => (p.name === "taking" ? { name: "marking", test: p.test } : p));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const set = (i: number, change: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [i]: { ...(a[i] ?? { ticked: [] }), ...change } }));

  function marksFor(q: MockQuestion, i: number): number {
    const a = answers[i];
    if (q.type === "mcq") return a?.picked === q.answer ? q.marks : 0;
    return selfMarks(q, a?.ticked.length ?? 0);
  }

  async function save(test: MockTest) {
    const byTopic = new Map<string, { score: number; total: number }>();
    test.questions.forEach((q, i) => {
      const e = byTopic.get(q.topic) ?? { score: 0, total: 0 };
      e.score += marksFor(q, i);
      e.total += q.marks;
      byTopic.set(q.topic, e);
    });
    const total = test.questions.reduce((s, q) => s + q.marks, 0);
    await recordMockResult({
      subject: subjectId,
      chapter: chapterId,
      level,
      minutes,
      title: chapterName,
      score: test.questions.reduce((s, q, i) => s + marksFor(q, i), 0),
      total,
      byTopic: [...byTopic].map(([topic, s]) => ({ topic, ...s })),
    }).catch(() => undefined);
    setSaved(true);
  }

  return (
    <div ref={topRef} className="flex scroll-mt-24 flex-col gap-4" data-testid="mock-test">
      {phase.name === "setup" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            A timed practice paper on this chapter, written from the lesson&apos;s fact-checked
            points {topics.length < 2 ? "" : `across all ${topics.length} topics`}. Previous-year
            papers you uploaded set its style.
          </p>
          <div role="radiogroup" aria-label="Test length" className="flex flex-wrap gap-2">
            {MOCK_LENGTHS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  minutes === m ? "border-primary bg-primary-soft text-primary" : "border-border"
                }`}
              >
                {m} min · ~{m} marks
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void start()}
            className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Start the mock test
          </button>
        </div>
      )}
      {phase.name === "making" && (
        <p role="status" className="animate-pulse text-sm">
          Writing your test…
        </p>
      )}
      {phase.name === "error" && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">{errorCopy[phase.kind].title}</p>
          <p className="text-muted">{errorCopy[phase.kind].message}</p>
          <button
            type="button"
            onClick={() => setPhase({ name: "setup" })}
            className="w-fit font-semibold text-primary underline"
          >
            Back
          </button>
        </div>
      )}
      {(phase.name === "taking" || phase.name === "marking") && (
        <TestPaper
          test={phase.test}
          marking={phase.name === "marking"}
          secondsLeft={
            phase.name === "taking" ? Math.max(0, Math.round((phase.endsAt - now) / 1000)) : 0
          }
          answers={answers}
          onAnswer={set}
          marksFor={marksFor}
          onSubmit={() =>
            phase.name === "taking" && setPhase({ name: "marking", test: phase.test })
          }
          onSave={() => void save(phase.test)}
          saved={saved}
          onAgain={() => setPhase({ name: "setup" })}
        />
      )}
    </div>
  );
}

function TestPaper({
  test,
  marking,
  secondsLeft,
  answers,
  onAnswer,
  marksFor,
  onSubmit,
  onSave,
  saved,
  onAgain,
}: {
  test: MockTest;
  marking: boolean;
  secondsLeft: number;
  answers: Record<number, Answer>;
  onAnswer: (i: number, change: Partial<Answer>) => void;
  marksFor: (q: MockQuestion, i: number) => number;
  onSubmit: () => void;
  onSave: () => void;
  saved: boolean;
  onAgain: () => void;
}) {
  const total = test.questions.reduce((s, q) => s + q.marks, 0);
  const score = test.questions.reduce((s, q, i) => s + marksFor(q, i), 0);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-sm">
        <p className="font-semibold">{test.title}</p>
        {marking ? (
          <p className="font-semibold" data-testid="mock-score">
            Score: {score} / {total}
          </p>
        ) : (
          <p aria-live="off" className="font-semibold tabular-nums" data-testid="mock-timer">
            ⏱ {mm}:{ss} left · {total} marks
          </p>
        )}
      </div>
      <ol className="flex flex-col gap-4">
        {test.questions.map((q, i) => {
          const a = answers[i] ?? { ticked: [] };
          return (
            <li
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-xs font-semibold text-muted uppercase">
                Q{i + 1} · {q.marks} {q.marks === 1 ? "mark" : "marks"} ·{" "}
                {q.type === "mcq" ? "multiple choice" : q.type}
              </p>
              <Markdown>{q.question}</Markdown>
              {q.type === "mcq" ? (
                <div className="grid gap-2">
                  {q.options?.map((o, k) => (
                    <label
                      key={`${k}-${o}`}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 ${
                        marking && o === q.answer
                          ? "border-success bg-success/10"
                          : marking && a.picked === o
                            ? "border-danger bg-danger/10"
                            : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`mock-${i}`}
                        disabled={marking}
                        checked={a.picked === o}
                        onChange={() => onAnswer(i, { picked: o })}
                        className="mt-1"
                      />
                      <Markdown className="min-w-0 flex-1">{o}</Markdown>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  aria-label={`Your answer to question ${i + 1}`}
                  disabled={marking}
                  value={a.written ?? ""}
                  onChange={(e) => onAnswer(i, { written: e.target.value })}
                  rows={q.type === "long" ? 6 : 3}
                  placeholder="Write your answer (or work it out on paper)"
                  className="w-full rounded-xl border border-border bg-bg p-3 text-sm"
                />
              )}
              {marking && (
                <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="font-semibold">
                    {marksFor(q, i)} / {q.marks}
                  </p>
                  {q.type !== "mcq" && (
                    <>
                      <p className="font-semibold">Model answer</p>
                      <Markdown>{q.answer}</Markdown>
                      <p className="font-semibold">Tick the points your answer covered</p>
                      {q.points.map((p, k) => (
                        <label key={`${k}-${p}`} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={a.ticked.includes(k)}
                            onChange={(e) =>
                              onAnswer(i, {
                                ticked: e.target.checked
                                  ? [...a.ticked, k]
                                  : a.ticked.filter((x) => x !== k),
                              })
                            }
                          />
                          <Markdown className="min-w-0 flex-1">{p}</Markdown>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {marking ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saved}
            onClick={onSave}
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg disabled:opacity-60"
          >
            {saved ? "✓ Result saved" : "Save my result"}
          </button>
          <button
            type="button"
            onClick={onAgain}
            className="rounded-full border border-border px-5 py-2.5 font-semibold"
          >
            Take another test
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Hand in my answers
        </button>
      )}
    </div>
  );
}
