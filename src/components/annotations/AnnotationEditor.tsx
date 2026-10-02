"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { ColorSwatch } from "@/components/annotations/ColorSwatch";
import { ExplainAnswer } from "@/components/explain/ExplainAnswer";
import { useExplain, useLesson } from "@/components/explain/useExplain";
import { addCards } from "@/lib/flashcards/cards";
import { highlightColors, MAX_COMMENT } from "@/lib/annotations/store";
import type { Annotation } from "@/lib/storage/db";

/**
 * Edit one highlight or note: change its colour, write a comment (saved automatically),
 * explain it more simply, turn it into a flashcard, or remove it.
 */
export function AnnotationEditor() {
  const anno = useAnnotations();
  const editing = anno?.editing ?? null;
  if (!anno || !editing) return null;
  // A fresh editor per annotation, so its comment box starts with that annotation's text.
  return <Editor key={editing.id} annotation={editing} />;
}

function Editor({ annotation }: { annotation: Annotation }) {
  const anno = useAnnotations()!;
  const lesson = useLesson();
  const id = useId();
  const [comment, setComment] = useState(annotation.comment);
  const [saved, setSaved] = useState<"saved" | "saving" | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const explain = useExplain(lesson);
  const latest = useRef(annotation);
  const box = useRef<HTMLTextAreaElement>(null);
  const placed = anno.placed.find((p) => p.annotation.id === annotation.id);
  const quote = annotation.anchor?.quote;

  useEffect(() => {
    latest.current = anno.annotations.find((a) => a.id === annotation.id) ?? annotation;
  });
  useEffect(() => {
    if (!annotation.anchor || annotation.comment === "") box.current?.focus();
  }, [annotation]);

  // Autosave the comment a moment after typing stops. The save function is read through a
  // ref, so other re-renders of the page never cancel the pending save.
  const update = useRef(anno.update);
  useEffect(() => {
    update.current = anno.update;
  });
  useEffect(() => {
    if (comment === latest.current.comment) return;
    const timer = setTimeout(() => {
      setSaved("saving");
      void update.current({ ...latest.current, comment }).then(() => setSaved("saved"));
    }, 600);
    return () => clearTimeout(timer);
  }, [comment]);

  async function makeCard() {
    if (!lesson) return;
    const paragraph =
      placed?.range?.startContainer.parentElement?.closest("p, li")?.textContent ?? "";
    const front = quote
      ? quote.length <= 60
        ? `What is “${quote}”?`
        : `Explain: “${quote}”`
      : `My note on ${annotation.title}`;
    const back = comment.trim() || paragraph.trim() || quote || "";
    if (!back) return setCard("Write a comment first; it becomes the back of the card.");
    const { added } = await addCards(
      { subject: annotation.subject, chapter: annotation.chapter, topic: annotation.topic },
      [{ front, back, origin: "highlight" }],
    );
    setCard(added ? "✓ Flashcard added." : "You already have this card.");
  }

  const close = () => anno.openEditor(null);
  const title = annotation.color
    ? highlightColors.find((c) => c.color === annotation.color)?.label
    : annotation.anchor
      ? "Comment"
      : "Note";

  return (
    <aside
      aria-label="Edit highlight or note"
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]"
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">📝 {title}</p>
          {quote ? (
            <p className="mt-1 line-clamp-3 text-sm text-muted">“{quote}”</p>
          ) : (
            <p className="mt-1 text-sm text-muted">On: {describeBlock(annotation.block)}</p>
          )}
          {annotation.anchor && !placed?.range && (
            <p className="mt-1 text-xs text-warning">
              This text changed when the lesson was rewritten, so the note is kept here, unattached.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="rounded-full px-2 text-muted hover:bg-surface-2"
        >
          ✕
        </button>
      </div>

      {annotation.anchor && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-semibold text-muted">Colour</legend>
          {highlightColors.map((c) => (
            <ColorSwatch
              key={c.color}
              color={c.color}
              label={c.label}
              selected={annotation.color === c.color}
              showLabel
              onPick={() => void anno.update({ ...latest.current, color: c.color })}
            />
          ))}
        </fieldset>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-c`} className="text-sm font-semibold">
          Your comment
        </label>
        <textarea
          ref={box}
          id={`${id}-c`}
          value={comment}
          maxLength={MAX_COMMENT}
          onChange={(e) => {
            setComment(e.target.value);
            setSaved(null);
          }}
          rows={4}
          placeholder="Why this matters, a doubt to ask, a memory trick…"
          className="rounded-xl border border-border bg-bg p-2 text-sm"
        />
        <p className="flex justify-between text-xs text-muted" aria-live="polite">
          <span>
            {saved === "saving" ? "Saving…" : saved === "saved" ? "✓ Saved" : "Saves automatically"}
          </span>
          <span>
            {comment.length}/{MAX_COMMENT}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {quote && (
          <button
            type="button"
            onClick={() => void explain.run({ action: "explain", selection: quote })}
            className={`rounded-full border px-3 py-1.5 font-semibold hover:bg-surface-2 ${annotation.color === "confused" ? "border-primary text-primary" : "border-border"}`}
          >
            🪶 Explain this simpler
          </button>
        )}
        <button
          type="button"
          onClick={makeCard}
          className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2"
        >
          🃏 Turn into flashcard
        </button>
        <button
          type="button"
          onClick={() => void anno.remove(latest.current)}
          className="rounded-full border border-danger/40 px-3 py-1.5 font-semibold text-danger hover:bg-danger/10"
        >
          Remove
        </button>
      </div>
      {card && (
        <p className="text-sm text-muted" aria-live="polite">
          {card}{" "}
          <Link href="/flashcards" className="font-semibold text-primary underline">
            Review
          </Link>
        </p>
      )}
      {explain.state.status !== "idle" && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
          <ExplainAnswer
            state={explain.state}
            onRetry={() => quote && void explain.run({ action: "explain", selection: quote })}
          />
        </div>
      )}
    </aside>
  );
}

export function describeBlock(block: string): string {
  const [kind, rest] = block.split(":");
  const n = Number(rest) + 1;
  switch (kind) {
    case "section":
      return "this section";
    case "example":
      return `worked example ${n}`;
    case "quiz":
      return `quiz question ${n}`;
    case "visual":
      return "this visual";
    case "mistake":
      return `common mistake ${n}`;
    case "analogy":
      return `analogy ${n}`;
    default:
      return "the revision sheet";
  }
}
