"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listLocalNotes } from "@/lib/notes/store";

/** "Use my uploaded notes": shown as a checkbox once this device has notes. */
export function NotesToggle({
  checked,
  onChange,
  subjectId,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** The subject being chosen: the uploads page opens on it. */
  subjectId?: string;
}) {
  const notesHref = subjectId ? `/notes?subject=${encodeURIComponent(subjectId)}` : "/notes";
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    listLocalNotes()
      .then((notes) => setCount(notes.length))
      .catch(() => setCount(0));
  }, []);

  if (count === null) return null;
  if (count === 0) {
    return (
      <p className="text-sm text-muted">
        <Icon name="book" /> Have college notes?{" "}
        <Link href={notesHref} className="font-semibold text-primary underline underline-offset-2">
          Add a PDF
        </Link>{" "}
        and lessons will follow them.
      </p>
    );
  }
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <input
        type="checkbox"
        name="notes"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 accent-primary"
      />
      <span>
        <span className="font-semibold">
          <Icon name="book" /> Use my uploaded notes
        </span>
        <span className="block text-sm text-muted">
          Prism searches your {count} {count === 1 ? "file" : "files"} on this device and follows
          the matching pages.{" "}
          <Link href={notesHref} className="text-primary underline underline-offset-2">
            Manage notes
          </Link>
        </span>
      </span>
    </label>
  );
}
