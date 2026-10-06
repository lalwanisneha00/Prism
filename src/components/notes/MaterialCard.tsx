"use client";

import { Icon } from "@/components/Icon";
import { useState } from "react";
import { MaterialPreview } from "@/components/notes/MaterialPreview";
import { unitName } from "@/lib/extract/types";
import { isMaterialKind, kindLabel, MATERIAL_KINDS } from "@/lib/notes/kinds";
import { updateNoteMeta } from "@/lib/notes/store";
import type { StoredNote } from "@/lib/storage/db";
import { chaptersOf, type Subject } from "@/lib/subjects";

const selectClass = "rounded-lg border border-border bg-bg px-2 py-1.5 text-sm";

/** One uploaded file: its type, subject and chapter (editable), preview and delete. */
export function MaterialCard({
  subjects,
  note,
  onChange,
  onRemove,
}: {
  subjects: readonly Subject[];
  note: StoredNote;
  onChange: (note: StoredNote) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const subject = subjects.find((s) => s.id === note.subject);
  const leftOut = note.excluded?.length ?? 0;

  async function retag(meta: { kind?: string; subject?: string; chapter?: string }) {
    const saved = await updateNoteMeta(note.id, {
      ...(meta.kind !== undefined && isMaterialKind(meta.kind) ? { kind: meta.kind } : {}),
      ...(meta.subject !== undefined ? { subject: meta.subject } : {}),
      ...(meta.chapter !== undefined ? { chapter: meta.chapter } : {}),
    });
    if (saved) onChange(saved);
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold break-words">
            <Icon name="book" /> {note.name}
          </p>
          <p className="text-sm text-muted">
            {unitName(note.format, note.pages)} · {note.chunks.length}{" "}
            {note.chunks.length === 1 ? "passage" : "passages"}
            {leftOut > 0 && ` · ${leftOut} left out`} · added{" "}
            {new Date(note.addedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
          >
            {open ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(note.id)}
            aria-label={`Delete ${note.name}`}
            className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Type
          <select
            className={selectClass}
            value={note.kind ?? "notes"}
            aria-label="Type"
            onChange={(e) => void retag({ kind: e.target.value })}
          >
            {MATERIAL_KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Subject
          <select
            className={selectClass}
            value={note.subject ?? ""}
            aria-label="Subject"
            onChange={(e) => void retag({ subject: e.target.value })}
          >
            <option value="">Any subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {subject && (
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
            Chapter
            <select
              className={`${selectClass} max-w-full`}
              value={note.chapter ?? ""}
              aria-label="Chapter"
              onChange={(e) => void retag({ chapter: e.target.value })}
            >
              <option value="">Whole subject</option>
              {chaptersOf(subject).map(({ chapter: c, owner }) => (
                <option key={`${owner.id}/${c.id}`} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {open && <MaterialPreview note={note} onChange={onChange} />}
    </li>
  );
}
