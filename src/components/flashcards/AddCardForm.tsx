"use client";

import { useId, useState, type FormEvent } from "react";
import { addCards } from "@/lib/flashcards/cards";
import { subjects } from "@/lib/subjects";

const topicOptions = subjects.flatMap((s) =>
  s.chapters.flatMap((c) =>
    c.topics.map((t) => ({
      value: `${s.id}|${c.id}|${t.id}`,
      label: `${t.name}`,
      group: `${s.name} · ${c.name}`,
    })),
  ),
);
const groups = [...new Set(topicOptions.map((o) => o.group))];

/** Write your own card (markdown and $maths$ work on both sides). */
export function AddCardForm({ onAdded }: { onAdded: () => void }) {
  const id = useId();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [topic, setTopic] = useState(topicOptions[0]?.value ?? "");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return setMessage("Write both a question and an answer.");
    const [subject, chapter, topicId] = topic.split("|");
    const { added } = await addCards({ subject, chapter, topic: topicId }, [
      { front: front.trim(), back: back.trim(), origin: "manual" },
    ]);
    setMessage(
      added ? "✓ Card added. It is due now." : "You already have a card with that question.",
    );
    if (added) {
      setFront("");
      setBack("");
      onAdded();
    }
  }

  return (
    <details className="rounded-2xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-semibold">＋ Add your own card</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label htmlFor={`${id}-front`} className="text-sm font-semibold">
          Question (front)
        </label>
        <textarea
          id={`${id}-front`}
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={2}
          maxLength={2000}
          className="rounded-xl border border-border bg-bg p-2 text-sm"
        />
        <label htmlFor={`${id}-back`} className="text-sm font-semibold">
          Answer (back)
        </label>
        <textarea
          id={`${id}-back`}
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={3}
          maxLength={4000}
          className="rounded-xl border border-border bg-bg p-2 text-sm"
        />
        <label htmlFor={`${id}-topic`} className="text-sm font-semibold">
          Topic
        </label>
        <select
          id={`${id}-topic`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-xl border border-border bg-bg p-2 text-sm"
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {topicOptions
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-fg hover:bg-primary-hover"
          >
            Add card
          </button>
          {message && (
            <p aria-live="polite" className="text-sm text-muted">
              {message}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
