"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import { hasAnswer, type MockAnswer } from "@/lib/mock/grade";
import { sourceLabel } from "@/lib/mock/paper";
import { questionTypeLabel } from "@/lib/mock/pattern";
import { saveSession, secondsLeft, type MockSession } from "@/lib/mock/session";

/**
 * Taking a mock like a real online exam: a countdown, sections, a question palette (answered,
 * not answered, marked for review) and an automatic hand-in when time runs out. Every answer is
 * saved in this browser as it is written, so a refresh loses nothing.
 */
export function MockRunner({
  session: initial,
  onSubmit,
}: {
  session: MockSession;
  onSubmit: (answers: Record<string, MockAnswer>) => void;
}) {
  const paper = initial.paper;
  const questions = useMemo(
    () => paper.sections.flatMap((s) => s.questions.map((q) => ({ q, section: s }))),
    [paper],
  );
  const [answers, setAnswers] = useState<Record<string, MockAnswer>>(initial.answers);
  const [review, setReview] = useState<string[]>(initial.review);
  const [current, setCurrent] = useState(initial.current ?? questions[0]?.q.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const submitted = useRef(false);

  // Save after every change (a short pause while typing, so each key press doesn't write).
  useEffect(() => {
    const t = setTimeout(() => saveSession({ ...initial, answers, review, current }), 400);
    return () => clearTimeout(t);
  }, [initial, answers, review, current]);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit(answers);
  }, [answers, onSubmit]);
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);
  const timeUp = useCallback(() => submitRef.current(), []);

  const index = Math.max(
    0,
    questions.findIndex((x) => x.q.id === current),
  );
  const { q, section } = questions[index];
  const a = answers[q.id] ?? {};
  const set = (change: MockAnswer) =>
    setAnswers((all) => ({ ...all, [q.id]: { ...all[q.id], ...change } }));
  const marked = review.includes(q.id);
  const unanswered = questions.filter((x) => !hasAnswer(answers[x.q.id])).length;
  const go = (i: number) =>
    setCurrent(questions[Math.min(questions.length - 1, Math.max(0, i))].q.id);
  const number = (id: string) => questions.findIndex((x) => x.q.id === id) + 1;

  return (
    <div className="flex flex-col gap-4" data-testid="mock-runner">
      <div className="sticky top-[6.75rem] z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm shadow-sm lg:top-[5.75rem]">
        <p className="min-w-0 truncate font-semibold">{paper.title}</p>
        <div className="flex items-center gap-3">
          <MockTimer endsAt={initial.endsAt} onTimeUp={timeUp} />
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Submit
          </button>
        </div>
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Submit the test?"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-sm"
        >
          <span>
            {unanswered
              ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} not answered. `
              : ""}
            Hand in your paper now?
          </span>
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg"
          >
            Hand in my answers
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-full border border-border px-4 py-1.5 font-semibold"
          >
            Keep going
          </button>
        </div>
      )}

      <nav aria-label="Sections" className="flex flex-wrap gap-2">
        {paper.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={s.id === section.id ? "true" : undefined}
            onClick={() => setCurrent(s.questions[0].id)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${s.id === section.id ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
          >
            {s.name}
          </button>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <article
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
          aria-label={`Question ${index + 1}`}
        >
          {section.instructions || section.attempt ? (
            <p className="text-xs text-muted">
              {section.name}:{" "}
              {section.instructions ??
                `Answer any ${section.attempt} of ${section.questions.length}.`}
            </p>
          ) : null}
          <p className="text-xs font-semibold text-muted uppercase">
            Q{index + 1} · {q.marks} {q.marks === 1 ? "mark" : "marks"} ·{" "}
            {questionTypeLabel[q.type]}
            {q.source === "pyq-repeat" ? ` · ${sourceLabel["pyq-repeat"]}` : ""}
          </p>
          <Markdown>{q.question}</Markdown>
          {q.type === "mcq" ? (
            <div
              className="grid gap-2"
              role="radiogroup"
              aria-label={`Options for question ${index + 1}`}
            >
              {q.options?.map((o, k) => (
                <label
                  key={`${k}-${o}`}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 ${a.picked === o ? "border-primary bg-primary-soft" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name={`mock-${q.id}`}
                    checked={a.picked === o}
                    onChange={() => set({ picked: o })}
                    className="mt-1"
                  />
                  <Markdown className="min-w-0 flex-1">{o}</Markdown>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              aria-label={`Your answer to question ${index + 1}`}
              value={a.written ?? ""}
              onChange={(e) => set({ written: e.target.value.slice(0, 5000) })}
              rows={q.marks >= 5 ? 8 : 4}
              placeholder={
                q.type === "diagram" ? "Describe your diagram and its labels" : "Write your answer"
              }
              className="w-full rounded-xl border border-border bg-bg p-3 text-sm"
            />
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              aria-pressed={marked}
              onClick={() =>
                setReview((r) => (marked ? r.filter((x) => x !== q.id) : [...r, q.id]))
              }
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${marked ? "border-warning bg-warning/15" : "border-border"}`}
            >
              {marked ? "Marked for review" : "Mark for review"}
            </button>
            <button
              type="button"
              disabled={index === questions.length - 1}
              onClick={() => go(index + 1)}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </article>

        <aside
          aria-label="Question palette"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 lg:order-none"
          data-testid="mock-palette"
        >
          {paper.sections.map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted">{s.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.questions.map((x) => {
                  const done = hasAnswer(answers[x.id]);
                  const rev = review.includes(x.id);
                  return (
                    <button
                      key={x.id}
                      type="button"
                      aria-label={`Question ${number(x.id)}: ${rev ? "marked for review" : done ? "answered" : "not answered"}`}
                      aria-current={x.id === q.id ? "true" : undefined}
                      onClick={() => setCurrent(x.id)}
                      className={`h-9 w-9 rounded-lg border text-sm font-semibold tabular-nums ${rev ? "border-warning bg-warning/20" : done ? "border-success bg-success/15" : "border-border"} ${x.id === q.id ? "ring-2 ring-primary" : ""}`}
                    >
                      {number(x.id)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <ul className="flex flex-col gap-1 text-xs text-muted">
            <li>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-success/60" />
              Answered ({questions.length - unanswered})
            </li>
            <li>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-border" />
              Not answered ({unanswered})
            </li>
            <li>
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-warning/60" />
              Marked for review ({review.length})
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** The countdown: the only part that changes every second, so the paper doesn't re-render. */
const MockTimer = memo(function MockTimer({
  endsAt,
  onTimeUp,
}: {
  endsAt: number;
  onTimeUp: () => void;
}) {
  const [left, setLeft] = useState(() => secondsLeft(endsAt, Date.now()));
  useEffect(() => {
    const tick = () => {
      const s = secondsLeft(endsAt, Date.now());
      setLeft(s);
      if (s <= 0) {
        clearInterval(timer);
        onTimeUp();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [endsAt, onTimeUp]);
  const h = Math.floor(left / 3600);
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <p
      aria-live="off"
      className={`font-semibold tabular-nums ${left < 300 ? "text-danger" : ""}`}
      data-testid="mock-timer"
    >
      ⏱ {h ? `${h}:` : ""}
      {mm}:{ss} left
    </p>
  );
});
