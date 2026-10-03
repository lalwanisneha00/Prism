"use client";

import { useState } from "react";
import { sectionText, type ExtractedSection } from "@/lib/extract/types";
import { looksReadable } from "@/lib/ocr/cleanText";
import { ocrOnDevice, readWithAi, sectionImages } from "@/lib/ocr/readImages";
import { getNoteFile, setSectionIncluded, setSectionOcr } from "@/lib/notes/store";
import type { StoredNote } from "@/lib/storage/db";

type Job = { index: number; label: string; done: number; total: number } | null;

/**
 * What Prism understood from a file, part by part (slide, page, heading). The student can
 * leave parts out, and read the text in pictures on this device or, one part at a time,
 * with the AI.
 */
export function MaterialPreview({
  note,
  onChange,
}: {
  note: StoredNote;
  onChange: (note: StoredNote) => void;
}) {
  const [job, setJob] = useState<Job>(null);
  const [error, setError] = useState<string | null>(null);
  const sections = note.sections ?? [];
  const excluded = new Set(note.excluded ?? []);
  const pictureParts = sections.filter((s) => s.thin && !s.ocr && canRead(note, s));

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted">
        This file was added before previews existed. Delete it and upload it again to see its parts.
      </p>
    );
  }

  async function images(section: ExtractedSection): Promise<Blob[] | null> {
    const file = await getNoteFile(note.id);
    if (!file) {
      setError("The original file isn't kept on this device. Upload it again to read pictures.");
      return null;
    }
    return sectionImages(note, file, section);
  }

  async function readOnDevice(list: ExtractedSection[]) {
    setError(null);
    try {
      let latest = note;
      for (const [n, section] of list.entries()) {
        setJob({ index: section.index, label: section.label, done: n, total: list.length });
        const pics = await images(section);
        if (!pics) return;
        const text = await ocrOnDevice(pics, (d, t) =>
          setJob({
            index: section.index,
            label: section.label,
            done: n + d / Math.max(t, 1),
            total: list.length,
          }),
        );
        const saved = await setSectionOcr(
          note.id,
          section.index,
          looksReadable(text) ? text : "",
          "device",
        );
        if (saved) latest = saved;
      }
      onChange(latest);
    } catch {
      setError(
        "Reading the pictures failed. Check your connection (the reader downloads its language data once) and try again.",
      );
    } finally {
      setJob(null);
    }
  }

  async function readByAi(section: ExtractedSection) {
    setError(null);
    setJob({ index: section.index, label: section.label, done: 0, total: 1 });
    try {
      const pics = await images(section);
      if (!pics) return;
      const texts: string[] = [];
      for (const pic of pics) {
        const result = await readWithAi(pic);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        texts.push(result.text);
      }
      const saved = await setSectionOcr(note.id, section.index, texts.join("\n\n"), "ai");
      if (saved) onChange(saved);
    } catch {
      setError("The AI couldn't read this picture. Try again later.");
    } finally {
      setJob(null);
    }
  }

  async function toggle(index: number, include: boolean) {
    // Show the change at once; the saved copy (with rebuilt search passages) follows.
    const next = new Set(excluded);
    if (include) next.delete(index);
    else next.add(index);
    onChange({ ...note, excluded: [...next] });
    const saved = await setSectionIncluded(note.id, index, include);
    if (saved) onChange(saved);
  }

  return (
    <div className="flex flex-col gap-3" data-testid="material-preview">
      {pictureParts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-warning/10 p-3 text-sm">
          <p className="min-w-0 flex-1">
            {pictureParts.length} {pictureParts.length === 1 ? "part has" : "parts have"} content in
            pictures. Prism can read the text in them on this device (free, a little slow).
          </p>
          <button
            type="button"
            disabled={job !== null}
            onClick={() => void readOnDevice(pictureParts)}
            className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
          >
            Read text from images
          </button>
        </div>
      )}
      {job && (
        <div aria-live="polite" className="flex flex-col gap-1 text-sm">
          <p>
            Reading {job.label}… ({Math.floor(job.done) + 1} of {job.total})
          </p>
          <progress
            className="h-2 w-full accent-primary"
            max={job.total}
            value={job.done}
            aria-label="Reading progress"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {sections.map((s) => {
          const text = sectionText(s);
          const included = !excluded.has(s.index);
          return (
            <li key={s.index} className="rounded-xl border border-border">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="font-semibold capitalize">{s.label}</span>
                  {s.title && <span className="min-w-0 truncate text-muted">{s.title}</span>}
                  {s.thin && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                      Content is in an image
                    </span>
                  )}
                  {s.ocr && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                      {s.ocr === "ai" ? "Read by AI" : "Read from picture"}
                    </span>
                  )}
                  {!included && <span className="text-xs text-muted">(left out)</span>}
                </summary>
                <div className="flex flex-col gap-3 border-t border-border p-3 text-sm">
                  {text ? (
                    <p className="max-h-64 overflow-auto break-words whitespace-pre-wrap">{text}</p>
                  ) : (
                    <p className="text-muted">No text yet.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={(e) => void toggle(s.index, e.target.checked)}
                      />
                      Use this part in lessons
                    </label>
                    {canRead(note, s) && (
                      <>
                        <button
                          type="button"
                          disabled={job !== null}
                          onClick={() => void readOnDevice([s])}
                          className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-surface-2 disabled:opacity-60"
                        >
                          {s.ocr ? "Read again" : "Read text (on this device)"}
                        </button>
                        <button
                          type="button"
                          disabled={job !== null}
                          onClick={() => void readByAi(s)}
                          className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-surface-2 disabled:opacity-60"
                          title="Better for handwriting. Uses your free AI quota."
                        >
                          Read with AI (uses AI quota)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Pictures can be read for photos, PDF pages and slides that have photos on them. */
function canRead(note: StoredNote, s: ExtractedSection): boolean {
  if (note.format === "image" || note.format === "pdf") return s.thin || Boolean(s.ocr);
  return (s.pictures?.length ?? 0) > 0;
}
