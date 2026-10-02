"use client";

import { useState } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import { deleteCard, updateCard } from "@/lib/flashcards/cards";
import type { Flashcard } from "@/lib/storage/db";

const originLabel: Record<Flashcard["origin"], string> = {
  glossary: "Glossary",
  quiz: "Quiz",
  misconception: "Common mistake",
  selection: "Your selection",
  manual: "Your card",
  highlight: "Your highlight",
};

/** Every card, to browse, edit or delete. */
export function CardList({
  cards,
  now,
  onChange,
}: {
  cards: Flashcard[];
  now: number;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ front: "", back: "" });
  const sorted = [...cards].sort((a, b) => a.srs.due - b.srs.due);

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold">All my cards ({cards.length})</summary>
      <ul className="mt-4 flex flex-col gap-3">
        {sorted.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-xl border border-border p-3 text-sm"
          >
            {editing === c.id ? (
              <>
                <textarea
                  aria-label="Question"
                  value={draft.front}
                  onChange={(e) => setDraft((d) => ({ ...d, front: e.target.value }))}
                  rows={2}
                  className="rounded-lg border border-border bg-bg p-2"
                />
                <textarea
                  aria-label="Answer"
                  value={draft.back}
                  onChange={(e) => setDraft((d) => ({ ...d, back: e.target.value }))}
                  rows={3}
                  className="rounded-lg border border-border bg-bg p-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-3 py-1 font-semibold text-primary-fg"
                    onClick={async () => {
                      await updateCard(c, draft);
                      setEditing(null);
                      onChange();
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1 font-semibold"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <Markdown className="font-medium">{c.front}</Markdown>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{originLabel[c.origin]}</span>
                  <span>
                    {c.srs.due <= now
                      ? "Due now"
                      : `Due ${new Date(c.srs.due).toLocaleDateString()}`}
                  </span>
                  <span>Reviewed {c.srs.reps + c.srs.lapses}×</span>
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() => {
                      setEditing(c.id);
                      setDraft({ front: c.front, back: c.back });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-danger underline"
                    onClick={async () => {
                      await deleteCard(c);
                      onChange();
                    }}
                    aria-label={`Delete card: ${c.front.slice(0, 40)}`}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
