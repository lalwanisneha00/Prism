"use client";

import { useState } from "react";
import { BlockNoteButton, BlockNotes } from "@/components/annotations/BlockNotes";
import { Card } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import type { Lesson } from "@/lib/schema";

type Example = Lesson["workedExamples"][number];

const buttonClass =
  "rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Reveals the solution one step at a time, so students can try each step first. */
export function WorkedExample({ example, index }: { example: Example; index: number }) {
  const [shown, setShown] = useState(0);
  const total = example.steps.length;
  const done = shown >= total;

  return (
    <Card className="flex flex-col gap-4" data-anno-block={`example:${index}`}>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary">
            Example {index + 1}{" "}
            <BlockNoteButton block={`example:${index}`} label={`worked example ${index + 1}`} />
          </p>
          {example.check && (
            <span
              title="The server re-did this calculation with a maths library and got the same answer."
              className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success"
            >
              ✓ Answer checked by computer
            </span>
          )}
        </div>
        <Markdown className="mt-1 font-medium">{example.problem}</Markdown>
      </div>

      {shown > 0 && (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {example.steps.slice(0, shown).map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {i + 1}
              </span>
              <Markdown className="min-w-0 flex-1">{step}</Markdown>
            </li>
          ))}
        </ol>
      )}

      {done ? (
        <div className="rounded-xl bg-primary-soft p-3">
          <p className="text-sm font-semibold text-primary">Answer</p>
          <Markdown>{example.answer}</Markdown>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => setShown((s) => s + 1)}>
            {shown === 0 ? "Show first step" : `Show step ${shown + 1} of ${total}`}
          </button>
          <button type="button" className={buttonClass} onClick={() => setShown(total)}>
            Show full solution
          </button>
        </div>
      )}
      <BlockNotes block={`example:${index}`} />
    </Card>
  );
}
