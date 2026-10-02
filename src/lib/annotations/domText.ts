/*
 * Turning page text into character positions and back (browser only). A block's "text" is
 * every visible text node in it, in order, skipping KaTeX's hidden copy of each formula and
 * our own note buttons, so the positions stay the same every time the lesson is drawn.
 */

type Piece = { node: Text; start: number };
export type BlockText = { text: string; pieces: Piece[] };

function skip(node: Node, root: Element): boolean {
  for (let el = node.parentElement; el && el !== root; el = el.parentElement) {
    if (el.classList.contains("katex-mathml") || el.hasAttribute("data-anno-skip")) return true;
  }
  return false;
}

export function blockText(root: Element): BlockText {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pieces: Piece[] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (!t.data || skip(t, root)) continue;
    pieces.push({ node: t, start: text.length });
    text += t.data;
  }
  return { text, pieces };
}

/** The character position of a point (container, offset) inside a block. */
export function offsetOf(bt: BlockText, container: Node, offset: number): number {
  const exact = bt.pieces.find((p) => p.node === container);
  if (exact) return exact.start + Math.min(offset, exact.node.length);
  // The point sits between elements: count every text piece that starts before it.
  const point = document.createRange();
  point.setStart(container, offset);
  point.collapse(true);
  for (const p of bt.pieces) {
    if (point.comparePoint(p.node, 0) >= 0) return p.start;
  }
  return bt.text.length;
}

export function rangeToOffsets(bt: BlockText, range: Range): { start: number; end: number } {
  const start = offsetOf(bt, range.startContainer, range.startOffset);
  const end = offsetOf(bt, range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/** A DOM Range covering characters [start, end) of a block, or null if out of bounds. */
export function offsetsToRange(bt: BlockText, start: number, end: number): Range | null {
  if (start >= end || end > bt.text.length) return null;
  const at = (pos: number, isEnd: boolean) => {
    for (let i = bt.pieces.length - 1; i >= 0; i--) {
      const p = bt.pieces[i];
      if (isEnd ? p.start < pos : p.start <= pos) return { node: p.node, offset: pos - p.start };
    }
    return null;
  };
  const s = at(start, false);
  const e = at(end, true);
  if (!s || !e) return null;
  const range = document.createRange();
  range.setStart(s.node, Math.min(s.offset, s.node.length));
  range.setEnd(e.node, Math.min(e.offset, e.node.length));
  return range;
}

/** The text position under a tap or click (for opening the highlight that was tapped). */
export function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (pos) return { node: pos.offsetNode, offset: pos.offset };
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

/** True when this browser can paint highlights without changing the page (CSS Highlight API). */
export function canHighlight(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}
