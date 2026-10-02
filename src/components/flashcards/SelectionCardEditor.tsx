"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ExplainState } from "@/components/explain/useExplain";
import { addCards } from "@/lib/flashcards/cards";
import type { Lesson } from "@/lib/schema";

/** The question a selection becomes: short phrases are asked about, long ones quoted. */
export function frontFor(selection: string): string {
  return selection.length <= 60 ? `What is “${selection}”?` : `Explain: “${selection}”`;
}

/**
 * "＋ Flashcard" from selected text: the front is the selection, the back starts as a short AI
 * definition (still loading at first). The student can edit both before saving.
 */
export function SelectionCardEditor({
  selection,
  lesson,
  definition,
  onRetry,
}: {
  selection: string;
  lesson: Lesson;
  definition: ExplainState;
  onRetry: () => void;
}) {
  const id = useId();
  const [front, setFront] = useState(() => frontFor(selection));
  // null until the student edits: then their text wins over the AI's definition.
  const [backEdit, setBackEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const back = backEdit ?? (definition.status === "ready" ? definition.text : "");

  async function save() {
    if (!front.trim() || !back.trim()) return;
    const { subject, chapter, topic } = lesson.meta;
    const { added } = await addCards({ subject, chapter, topic }, [
      { front: front.trim(), back: back.trim(), origin: "selection" },
    ]).catch(() => ({ added: -1 }));
    setSaved(
      added > 0
        ? "✓ Saved. It's due now."
        : added === 0
          ? "You already have this card."
          : "Couldn't save (storage blocked?).",
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={`${id}-f`} className="font-semibold">
        Front
      </label>
      <textarea
        id={`${id}-f`}
        value={front}
        onChange={(e) => setFront(e.target.value)}
        rows={2}
        className="rounded-lg border border-border bg-bg p-2"
      />
      <label htmlFor={`${id}-b`} className="font-semibold">
        Back{" "}
        {definition.status === "loading" && (
          <span className="font-normal text-muted">(writing a definition…)</span>
        )}
      </label>
      <textarea
        id={`${id}-b`}
        value={back}
        onChange={(e) => setBackEdit(e.target.value)}
        rows={4}
        placeholder={
          definition.status === "error" ? "Write the answer yourself, or try again." : ""
        }
        className="rounded-lg border border-border bg-bg p-2"
      />
      {definition.status === "error" && (
        <button type="button" onClick={onRetry} className="w-fit text-primary underline">
          Try the AI definition again
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!front.trim() || !back.trim()}
          className="rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
        >
          Save flashcard
        </button>
        {saved && (
          <span aria-live="polite" className="text-muted">
            {saved}{" "}
            <Link href="/flashcards" className="font-semibold text-primary underline">
              Review
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
