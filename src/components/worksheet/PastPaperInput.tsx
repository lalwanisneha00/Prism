"use client";

import { useId, useState } from "react";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { docText, ExtractError, hasText } from "@/lib/extract/types";
import { MAX_PYQ_QUESTIONS } from "@/lib/worksheet/schema";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/** Paste past-paper questions (or load them from a file on this device) to get them solved. */
export function PastPaperInput({
  busy,
  onSolve,
}: {
  busy: boolean;
  onSolve: (questions: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const questions = splitPaper(text);
  const used = questions.slice(0, MAX_PYQ_QUESTIONS);

  async function loadFile(file: File) {
    setFileStatus("Reading the file on your device…");
    try {
      const doc = await extractFile(file);
      if (!hasText(doc)) {
        return setFileStatus(
          "No text found: this paper looks like a scan or photo. Type or paste the questions instead.",
        );
      }
      setText(docText(doc));
      setFileStatus(
        `Loaded ${file.name}. Check the questions below and remove any you don't need.`,
      );
    } catch (err) {
      setFileStatus(err instanceof ExtractError ? err.message : "That file couldn't be read.");
    }
  }

  return (
    <div className="flex flex-col gap-3" role="tabpanel">
      <label htmlFor={`${id}-text`} className="text-sm text-muted">
        Paste questions from a previous year&apos;s paper (PYQ), numbered like “Q1.”, “2)” or
        “Question 3”. Prism solves each one like an examiner would.
      </label>
      <textarea
        id={`${id}-text`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={
          "Q1. State Gauss's law. (2 marks)\nQ2. Find the field of an infinite line charge. (5 marks)"
        }
        className="w-full rounded-xl border border-border bg-bg p-3 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="cursor-pointer font-semibold text-primary underline underline-offset-2">
          or load a file (PDF, Word, PowerPoint, text…)
          <input
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {fileStatus && <span className="text-muted">{fileStatus}</span>}
      </div>

      {text.trim() && (
        <p className="text-sm" aria-live="polite">
          {questions.length === 0
            ? "No questions found yet. Put each question on its own line with its number."
            : `Found ${questions.length} ${questions.length === 1 ? "question" : "questions"}.`}
          {questions.length > MAX_PYQ_QUESTIONS &&
            ` The first ${MAX_PYQ_QUESTIONS} will be solved; paste the rest afterwards.`}
        </p>
      )}

      <button
        type="button"
        disabled={busy || used.length === 0}
        onClick={() => onSolve(used)}
        className="w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
      >
        {busy
          ? "Solving…"
          : `Solve ${used.length || ""} ${used.length === 1 ? "question" : "questions"}`.replace(
              "  ",
              " ",
            )}
      </button>
    </div>
  );
}
