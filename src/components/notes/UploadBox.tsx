"use client";

import { Icon } from "@/components/Icon";
import { useId, useRef, useState } from "react";
import { ACCEPT, FORMAT_NAMES } from "@/lib/extract/detect";
import { extractFile } from "@/lib/extract/extractFile";
import { ExtractError, MAX_FILE_BYTES, unitName } from "@/lib/extract/types";
import { guessChapter, guessKind, kindLabel } from "@/lib/notes/kinds";
import { addNote } from "@/lib/notes/store";
import { useMineFirst } from "@/components/subjects/useMineFirst";
import { chaptersOf, type Subject } from "@/lib/subjects";

/** At most this many files in one go, so a slip of the mouse can't freeze the page. */
export const MAX_FILES_PER_UPLOAD = 20;

type Item = {
  key: string;
  name: string;
  status: "waiting" | "reading" | "done" | "failed";
  progress?: string;
  message?: string;
  howTo?: string;
  warnings?: string[];
};

/** Drag-and-drop or pick several files of any supported format; each is read on this device. */
export function UploadBox({
  subjects,
  subject,
  onSubjectChange,
  onAdded,
}: {
  /** Built-in subjects and the student's own. */
  subjects: readonly Subject[];
  subject: string;
  onSubjectChange: (id: string) => void;
  onAdded: () => void;
}) {
  const id = useId();
  const ordered = useMineFirst(subjects);
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = items.some((i) => i.status === "reading" || i.status === "waiting");

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  async function handleFiles(fileList: FileList | File[]) {
    let files = [...fileList];
    setNotice(null);
    if (files.length > MAX_FILES_PER_UPLOAD) {
      setNotice(
        `That's ${files.length} files. The first ${MAX_FILES_PER_UPLOAD} will be read; add the rest afterwards.`,
      );
      files = files.slice(0, MAX_FILES_PER_UPLOAD);
    }
    const batch = files.map((f, i) => ({
      file: f,
      key: `${Date.now()}-${i}-${f.name}`,
    }));
    setItems((list) => [
      ...batch.map(({ file, key }) => ({ key, name: file.name, status: "waiting" as const })),
      ...list.filter((i) => i.status !== "done" && i.status !== "failed"),
    ]);
    const chosen = subjects.find((s) => s.id === subject);

    // One at a time: reading is heavy work for a phone.
    for (const { file, key } of batch) {
      update(key, { status: "reading" });
      try {
        const doc = await extractFile(file, (done, total) =>
          update(key, { progress: `page ${done} of ${total}` }),
        );
        const kind = guessKind(file.name, doc);
        const chapter = chosen
          ? guessChapter(
              chaptersOf(chosen).map((o) => o.chapter),
              doc,
            )
          : undefined;
        const bytes = await file.arrayBuffer();
        await addNote(
          file,
          doc,
          Date.now(),
          {
            kind,
            ...(chosen ? { subject: chosen.id } : {}),
            ...(chapter ? { chapter } : {}),
          },
          { bytes, mime: file.type || "application/octet-stream" },
        );
        const pictures = doc.sections.filter((s) => s.thin).length;
        update(key, {
          status: "done",
          progress: undefined,
          message: `${unitName(doc.format, doc.sections.length)} · saved as ${kindLabel[kind]}${
            pictures ? ` · ${pictures} with content in pictures: open Preview to read them` : ""
          }`,
          warnings: doc.warnings,
        });
      } catch (err) {
        update(key, {
          status: "failed",
          progress: undefined,
          message:
            err instanceof ExtractError
              ? err.message
              : "Something went wrong saving this file. Check that storage isn't blocked.",
          howTo: err instanceof ExtractError ? err.howTo : undefined,
        });
      }
      onAdded();
    }
    if (input.current) input.current.value = "";
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!busy && e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col gap-3 rounded-2xl border-2 border-dashed p-5 transition-colors ${
        dragging ? "border-primary bg-primary/10" : "border-border bg-surface-2"
      }`}
    >
      <h2 id={`${id}-title`} className="font-semibold">
        Add notes, slides, papers or a syllabus
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex w-full max-w-full min-w-0 flex-col gap-1 text-sm sm:w-auto">
          <span className="text-muted">Subject</span>
          <select
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="box-border w-full max-w-full min-w-0 rounded-lg border border-border bg-bg px-3 py-2"
          >
            <option value="">Any subject</option>
            {ordered.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label
          htmlFor={`${id}-file`}
          className={`cursor-pointer rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          Choose files
        </label>
        <input
          ref={input}
          id={`${id}-file`}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={busy}
          className="sr-only"
          data-testid="materials-input"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
        <span className="text-sm text-muted">or drop them here</span>
      </div>
      <p className="text-sm text-muted">
        <Icon name="lock" /> Files are read in your browser and stay on this device; only their
        names, types and a short summary sync to your account. Works with {FORMAT_NAMES}. Up to{" "}
        {MAX_FILE_BYTES / 1024 / 1024} MB and {MAX_FILES_PER_UPLOAD} files at a time.
      </p>
      {notice && <p className="text-sm text-warning">{notice}</p>}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2" aria-live="polite" data-testid="upload-status">
          {items.map((item) => (
            <li key={item.key} className="rounded-xl bg-surface p-3 text-sm">
              <p className="font-semibold break-words">
                {item.status === "done" && <span className="text-success">✓ </span>}
                {item.status === "failed" && <span className="text-danger">✗ </span>}
                {item.name}
              </p>
              {item.status === "waiting" && <p className="text-muted">Waiting…</p>}
              {item.status === "reading" && (
                <p className="text-muted">Reading{item.progress ? `: ${item.progress}` : "…"}</p>
              )}
              {item.message && (
                <p
                  role={item.status === "failed" ? "alert" : undefined}
                  className={item.status === "failed" ? "text-danger" : "text-muted"}
                >
                  {item.message}
                </p>
              )}
              {item.howTo && <p className="whitespace-pre-line text-muted">{item.howTo}</p>}
              {item.warnings?.map((w) => (
                <p key={w} className="text-warning">
                  {w}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
