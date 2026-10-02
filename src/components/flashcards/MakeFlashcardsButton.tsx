"use client";

import Link from "next/link";
import { useState } from "react";
import { addCards, cardsFromLesson } from "@/lib/flashcards/cards";
import type { Lesson } from "@/lib/schema";

/** One tap: the lesson's glossary, quiz and common mistakes become flashcards (no AI needed). */
export function MakeFlashcardsButton({ lesson }: { lesson: Lesson }) {
  const [result, setResult] = useState<string | null>(null);
  const drafts = cardsFromLesson(lesson);
  if (drafts.length === 0) return null;

  async function make() {
    try {
      const { subject, chapter, topic } = lesson.meta;
      const { added, existing } = await addCards({ subject, chapter, topic }, drafts);
      setResult(
        added
          ? `✓ ${added} card${added === 1 ? "" : "s"} added`
          : `You already have these ${existing} cards`,
      );
    } catch {
      setResult("Couldn't save cards (storage blocked?)");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={make}
        aria-label={`Make ${drafts.length} flashcards from this lesson`}
        className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold whitespace-nowrap hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        🃏 Flashcards ({drafts.length})
      </button>
      {result && (
        <span aria-live="polite" className="text-sm text-muted">
          {result} ·{" "}
          <Link href="/flashcards" className="font-semibold text-primary underline">
            Review
          </Link>
        </span>
      )}
    </div>
  );
}
