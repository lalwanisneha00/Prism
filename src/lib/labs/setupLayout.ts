/*
 * Where each part of a lab setup sits in its drawing (syllabus fix, Phase 7C fixes). Parts are
 * placed in the order the setup runs (following its links: lamp, then lens, then screen), on
 * benches of up to four, and the rows snake (left to right, then right to left) so a chain of
 * parts carries on just below where it left off. The AI only lists parts and links; Prism places
 * them.
 */

export const SETUP_W = 440;
export const ROW_H = 178;
/** Centre of the part's picture, measured from the top of its row. */
export const ICON_Y = 70;

type Part = { id: string; label: string };
type Link = { from: string; to: string };

/** Parts in setup order: each chain from its start (no links coming in), then any left over. */
export function setupOrder(parts: readonly Part[], links: readonly Link[]): string[] {
  const ids = new Set(parts.map((p) => p.id));
  const next = new Map<string, string[]>();
  const incoming = new Set<string>();
  for (const l of links) {
    if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to) continue;
    next.set(l.from, [...(next.get(l.from) ?? []), l.to]);
    incoming.add(l.to);
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
    for (const n of next.get(id) ?? []) visit(n);
  };
  for (const p of parts) if (!incoming.has(p.id)) visit(p.id);
  for (const p of parts) visit(p.id);
  return order;
}

/** How many parts share a bench: all of them up to four, else three or four a row. */
export function perRow(n: number): number {
  if (n <= 4) return Math.max(1, n);
  return n <= 6 || n === 9 ? 3 : 4;
}

/** A label in at most `most` lines of about `max` characters, broken between words. */
export function wrapLabel(label: string, max: number, most = 2): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= max) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  const cut = (l: string) => (l.length > max ? `${l.slice(0, max - 1).trimEnd()}…` : l);
  if (lines.length <= most) return lines.map(cut);
  return [...lines.slice(0, most - 1), cut(lines.slice(most - 1).join(" "))];
}

export type PlacedPart = {
  id: string;
  /** 1-based number in the parts list (the order the lesson lists them). */
  n: number;
  x: number;
  y: number;
  row: number;
  col: number;
  lines: string[];
};

export function layoutSetup(parts: readonly Part[], links: readonly Link[]) {
  const order = setupOrder(parts, links);
  const cols = perRow(parts.length);
  const slot = SETUP_W / cols;
  const chars = Math.floor((slot - 12) / 7.4);
  const placed = new Map<string, PlacedPart>();
  order.forEach((id, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, order.length - row * cols);
    const k = i % cols;
    // Odd rows run right to left; a short last row sits under the end of the row above.
    const col = row % 2 === 0 ? k : cols - 1 - k;
    const shift = row % 2 === 0 ? ((cols - inRow) * slot) / 2 : 0;
    const part = parts.find((p) => p.id === id)!;
    placed.set(id, {
      id,
      n: parts.indexOf(part) + 1,
      x: slot * (col + 0.5) + (row % 2 === 0 ? shift : 0),
      y: row * ROW_H + ICON_Y,
      row,
      col,
      lines: wrapLabel(part.label, chars, 3),
    });
  });
  const rows = Math.ceil(order.length / cols);
  return { placed, rows, height: rows * ROW_H, slot };
}
