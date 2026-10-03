/*
 * Equations made with the old Microsoft Equation 3.0 (and MathType) are saved in slides and
 * documents as small vector pictures: WMF, or the newer EMF. Those pictures still contain
 * every character with its position and font, plus the fraction bars as drawn lines.
 * Like reading a whiteboard from left to right, we put the characters back in order and
 * rebuild fractions (a/b), superscripts (x^2) and subscripts (x_0) from where they sit.
 */

import { symbolChar } from "@/lib/extract/plainText";

export type Piece = { x: number; y: number; text: string; size: number };
export type Bar = { x1: number; x2: number; y: number };

/** The equation's text, or "" when the picture has no text in it (a photo, a diagram). */
export function metafileText(data: Uint8Array): string {
  try {
    const drawn = isEmf(data) ? readEmf(data) : readWmf(data);
    return drawn ? layoutEquation(drawn.pieces, drawn.bars) : "";
  } catch {
    return "";
  }
}

/* ---------- Turning positioned characters back into a line of maths ---------- */

export function layoutEquation(pieces: Piece[], bars: Bar[]): string {
  const visible = pieces.filter((p) => p.text.length > 0);
  if (!visible.some((p) => p.text.trim() !== "")) return "";
  return clusterLines(visible)
    .map((line) => render(line, bars))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Splits pieces into lines: a vertical gap larger than one character height starts a new line. */
function clusterLines(pieces: Piece[]): Piece[][] {
  const sorted = [...pieces].sort((a, b) => a.y - b.y);
  const height = typicalSize(sorted);
  const lines: Piece[][] = [];
  let previous = -Infinity;
  for (const p of sorted) {
    if (lines.length === 0 || p.y - previous > height) lines.push([]);
    lines[lines.length - 1].push(p);
    previous = p.y;
  }
  return lines;
}

const group = (s: string) => (s.length > 1 ? `(${s})` : s);

/**
 * The "normal" font size: the largest size used by a fair share (15%) of the characters.
 * A lone big ∑ or ∫ doesn't count, and many small exponents don't outvote the main line.
 */
function typicalSize(pieces: Piece[]): number {
  const weight = new Map<number, number>();
  let total = 0;
  for (const p of pieces) {
    const w = Math.max(p.text.trim().length, 1);
    weight.set(p.size, (weight.get(p.size) ?? 0) + w);
    total += w;
  }
  const bySize = [...weight].sort((a, b) => b[0] - a[0]);
  return bySize.find(([, w]) => w >= total * 0.15)?.[0] ?? bySize[0]?.[0] ?? 1;
}

function render(pieces: Piece[], bars: Bar[]): string {
  if (pieces.length === 0) return "";
  const main = typicalSize(pieces);
  const tokens: { x: number; text: string }[] = [];
  let rest = pieces;

  // Fractions: the widest bar first, so a fraction inside a fraction is handled inside it.
  const nearby = bars
    .filter((b) => b.x2 - b.x1 > main * 0.3)
    .filter((b) => pieces.some((p) => inBar(p, b, main)))
    .sort((a, b) => b.x2 - b.x1 - (a.x2 - a.x1));
  const used = new Set<Bar>();
  for (const bar of nearby) {
    if (used.has(bar)) continue;
    const inside = rest.filter((p) => inBar(p, bar, main));
    const top = inside.filter((p) => p.y < bar.y);
    const bottom = inside.filter((p) => p.y >= bar.y);
    if (top.length === 0 || bottom.length === 0) continue;
    const inner = nearby.filter(
      (b) => b !== bar && b.x1 >= bar.x1 - 1 && b.x2 <= bar.x2 + 1 && !used.has(b),
    );
    inner.forEach((b) => used.add(b));
    used.add(bar);
    rest = rest.filter((p) => !inside.includes(p));
    tokens.push({
      x: bar.x1,
      text: ` ${group(render(top, inner))}/${group(render(bottom, inner))} `,
    });
  }

  // The baseline is where most normal-size characters sit; smaller ones are scripts.
  const isScript = (p: Piece) => p.size < main * 0.85 && p.text.trim() !== "";
  const normal = rest.filter((p) => !isScript(p));
  const baseline =
    mostCommon(normal.filter((p) => p.size <= main * 1.15).map((p) => p.y)) ?? rest[0]?.y ?? 0;
  for (const p of normal) tokens.push({ x: p.x, text: p.text });

  // Neighbouring script characters on the same side form one script: ∑ with n=0 below → _(n=0).
  const scripts = rest.filter(isScript).sort((a, b) => a.x - b.x);
  const groups: { side: string; pieces: Piece[]; end: number }[] = [];
  for (const p of scripts) {
    const side = p.y < baseline ? "^" : "_";
    const last = groups.findLast((g) => g.side === side);
    const lastX = last?.pieces[last.pieces.length - 1].x ?? 0;
    // A normal character in between (the e in y²e^xy) ends the script.
    const interrupted = normal.some((n) => n.text.trim() && n.x > lastX && n.x < p.x);
    if (last && !interrupted && p.x - last.end < main * 0.8) {
      last.pieces.push(p);
      last.end = Math.max(last.end, p.x + p.text.length * p.size * 0.55);
    } else {
      groups.push({ side, pieces: [p], end: p.x + p.text.length * p.size * 0.55 });
    }
  }
  for (const g of groups) {
    tokens.push({ x: g.pieces[0].x, text: `${g.side}${group(render(g.pieces, []).trim())}` });
  }
  return tokens
    .sort((a, b) => a.x - b.x)
    .map((t) => t.text)
    .join("");
}

function inBar(p: Piece, bar: Bar, size: number): boolean {
  // A small exponent at the end of a denominator (∂y²) may stick out past the bar a little.
  const overhang = p.size < size * 0.85 ? size * 0.4 : 0;
  return (
    p.x >= bar.x1 - size * 0.15 && p.x < bar.x2 + overhang && Math.abs(p.y - bar.y) < size * 1.6
  );
}

function mostCommon(values: number[]): number | undefined {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | undefined;
  let bestCount = 0;
  for (const [v, n] of counts) {
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  }
  return best;
}

/* ---------- Fonts ---------- */

type Font = { size: number; face: string };

/** Characters in the Symbol and MT Extra fonts are drawn as other letters (D shows Δ). */
function decodeChars(bytes: Uint8Array, font: Font | undefined): string {
  const face = font?.face.toLowerCase() ?? "";
  if (face === "symbol") return Array.from(bytes, symbolChar).join("");
  if (face === "mt extra") {
    return Array.from(bytes, (b) => MT_EXTRA[b] ?? String.fromCharCode(b)).join("");
  }
  return new TextDecoder("windows-1252").decode(bytes);
}

/** The few MT Extra characters equations use most. */
const MT_EXTRA: Record<number, string> = {
  0x4c: "…",
  0x4d: "⋯",
  0x51: "∼",
  0x60: "ℓ",
  0x68: "ℏ",
  0x6c: "ℓ",
  0x26: "→",
};

/* ---------- WMF (Windows Metafile) ---------- */

function readWmf(data: Uint8Array): { pieces: Piece[]; bars: Bar[] } | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = view.getUint32(0, true) === 0x9ac6cdd7 ? 22 : 0; // optional "placeable" header
  if (offset + 18 > data.length) return null;
  const headerWords = view.getUint16(offset + 2, true);
  const objectCount = view.getUint16(offset + 10, true);
  if (headerWords !== 9) return null;
  offset += 18;

  const objects: (Font | "other" | null)[] = new Array(Math.max(objectCount, 1)).fill(null);
  const create = (obj: Font | "other") => {
    const free = objects.indexOf(null);
    if (free === -1) objects.push(obj);
    else objects[free] = obj;
  };
  let font: Font | undefined;
  let pen = { x: 0, y: 0 };
  const pieces: Piece[] = [];
  const bars: Bar[] = [];

  while (offset + 6 <= data.length) {
    const size = view.getUint32(offset, true) * 2;
    const fn = view.getUint16(offset + 4, true);
    if (size < 6 || offset + size > data.length || fn === 0) break;
    const p = offset + 6;
    switch (fn) {
      case 0x02fb: {
        // CREATEFONTINDIRECT: height, width, escapement, orientation, weight, 8 flag bytes, face
        const face = new TextDecoder("latin1")
          .decode(data.subarray(p + 18, Math.min(p + 50, offset + size)))
          .split("\0")[0];
        create({ size: Math.abs(view.getInt16(p, true)), face });
        break;
      }
      case 0x00f7: // CREATEPALETTE
      case 0x01f9: // CREATEPATTERNBRUSH
      case 0x02fa: // CREATEPENINDIRECT
      case 0x02fc: // CREATEBRUSHINDIRECT
      case 0x06ff: // CREATEREGION
      case 0x0142: // DIBCREATEPATTERNBRUSH
        create("other");
        break;
      case 0x012d: {
        // SELECTOBJECT
        const obj = objects[view.getUint16(p, true)];
        if (obj && obj !== "other") font = obj;
        break;
      }
      case 0x01f0: // DELETEOBJECT
        objects[view.getUint16(p, true)] = null;
        break;
      case 0x0214: // MOVETO (y, x)
        pen = { y: view.getInt16(p, true), x: view.getInt16(p + 2, true) };
        break;
      case 0x0213: {
        // LINETO (y, x): a horizontal stroke can be a fraction bar
        const to = { y: view.getInt16(p, true), x: view.getInt16(p + 2, true) };
        if (Math.abs(to.y - pen.y) <= 1 && to.x !== pen.x) {
          bars.push({ x1: Math.min(pen.x, to.x), x2: Math.max(pen.x, to.x), y: to.y });
        }
        pen = to;
        break;
      }
      case 0x041b: {
        // RECTANGLE (bottom, right, top, left): a thin wide one is a fraction bar
        const bottom = view.getInt16(p, true);
        const right = view.getInt16(p + 2, true);
        const top = view.getInt16(p + 4, true);
        const left = view.getInt16(p + 6, true);
        if (Math.abs(bottom - top) * 4 < Math.abs(right - left)) {
          bars.push({
            x1: Math.min(left, right),
            x2: Math.max(left, right),
            y: (top + bottom) / 2,
          });
        }
        break;
      }
      case 0x0521: {
        // TEXTOUT: length, string (padded to even), y, x
        const n = view.getInt16(p, true);
        const padded = n + (n % 2);
        if (n > 0 && p + 2 + padded + 4 <= offset + size) {
          pieces.push({
            text: decodeChars(data.subarray(p + 2, p + 2 + n), font),
            y: view.getInt16(p + 2 + padded, true),
            x: view.getInt16(p + 4 + padded, true),
            size: font?.size ?? 1,
          });
        }
        break;
      }
      case 0x0a32: {
        // EXTTEXTOUT: y, x, length, options, [clip rectangle], string
        const y = view.getInt16(p, true);
        const x = view.getInt16(p + 2, true);
        const n = view.getInt16(p + 4, true);
        const options = view.getUint16(p + 6, true);
        const start = p + 8 + (options & 0x0006 ? 8 : 0);
        if (n > 0 && start + n <= offset + size) {
          pieces.push({
            text: decodeChars(data.subarray(start, start + n), font),
            x,
            y,
            size: font?.size ?? 1,
          });
        }
        break;
      }
    }
    offset += size;
  }
  return { pieces, bars };
}

/* ---------- EMF (Enhanced Metafile) ---------- */

function isEmf(data: Uint8Array): boolean {
  return (
    data.length > 44 &&
    data[0] === 1 &&
    data[1] === 0 &&
    data[2] === 0 &&
    data[3] === 0 &&
    data[40] === 0x20 &&
    data[41] === 0x45 &&
    data[42] === 0x4d &&
    data[43] === 0x46
  );
}

function readEmf(data: Uint8Array): { pieces: Piece[]; bars: Bar[] } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const objects = new Map<number, Font>();
  let font: Font | undefined;
  let pen = { x: 0, y: 0 };
  const pieces: Piece[] = [];
  const bars: Bar[] = [];
  let offset = 0;

  while (offset + 8 <= data.length) {
    const type = view.getUint32(offset, true);
    const size = view.getUint32(offset + 4, true);
    if (size < 8 || offset + size > data.length) break;
    switch (type) {
      case 82: {
        // EXTCREATEFONTINDIRECTW: index, then LOGFONTW (height … 28 bytes, face as UTF-16)
        const face = new TextDecoder("utf-16le")
          .decode(data.subarray(offset + 40, Math.min(offset + 104, offset + size)))
          .split("\0")[0];
        objects.set(view.getUint32(offset + 8, true), {
          size: Math.abs(view.getInt32(offset + 12, true)),
          face,
        });
        break;
      }
      case 37: {
        // SELECTOBJECT (stock objects have the top bit set and aren't fonts we made)
        const selected = objects.get(view.getUint32(offset + 8, true));
        if (selected) font = selected;
        break;
      }
      case 40: // DELETEOBJECT
        objects.delete(view.getUint32(offset + 8, true));
        break;
      case 27: // MOVETOEX
        pen = { x: view.getInt32(offset + 8, true), y: view.getInt32(offset + 12, true) };
        break;
      case 54: {
        // LINETO
        const to = { x: view.getInt32(offset + 8, true), y: view.getInt32(offset + 12, true) };
        if (Math.abs(to.y - pen.y) <= 1 && to.x !== pen.x) {
          bars.push({ x1: Math.min(pen.x, to.x), x2: Math.max(pen.x, to.x), y: to.y });
        }
        pen = to;
        break;
      }
      case 84: {
        // EXTTEXTOUTW: bounds, mode, scales, then the text record
        const x = view.getInt32(offset + 36, true);
        const y = view.getInt32(offset + 40, true);
        const n = view.getUint32(offset + 44, true);
        const at = offset + view.getUint32(offset + 48, true);
        if (n > 0 && at + n * 2 <= offset + size) {
          const codes = Array.from({ length: n }, (_, i) => view.getUint16(at + i * 2, true));
          const symbol = font?.face.toLowerCase() === "symbol";
          // Symbol-font characters are stored at U+F000 + code.
          const text = codes
            .map((c) =>
              symbol || (c >= 0xf020 && c <= 0xf0ff)
                ? symbolChar(c & 0xff)
                : String.fromCharCode(c),
            )
            .join("");
          pieces.push({ text, x, y, size: font?.size ?? 1 });
        }
        break;
      }
    }
    offset += size;
  }
  return { pieces, bars };
}
