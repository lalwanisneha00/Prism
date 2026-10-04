/*
 * Fitting text into a box without a browser: a conservative estimate of how many lines a piece
 * of text takes, so the renderers can pick a font size that fits, and the tests can prove that
 * nothing overflows. Slightly pessimistic on purpose (a little spare room beats a cut-off line).
 */

/** Average character width as a share of the font size (Arial/Verdana/Georgia are ≈ 0.5–0.58). */
export const CHAR_WIDTH = 0.56;
export const LINE_HEIGHT = 1.25;

export function charsPerLine(widthIn: number, pt: number, charWidth = CHAR_WIDTH): number {
  return Math.max(4, Math.floor((widthIn * 72) / (pt * charWidth)));
}

/** Lines needed by word-wrapping `text` at `cpl` characters per line. */
export function countLines(text: string, cpl: number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    let used = 0;
    let n = 1;
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const w = word.length;
      if (used === 0) used = w;
      else if (used + 1 + w <= cpl) used += 1 + w;
      else {
        n++;
        used = w;
      }
      // A word longer than a line breaks across lines.
      while (used > cpl) {
        n++;
        used -= cpl;
      }
    }
    lines += n;
  }
  return lines;
}

/** Height in inches of `items` (paragraphs) set at `pt` in a box `widthIn` wide, with `gapPt` between. */
export function textHeight(items: string[], widthIn: number, pt: number, gapPt = 0): number {
  const cpl = charsPerLine(widthIn, pt);
  const lines = items.reduce((sum, t) => sum + countLines(t, cpl), 0);
  return (lines * pt * LINE_HEIGHT + Math.max(0, items.length - 1) * gapPt) / 72;
}

export type Fit = { pt: number; overflow: boolean };

/** The largest font size (from `max` down to `min`) at which the items fit the box. */
export function fitFont(
  items: string[],
  box: { w: number; h: number },
  max: number,
  min: number,
  gapRatio = 0.4,
): Fit {
  for (let pt = max; pt >= min; pt -= 1) {
    if (textHeight(items, box.w, pt, pt * gapRatio) <= box.h) return { pt, overflow: false };
  }
  return { pt: min, overflow: textHeight(items, box.w, min, min * gapRatio) > box.h };
}

/** Largest rectangle with the image's shape inside a box, centred in it. */
export function containImage(
  img: { width: number; height: number },
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(box.w / img.width, box.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
