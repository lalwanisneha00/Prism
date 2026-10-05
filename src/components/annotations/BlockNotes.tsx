"use client";

import { Icon } from "@/components/Icon";
import { useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { swatchClass } from "@/components/annotations/ColorSwatch";

/** The small 📝 "add note" button on a section, visual, worked example or quiz question. */
export function BlockNoteButton({
  block,
  sectionId,
  label,
}: {
  block: string;
  sectionId?: string;
  label: string;
}) {
  const anno = useAnnotations();
  if (!anno) return null;
  return (
    <button
      type="button"
      data-anno-skip=""
      onClick={() => void anno.addNote(block, sectionId)}
      aria-label={`Add a note to ${label}`}
      title="Add a note"
      className="rounded-full px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Icon name="note" />
    </button>
  );
}

/**
 * Notes that belong under a block: whole-block notes, notes whose text was rewritten
 * (unanchored), and, on phones, highlight comments (desktop shows those in the margin).
 */
export function BlockNotes({
  block,
  unanchoredSection,
}: {
  block: string;
  unanchoredSection?: string;
}) {
  const anno = useAnnotations();
  if (!anno) return null;
  const items = anno.placed.filter((p) => {
    const a = p.annotation;
    if (unanchoredSection) return a.sectionId === unanchoredSection && a.anchor && !p.range;
    if (a.block !== block) return false;
    return !a.anchor || (p.range && a.comment.trim());
  });
  if (items.length === 0) return null;

  return (
    <ul data-anno-skip="" className="flex flex-col gap-1.5">
      {unanchoredSection && (
        <li className="text-xs font-semibold text-warning">
          <Icon name="bookmark" /> Notes from an earlier version of this lesson (their text
          changed):
        </li>
      )}
      {items.map(({ annotation: a, range }) => (
        <li key={a.id} data-has-anno="" className={range && a.anchor ? "lg:hidden" : undefined}>
          <button
            type="button"
            onClick={() => anno.openEditor(a)}
            className="flex w-full items-start gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-left text-sm hover:border-primary"
          >
            <span
              aria-hidden="true"
              className={`mt-1 size-2.5 shrink-0 rounded-full ${a.color ? swatchClass[a.color] : "bg-primary"}`}
            />
            <span className="min-w-0">
              {a.anchor && (
                <span className="block truncate text-xs text-muted">“{a.anchor.quote}”</span>
              )}
              <span className="whitespace-pre-wrap">
                {a.comment.trim() || <span className="text-muted">Empty note: tap to write</span>}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Desktop: a 💬 marker in the right margin beside each commented highlight. */
export function CommentMarkers({ container }: { container: HTMLElement | null }) {
  const anno = useAnnotations();
  if (!anno || !container) return null;
  const base = container.getBoundingClientRect();
  const markers = anno.placed.filter(
    (p) => p.range && p.annotation.anchor && p.annotation.comment.trim(),
  );
  return (
    <div
      data-anno-skip=""
      className="pointer-events-none absolute inset-0 hidden lg:block"
      aria-hidden="false"
    >
      {markers.map(({ annotation: a, range }) => {
        const rect = range!.getBoundingClientRect();
        if (!rect.height) return null;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => anno.openEditor(a)}
            title={a.comment}
            aria-label={`Comment on “${a.anchor!.quote.slice(0, 40)}”: ${a.comment.slice(0, 80)}`}
            style={{ top: rect.top - base.top - 2 }}
            className="pointer-events-auto absolute -right-12 rounded-full border border-border bg-surface px-1.5 py-0.5 text-sm shadow-sm hover:border-primary"
          >
            <Icon name="comment" />
          </button>
        );
      })}
    </div>
  );
}
