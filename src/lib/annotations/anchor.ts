/*
 * Anchoring a highlight to lesson text so it survives changes (SPEC §8.1). Like a bookmark
 * that remembers both the page number AND the sentence: if the page numbers shift, it finds
 * the sentence again; if the sentence is gone, the note is kept (never silently deleted).
 */

export type TextAnchor = {
  start: number;
  end: number;
  /** The exact highlighted text. */
  quote: string;
  /** A little text before and after, to tell repeated phrases apart. */
  prefix: string;
  suffix: string;
};

const CONTEXT = 32;

export function makeAnchor(text: string, start: number, end: number): TextAnchor {
  return {
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  };
}

/** How many characters two strings share at their touching ends (prefix: end of a; suffix: start of b). */
function sharedTail(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function sharedHead(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Where the anchor is in (possibly changed) text: first by its offsets, then by searching for
 * the quote and picking the occurrence whose surroundings match best. Null = it's gone.
 */
export function resolveAnchor(
  text: string,
  anchor: TextAnchor,
): { start: number; end: number } | null {
  if (!anchor.quote) return null;
  if (text.slice(anchor.start, anchor.end) === anchor.quote) {
    return { start: anchor.start, end: anchor.end };
  }
  let best: { start: number; score: number } | null = null;
  for (let i = text.indexOf(anchor.quote); i !== -1; i = text.indexOf(anchor.quote, i + 1)) {
    const score =
      sharedTail(text.slice(Math.max(0, i - CONTEXT), i), anchor.prefix) +
      sharedHead(
        text.slice(i + anchor.quote.length, i + anchor.quote.length + CONTEXT),
        anchor.suffix,
      ) -
      Math.abs(i - anchor.start) / 10_000; // tie-break: nearest to where it used to be
    if (!best || score > best.score) best = { start: i, score };
  }
  return best ? { start: best.start, end: best.start + anchor.quote.length } : null;
}

export type Span = { id: string; start: number; end: number; color: string };

export type HighlightChange = {
  /** Existing highlights to shrink, keeping their id. */
  update: Span[];
  /** Pieces split off existing highlights (new ids). */
  create: Span[];
  /** Existing highlights swallowed completely or merged. */
  remove: string[];
  /** The span the new highlight should have (after merging same-colour neighbours). */
  added: { start: number; end: number };
};

/**
 * Adding a highlight over existing ones in the same block: same colour → merge into one;
 * different colour → the new one wins where they overlap, and the old one is trimmed or split.
 */
export function applyHighlight(
  existing: Span[],
  added: { start: number; end: number; color: string },
  newId: () => string,
): HighlightChange {
  const change: HighlightChange = {
    update: [],
    create: [],
    remove: [],
    added: { start: added.start, end: added.end },
  };
  for (const h of existing) {
    const overlaps = h.start < added.end && added.start < h.end;
    const touches = h.end === added.start || h.start === added.end;
    if (h.color === added.color && (overlaps || touches)) {
      change.added.start = Math.min(change.added.start, h.start);
      change.added.end = Math.max(change.added.end, h.end);
      change.remove.push(h.id);
      continue;
    }
    if (!overlaps) continue;
    const left = h.start < added.start ? { start: h.start, end: added.start } : null;
    const right = h.end > added.end ? { start: added.end, end: h.end } : null;
    if (!left && !right) change.remove.push(h.id);
    else if (left && right) {
      change.update.push({ ...h, ...left });
      change.create.push({ id: newId(), color: h.color, ...right });
    } else change.update.push({ ...h, ...(left ?? right)! });
  }
  return change;
}
