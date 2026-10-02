"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listLocalNotes } from "@/lib/notes/store";

/** "Use my uploaded notes": shown as a checkbox once this device has notes. */
export function NotesToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
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
        📒 Have college notes?{" "}
        <Link href="/notes" className="font-semibold text-primary underline underline-offset-2">
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
        <span className="font-semibold">📒 Use my uploaded notes</span>
        <span className="block text-sm text-muted">
          Prism searches your {count} {count === 1 ? "file" : "files"} on this device and follows
          the matching pages.{" "}
          <Link href="/notes" className="text-primary underline underline-offset-2">
            Manage notes
          </Link>
        </span>
      </span>
    </label>
  );
}
