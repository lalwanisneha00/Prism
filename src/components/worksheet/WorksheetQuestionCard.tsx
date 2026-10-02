"use client";

import { useState } from "react";
import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import type { SelfMark, WorksheetQuestion } from "@/lib/worksheet/schema";
import { marksEarned } from "@/lib/worksheet/schema";

const markButtons: { value: SelfMark; label: string }[] = [
  { value: "full", label: "✓ Full marks" },
  { value: "part", label: "½ Partly" },
  { value: "missed", label: "✗ Missed it" },
];

/** One exam question: try it, reveal the model answer, then self-mark. */
export function WorksheetQuestionCard({
  question,
  index,
  mark,
  onMark,
}: {
  question: WorksheetQuestion;
  index: number;
  mark?: SelfMark;
  onMark: (mark: SelfMark) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-primary">Question {index + 1}</p>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </div>
      <Markdown>{question.question}</Markdown>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-fit rounded-full border border-border px-4 py-1.5 text-sm font-semibold hover:bg-surface-2"
      >
        {open ? "Hide model answer" : "Show model answer"}
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {question.steps.map((s, i) => (
              <li key={i}>
                <Markdown>{s}</Markdown>
              </li>
            ))}
          </ol>
          <div className="rounded-xl bg-primary-soft px-3 py-2">
            <span className="text-sm font-semibold text-primary">Answer: </span>
            <Markdown className="inline">{question.answer}</Markdown>
          </div>
          <div>
            <p className="text-sm font-semibold">Examiners give marks for</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted">
              {question.markingPoints.map((m, i) => (
                <li key={i}>
                  <Markdown>{m}</Markdown>
                </li>
              ))}
            </ul>
          </div>

          {mark ? (
            <p className="text-sm font-semibold" aria-live="polite">
              You gave yourself {marksEarned(question.marks, mark)} / {question.marks}.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">How did you do?</span>
              {markButtons.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => onMark(b.value)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
