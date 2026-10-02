"use client";

import { useId, useState } from "react";
import { extractPdfPages, PdfTextError } from "@/lib/notes/pdfText";
import { MAX_PYQ_QUESTIONS } from "@/lib/worksheet/schema";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/** Paste past-paper questions (or load them from a PDF on this device) to get them solved. */
export function PastPaperInput({
  busy,
  onSolve,
}: {
  busy: boolean;
  onSolve: (questions: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const questions = splitPaper(text);
  const used = questions.slice(0, MAX_PYQ_QUESTIONS);

  async function loadPdf(file: File) {
    setPdfStatus("Reading the PDF on your device…");
    try {
      const pages = await extractPdfPages(await file.arrayBuffer());
      setText(pages.join("\n"));
      setPdfStatus(`Loaded ${file.name}. Check the questions below and remove any you don't need.`);
    } catch (err) {
      setPdfStatus(err instanceof PdfTextError ? err.message : "That PDF couldn't be read.");
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
          or load a PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadPdf(file);
              e.target.value = "";
            }}
          />
        </label>
        {pdfStatus && <span className="text-muted">{pdfStatus}</span>}
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
