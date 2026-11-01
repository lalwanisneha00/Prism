"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { analysePaper } from "@/components/mock/engine";
import { ACCEPT } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { ExtractError } from "@/lib/extract/types";
import { PAPER_KINDS, paperKindLabel, type PaperKind } from "@/lib/mock/pattern";
import { addNote } from "@/lib/notes/store";
import type { MockSubject } from "@/components/mock/useMockSubjects";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

type Status = { tone: "busy" | "done" | "error"; text: string; ocr?: boolean };

/**
 * Upload a past paper with its tag (end-sem, mid-sem, internal, other), subject and year. It goes
 * through the same reader as every upload (PDF, PowerPoint, Word, images) and stays on this
 * device; its pattern is read once, straight away, and kept with it.
 */
export function PaperUpload({
  subjects,
  subject: initial,
  onAdded,
}: {
  subjects: readonly MockSubject[];
  subject?: string;
  onAdded: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<PaperKind>("end-sem");
  const [subject, setSubject] = useState(initial ?? subjects[0]?.subject.id ?? "");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState<Status[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    const out: Status[] = [];
    const show = (s: Status) => setStatus([...out, s]);
    const y = Number(year);
    for (const file of [...files].slice(0, 10)) {
      show({ tone: "busy", text: `Reading ${file.name}…` });
      try {
        const doc = await extractFile(file);
        const note = await addNote(
          file,
          doc,
          Date.now(),
          {
            kind: "pyq",
            ...(subject ? { subject } : {}),
            paper: { kind, ...(y >= 1990 && y <= 2100 ? { year: y } : {}) },
          },
          { bytes: await file.arrayBuffer(), mime: file.type || "application/octet-stream" },
        );
        show({ tone: "busy", text: `Reading the pattern of ${file.name}…` });
        const pattern = await analysePaper(note.id, (s) =>
          show({ tone: "busy", text: `The free AI is busy; trying again in ${s} s…` }),
        );
        const pictures = doc.sections.filter((s) => s.thin).length;
        out.push(
          pattern
            ? {
                tone: "done",
                text: `${file.name}: saved. Pattern: ${pattern.sections.length} ${pattern.sections.length === 1 ? "section" : "sections"}, ${pattern.totalMarks} marks.`,
              }
            : {
                tone: "error",
                text: `${file.name}: saved, but no questions could be read${pictures ? " (it is a photo or scan)" : ""}.`,
                ocr: pictures > 0,
              },
        );
      } catch (err) {
        out.push({
          tone: "error",
          text: `${file.name}: ${err instanceof ExtractError ? err.message : "couldn't be saved. Check that storage isn't blocked."}`,
        });
      }
      setStatus([...out]);
      onAdded();
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4"
      data-testid="paper-upload"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Paper type
          <select
            className={field}
            value={kind}
            onChange={(e) => setKind(e.target.value as PaperKind)}
          >
            {PAPER_KINDS.map((k) => (
              <option key={k} value={k}>
                {paperKindLabel[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Subject
          <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.subject.id} value={s.subject.id}>
                {s.subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Year (optional)
          <input
            className={field}
            inputMode="numeric"
            placeholder="e.g. 2025"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          id={`${id}-file`}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy || !subject}
          className="sr-only"
          onChange={(e) => e.target.files?.length && void upload(e.target.files)}
        />
        <label
          htmlFor={`${id}-file`}
          className={`cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover ${busy || !subject ? "pointer-events-none opacity-60" : ""}`}
        >
          {busy ? "Working…" : "Choose files"}
        </label>
        <span className="text-xs text-muted">
          PDF, PowerPoint, Word or photos. Kept on this device.
        </span>
      </div>
      {status.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" role="status">
          {status.map((s, i) => (
            <li
              key={i}
              className={
                s.tone === "error" ? "text-danger" : s.tone === "busy" ? "animate-pulse" : ""
              }
            >
              {s.tone === "done" ? "✓ " : ""}
              {s.text}
              {s.ocr && (
                <>
                  {" "}
                  <Link href="/notes" className="font-semibold text-primary underline">
                    Open it in Uploads to read the pictures
                  </Link>
                  , then come back.
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
