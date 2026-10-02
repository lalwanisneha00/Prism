"use client";

import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/schema";
import { getSavedLesson, lessonId, saveLesson, unsaveLesson } from "@/lib/storage/library";

/** ☆ Save / ★ Saved toggle. Saved lessons open instantly and work offline. */
export function SaveLessonButton({ lesson }: { lesson: Lesson }) {
  const id = lessonId(lesson.meta);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSavedLesson(id)
      .then((r) => setSaved(Boolean(r)))
      .catch(() => setSaved(false));
  }, [id]);

  async function toggle() {
    try {
      if (saved) await unsaveLesson(id);
      else await saveLesson(lesson);
      setSaved(!saved);
      setFailed(false);
    } catch {
      setFailed(true); // e.g. private browsing blocks storage
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={saved === null}
        aria-pressed={Boolean(saved)}
        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${
          saved
            ? "border-primary bg-primary-soft text-primary"
            : "border-border bg-surface hover:bg-surface-2"
        }`}
      >
        {saved ? "★ Saved" : "☆ Save lesson"}
      </button>
      {failed && <span className="text-sm text-danger">Couldn&apos;t save on this device.</span>}
    </div>
  );
}
