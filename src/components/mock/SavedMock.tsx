"use client";

import { useCallback, useState } from "react";
import { AnswerSheetView } from "@/components/mock/AnswerSheetView";
import { PaperView } from "@/components/mock/PaperView";
import { PrintPaper } from "@/components/mock/PrintPaper";
import { formatClock } from "@/lib/mock/clock";
import type { MockResult } from "@/lib/storage/db";

const btn = "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";

/**
 * A past mock, read-only: its paper or its answer sheet, with print/PDF. Older results (answered
 * and marked in the app before paper mode) show the same way, with their saved score.
 */
export function SavedMock({
  result,
  subjectName,
  show,
  onShow,
  onRetake,
  onBack,
}: {
  result: MockResult & { paper: NonNullable<MockResult["paper"]> };
  subjectName: string;
  show: "paper" | "answers";
  onShow: (s: "paper" | "answers") => void;
  onRetake: () => void;
  onBack: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const stop = useCallback(() => setPrinting(false), []);
  const scopeLabel = result.scope?.label ?? result.title;
  const sheet =
    show === "paper" ? (
      <PaperView paper={result.paper} subjectName={subjectName} scopeLabel={scopeLabel} />
    ) : (
      <AnswerSheetView paper={result.paper} subjectName={subjectName} scopeLabel={scopeLabel} />
    );
  return (
    <div className="flex flex-col gap-4" data-testid="saved-mock">
      <p className="text-sm">
        {new Date(result.at).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        · Your score:{" "}
        <strong>
          {result.score} / {result.total}
        </strong>
        {result.timeTakenSec ? ` · took ${formatClock(result.timeTakenSec)}` : ""}
        {result.mode !== "paper" ? " · answered in the app (older mock)" : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          aria-pressed={show === "paper"}
          onClick={() => onShow("paper")}
        >
          View paper
        </button>
        <button
          type="button"
          className={btn}
          aria-pressed={show === "answers"}
          onClick={() => onShow("answers")}
        >
          View answer sheet
        </button>
        <button type="button" className={btn} onClick={() => setPrinting(true)}>
          Download / print (PDF)
        </button>
        <button type="button" className={btn} onClick={onRetake}>
          Retake as a new paper
        </button>
        <button type="button" className={btn} onClick={onBack}>
          Back
        </button>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-8">{sheet}</div>
      {printing && (
        <PrintPaper
          title={`${show === "paper" ? "Mock paper" : "Answer sheet"} - ${subjectName} - ${scopeLabel}`}
          onDone={stop}
        >
          {sheet}
        </PrintPaper>
      )}
    </div>
  );
}
