"use client";

import { useState } from "react";
import { describeBlock } from "@/components/annotations/AnnotationEditor";
import { useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { HighlightLegend, swatchClass } from "@/components/annotations/ColorSwatch";
import type { Placed } from "@/components/annotations/AnnotationsProvider";

/** Notes in reading order: by position on the page; unattached ones last. */
export function inReadingOrder(placed: Placed[]): Placed[] {
  const top = (p: Placed) =>
    (p.range?.getBoundingClientRect().top ?? p.blockEl?.getBoundingClientRect().top ?? Infinity) +
    window.scrollY;
  return [...placed].sort((a, b) => top(a) - top(b));
}

/** The list of this lesson's highlights and comments; tap one to jump to it. */
export function MyNotesList({ compact = false }: { compact?: boolean }) {
  const anno = useAnnotations();
  if (!anno) return null;
  if (anno.placed.length === 0) {
    return (
      <p className="text-sm text-muted">
        No highlights yet. Select any text in the lesson and pick a colour, or press 📝 on a
        section, example or question to add a note.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {inReadingOrder(anno.placed).map(({ annotation: a, range }) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => {
              anno.scrollTo(a);
              if (!compact) anno.openEditor(a);
            }}
            className="flex w-full items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left text-sm hover:border-primary"
          >
            <span
              aria-hidden="true"
              className={`mt-1 size-3 shrink-0 rounded-full ${a.color ? swatchClass[a.color] : "border-2 border-dotted border-primary"}`}
            />
            <span className="min-w-0 flex-1">
              {a.anchor ? (
                <span className="line-clamp-2">“{a.anchor.quote}”</span>
              ) : (
                <span className="text-muted">Note on {describeBlock(a.block)}</span>
              )}
              {a.comment.trim() && (
                <span className="mt-1 block whitespace-pre-wrap text-muted">💬 {a.comment}</span>
              )}
              {a.anchor && !range && (
                <span className="mt-1 block text-xs text-warning">
                  Its text changed in this version of the lesson.
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** "📝 My notes (N)" in the lesson header: the panel, the legend and "show only my highlights". */
export function MyNotesPanel() {
  const anno = useAnnotations();
  const [open, setOpen] = useState(false);
  if (!anno) return null;
  const count = anno.annotations.length;

  return (
    <div className="flex flex-col gap-3" data-anno-skip="">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold whitespace-nowrap hover:bg-surface-2"
        >
          📝 My notes ({count})
        </button>
        {count > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anno.onlyMine}
              onChange={(e) => anno.setOnlyMine(e.target.checked)}
              className="size-4 accent-primary"
            />
            Show only my highlights
          </label>
        )}
      </div>
      {!anno.supported && count > 0 && (
        <p className="text-xs text-warning">
          This browser can&apos;t paint highlights on the text, but your notes are all listed under
          “My notes”.
        </p>
      )}
      {open && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-2 p-3">
          <HighlightLegend />
          <MyNotesList />
        </div>
      )}
    </div>
  );
}
