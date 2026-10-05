import type { Color, PDFDocument, PDFFont, PDFImage, PDFPage } from "pdf-lib";
import type { ImageMap } from "@/lib/slides/pptx";
import type { Picture, Slide, SlidePlan } from "@/lib/slides/plan";
import { SPECTRUM, type Theme } from "@/lib/slides/themes";

/*
 * Slide plan → a designed PDF (Feature B). Laid out as pages, not printed slides: a cover, a
 * contents page for long documents, content flowing onto A4 pages with page numbers, real
 * selectable text in embedded fonts (Noto Sans and Noto Serif, so Greek letters work) and the
 * same four looks as the decks. Each block is measured first and drawn second by the same code,
 * so what was measured is exactly what is drawn.
 */

export type PdfFonts = {
  sans: Uint8Array;
  sansBold: Uint8Array;
  serif: Uint8Array;
  serifBold: Uint8Array;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 56;
const TOP = 78;
const BOTTOM = 70;
const CW = PAGE_W - 2 * MX;
const GAP = 20;
/** A document with at least this many content pages gets a contents page. */
export const CONTENTS_FROM_PAGES = 6;

/** Print-friendly palette: dark themes use a light page with the theme's colours as accents. */
function palette(t: Theme) {
  switch (t.id) {
    case "chalk":
      return {
        bg: "FBFAF5",
        ink: "22302F",
        muted: "5D6B66",
        accent: "A67800",
        accent2: "2E7D5B",
        card: "EEF2EF",
        rule: "22302F",
        onAccent: "FFFFFF",
      };
    case "blueprint":
      return {
        bg: "FFFFFF",
        ink: "0F2438",
        muted: "4F6A80",
        accent: "0B7FA3",
        accent2: "B86A12",
        card: "EAF3F8",
        rule: "0F2438",
        onAccent: "FFFFFF",
      };
    default:
      return {
        bg: t.bg,
        ink: t.ink,
        muted: t.muted,
        accent: t.accent,
        accent2: t.accent2,
        card: t.card,
        rule: t.rule,
        onAccent: t.onAccent,
      };
  }
}
type Pal = ReturnType<typeof palette>;

type Embedded = { image: PDFImage; w: number; h: number };

type Ctx = {
  doc: PDFDocument;
  sans: PDFFont;
  sansBold: PDFFont;
  serif: PDFFont;
  serifBold: PDFFont;
  glyphs: Map<PDFFont, Set<number>>;
  pal: Pal;
  theme: Theme;
  plan: SlidePlan;
  rgb: (hex: string) => Color;
  images: Map<string, Embedded>;
};

type Page = PDFPage | null;

/** Replaces characters the font cannot draw (rare symbols, combining marks) so nothing breaks. */
function clean(text: string, font: PDFFont, glyphs: Map<PDFFont, Set<number>>): string {
  let set = glyphs.get(font);
  if (!set) {
    set = new Set(font.getCharacterSet());
    glyphs.set(font, set);
  }
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (cp === 0x0a || cp === 0x20 || set.has(cp)) out += ch;
    else if (cp >= 0x300 && cp <= 0x36f) continue;
    else if (cp === 0x2009 || cp === 0x202f || cp === 0xa0) out += " ";
    else out += "·";
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > width) n--;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

type TextOpts = {
  font: PDFFont;
  size: number;
  color: string;
  lh?: number;
  align?: "left" | "center" | "right";
};

/** Draws (page given) or measures (page null) wrapped text at x, y (from the top); returns its height. */
function para(
  c: Ctx,
  page: Page,
  text: string,
  x: number,
  y: number,
  w: number,
  o: TextOpts,
): number {
  const lines = wrap(clean(text, o.font, c.glyphs), o.font, o.size, w);
  const lh = o.size * (o.lh ?? 1.42);
  if (page) {
    lines.forEach((l, i) => {
      const lw = o.font.widthOfTextAtSize(l, o.size);
      const dx = o.align === "center" ? (w - lw) / 2 : o.align === "right" ? w - lw : 0;
      page.drawText(l, {
        x: x + dx,
        y: PAGE_H - y - i * lh - o.size,
        size: o.size,
        font: o.font,
        color: c.rgb(o.color),
      });
    });
  }
  return lines.length * lh;
}

function box(
  c: Ctx,
  page: Page,
  x: number,
  y: number,
  w: number,
  h: number,
  fill?: string,
  stroke?: string,
  strokeWidth = 0.6,
) {
  if (!page) return;
  page.drawRectangle({
    x,
    y: PAGE_H - y - h,
    width: w,
    height: h,
    ...(fill ? { color: c.rgb(fill) } : {}),
    ...(stroke ? { borderColor: c.rgb(stroke), borderWidth: strokeWidth } : {}),
  });
}

const headFont = (c: Ctx) => (c.theme.pdfHeading === "serif" ? c.serifBold : c.sansBold);
const upper = (c: Ctx, s: string) => (c.theme.upper ? s.toUpperCase() : s);

/** A block's heading: bold title and a short accent rule beneath it. */
function heading(c: Ctx, page: Page, title: string, x: number, y: number, w: number): number {
  const h = para(c, page, upper(c, title), x, y, w, {
    font: headFont(c),
    size: 17,
    color: c.pal.ink,
    lh: 1.25,
  });
  box(c, page, x, y + h + 4, 34, c.theme.id === "chalk" ? 3.5 : 2.2, c.pal.accent);
  return h + 16;
}

function label(
  c: Ctx,
  page: Page,
  text: string,
  x: number,
  y: number,
  w: number,
  color?: string,
): number {
  return para(c, page, text.toUpperCase(), x, y, w, {
    font: c.sansBold,
    size: 8,
    color: color ?? c.pal.accent,
    lh: 1.3,
  });
}

function bullets(
  c: Ctx,
  page: Page,
  points: string[],
  x: number,
  y: number,
  w: number,
  size = 11,
  color?: string,
): number {
  let used = 0;
  for (const p of points) {
    box(c, page, x, y + used + size * 0.42, 4, 4, c.pal.accent);
    used +=
      para(c, page, p, x + 14, y + used, w - 14, {
        font: c.sans,
        size,
        color: color ?? c.pal.ink,
      }) + 4;
  }
  return used;
}

function numbered(
  c: Ctx,
  page: Page,
  rows: { n: string; text: string }[],
  x: number,
  y: number,
  w: number,
  size = 11,
): number {
  let used = 0;
  for (const r of rows) {
    para(c, page, r.n, x, y + used, 24, { font: c.sansBold, size, color: c.pal.accent });
    used +=
      para(c, page, r.text, x + 26, y + used, w - 26, { font: c.sans, size, color: c.pal.ink }) + 5;
  }
  return used;
}

function picture(
  c: Ctx,
  page: Page,
  pic: Picture,
  x: number,
  y: number,
  w: number,
  maxH: number,
  centered = true,
): number {
  const e = c.images.get(pic.key);
  if (!e) return 0;
  const scale = Math.min(w / e.w, maxH / e.h, 1.6);
  const iw = e.w * scale;
  const ih = e.h * scale;
  const ix = centered ? x + (w - iw) / 2 : x;
  box(c, page, ix - 8, y, iw + 16, ih + 16, "FFFFFF", c.pal.rule + "");
  if (page) page.drawImage(e.image, { x: ix, y: PAGE_H - y - 8 - ih, width: iw, height: ih });
  let used = ih + 16;
  if (pic.caption) {
    used +=
      6 +
      para(c, page, pic.caption, x, y + used + 6, w, {
        font: c.sans,
        size: 8.5,
        color: c.pal.muted,
        align: centered ? "center" : "left",
      });
  }
  return used;
}

/** Measures (page null) or draws one slide as a block; returns its height. */
function block(c: Ctx, page: Page, s: Slide, x: number, y: number, w: number): number {
  const p = c.pal;
  let h = 0;
  switch (s.layout) {
    case "title":
      return 0; // the cover is drawn separately
    case "section": {
      box(c, page, x, y, w, 3, p.accent);
      h += 14;
      if (s.kicker) h += label(c, page, s.kicker, x, y + h, w) + 2;
      h += para(c, page, upper(c, s.title), x, y + h, w, {
        font: headFont(c),
        size: 26,
        color: p.ink,
        lh: 1.2,
      });
      return h + 6;
    }
    case "statement": {
      let inner = 0;
      if (s.label) inner += label(c, page, s.label, x + 16, y, w - 16) + 3;
      inner += para(c, page, s.text, x + 16, y + inner, w - 16, {
        font: c.serifBold,
        size: 15,
        color: p.ink,
        lh: 1.35,
      });
      box(c, page, x, y, 3, inner, p.accent);
      return inner;
    }
    case "bullets":
    case "recap": {
      h += heading(c, page, s.title, x, y, w);
      return h + bullets(c, page, s.points, x, y + h, w);
    }
    case "two-column": {
      h += heading(c, page, s.title, x, y, w);
      const cw = (w - 16) / 2;
      const draw = (col: typeof s.left, cx: number, accent: string, page2: Page) => {
        let used = 10;
        used += label(c, page2, col.heading, cx + 10, y + h + used, cw - 20, accent) + 4;
        used += bullets(c, page2, col.points, cx + 10, y + h + used, cw - 20, 10);
        return used + 10;
      };
      const ch = Math.max(
        draw(s.left, x, p.accent, null),
        draw(s.right, x + cw + 16, p.accent2, null),
      );
      box(c, page, x, y + h, cw, ch, p.card, p.rule + "");
      box(c, page, x + cw + 16, y + h, cw, ch, p.card, p.rule + "");
      draw(s.left, x, p.accent, page);
      draw(s.right, x + cw + 16, p.accent2, page);
      return h + ch;
    }
    case "steps": {
      h += heading(c, page, s.title, x, y, w);
      return (
        h +
        numbered(
          c,
          page,
          s.steps.map((t, i) => ({ n: `${i + 1}`, text: t })),
          x,
          y + h,
          w,
        )
      );
    }
    case "comparison": {
      h += heading(c, page, s.title, x, y, w);
      const cols = s.columns.length;
      const cw = w / cols;
      const rowH = (cells: string[], font: PDFFont, size: number) =>
        Math.max(
          ...cells.map((t, i) =>
            para(c, null, t, x + i * cw + 6, 0, cw - 12, { font, size, color: p.ink }),
          ),
        ) + 10;
      const headH = rowH(s.columns, c.sansBold, 9.5);
      box(c, page, x, y + h, w, headH, p.accent);
      s.columns.forEach((t, i) =>
        para(c, page, t, x + i * cw + 6, y + h + 5, cw - 12, {
          font: c.sansBold,
          size: 9.5,
          color: p.onAccent,
        }),
      );
      let used = headH;
      s.rows.forEach((r, ri) => {
        const cells = s.columns.map((_, i) => r[i] ?? "");
        const rh = rowH(cells, c.sans, 10);
        box(c, page, x, y + h + used, w, rh, ri % 2 === 0 ? p.card : p.bg, p.rule + "", 0.3);
        cells.forEach((t, i) =>
          para(c, page, t, x + i * cw + 6, y + h + used + 5, cw - 12, {
            font: c.sans,
            size: 10,
            color: p.ink,
          }),
        );
        used += rh;
      });
      return h + used;
    }
    case "image": {
      if (s.title) h += heading(c, page, s.title, x, y, w);
      h += picture(c, page, s.picture, x, y + h, w, s.side === "full" ? 330 : 270) + 8;
      if (s.points.length > 0) h += bullets(c, page, s.points, x, y + h, w, 10.5);
      return h;
    }
    case "formula": {
      h += heading(c, page, s.title, x, y, w);
      for (const f of s.formulas)
        h += picture(c, page, { ...f, caption: "" }, x + 30, y + h, w - 60, 64) + 10;
      return h;
    }
    case "example": {
      h += heading(c, page, s.title, x, y, w);
      const inner = w - 24;
      const problem = para(c, null, s.problem, x + 12, 0, inner, {
        font: c.sans,
        size: 11,
        color: p.ink,
      });
      box(c, page, x, y + h, w, problem + 30, p.card, p.rule + "");
      label(c, page, "The problem", x + 12, y + h + 8, inner);
      para(c, page, s.problem, x + 12, y + h + 20, inner, { font: c.sans, size: 11, color: p.ink });
      h += problem + 40;
      h += numbered(
        c,
        page,
        s.steps.map((t, i) => ({ n: `${i + 1}`, text: t })),
        x,
        y + h,
        w,
        10.5,
      );
      const ans = para(c, null, `Answer: ${s.answer}`, x + 12, 0, inner, {
        font: c.sansBold,
        size: 11,
        color: p.onAccent,
      });
      box(c, page, x, y + h + 4, w, ans + 16, p.accent);
      para(c, page, `Answer: ${s.answer}`, x + 12, y + h + 12, inner, {
        font: c.sansBold,
        size: 11,
        color: p.onAccent,
      });
      return h + ans + 20;
    }
    case "quiz": {
      h += heading(c, page, s.title, x, y, w);
      h += para(c, page, s.question, x, y + h, w, { font: c.serif, size: 12, color: p.ink }) + 6;
      if (s.options.length > 0) {
        h += numbered(
          c,
          page,
          s.options.map((o, i) => ({ n: `${String.fromCharCode(65 + i)}.`, text: o })),
          x + 6,
          y + h,
          w - 6,
          10.5,
        );
      }
      if (s.showAnswer) {
        const text = `Answer: ${s.answer}${s.explanation ? `. ${s.explanation}` : ""}`;
        const ah = para(c, null, text, x + 12, 0, w - 24, { font: c.sans, size: 10, color: p.ink });
        box(c, page, x, y + h + 2, w, ah + 16, p.card, p.accent2);
        para(c, page, text, x + 12, y + h + 10, w - 24, { font: c.sans, size: 10, color: p.ink });
        h += ah + 20;
      }
      return h;
    }
    case "activity": {
      h += label(c, page, `Activity · ${s.minutes} min`, x, y, w) + 2;
      h += heading(c, page, s.title, x, y + h, w);
      const ph = para(c, null, s.prompt, x + 14, 0, w - 28, {
        font: c.serifBold,
        size: 13,
        color: p.ink,
      });
      box(c, page, x, y + h, w, ph + 24, p.card, p.accent, 1);
      para(c, page, s.prompt, x + 14, y + h + 12, w - 28, {
        font: c.serifBold,
        size: 13,
        color: p.ink,
      });
      return h + ph + 24;
    }
    case "questions": {
      h += heading(c, page, s.title, x, y, w);
      return (
        h +
        numbered(
          c,
          page,
          s.items.map((i) => ({ n: `${i.n}.`, text: i.text })),
          x,
          y + h,
          w,
          11.5,
        ) +
        // Space to write the working.
        0
      );
    }
    case "answers": {
      h += heading(c, page, s.title, x, y, w);
      return (
        h +
        numbered(
          c,
          page,
          s.items.map((i) => ({ n: `${i.n}.`, text: i.why ? `${i.answer}. ${i.why}` : i.answer })),
          x,
          y + h,
          w,
          10.5,
        )
      );
    }
    case "sources": {
      h += heading(c, page, s.title, x, y, w);
      return (
        h +
        bullets(
          c,
          page,
          s.items.map((i) => (i.detail ? `${i.label}. ${i.detail}` : i.label)),
          x,
          y + h,
          w,
          9,
          p.muted,
        )
      );
    }
    case "summary": {
      h += para(c, page, upper(c, s.title), x, y, w, {
        font: headFont(c),
        size: 22,
        color: p.ink,
        lh: 1.2,
      });
      box(c, page, x, y + h + 4, 44, 3, p.accent);
      h += 22;
      h += label(c, page, "Key points", x, y + h, w) + 4;
      h += bullets(c, page, s.points, x, y + h, w, 11.5) + 10;
      if (s.formulas.length > 0) {
        h += label(c, page, "Formulas", x, y + h, w) + 6;
        for (const f of s.formulas)
          h += picture(c, page, { ...f, caption: "" }, x + 20, y + h, w - 40, 56) + 8;
      }
      if (s.mnemonic) {
        const mh = para(c, null, `Remember: ${s.mnemonic}`, x + 12, 0, w - 24, {
          font: c.serif,
          size: 11,
          color: p.ink,
        });
        box(c, page, x, y + h + 6, w, mh + 18, p.card, p.accent2);
        para(c, page, `Remember: ${s.mnemonic}`, x + 12, y + h + 15, w - 24, {
          font: c.serif,
          size: 11,
          color: p.ink,
        });
        h += mh + 26;
      }
      return h;
    }
  }
}

/** Teacher notes under a block, for teaching documents. */
function notesBlock(c: Ctx, page: Page, s: Slide, x: number, y: number, w: number): number {
  if (c.plan.purpose !== "teach" || !s.notes || s.layout === "sources" || s.layout === "title")
    return 0;
  const h = para(c, page, `Teacher notes: ${s.notes}`, x + 10, y + 4, w - 10, {
    font: c.sans,
    size: 8.5,
    color: c.pal.muted,
    lh: 1.4,
  });
  box(c, page, x, y + 4, 2, h, c.pal.accent2);
  return h + 8;
}

/** The theme's recurring detail on a page, then the footer. */
function pageFrame(c: Ctx, page: PDFPage, number: number | null, cover = false) {
  const t = c.theme;
  const col = cover ? t.accent : c.pal.accent;
  const line = (x: number, y: number, w: number, h: number, color: string) =>
    box(c, page, x, y, w, h, color);
  switch (t.detail) {
    case "double-rule":
      line(MX, 34, CW, 1.6, cover ? t.rule : c.pal.rule);
      line(MX, 39, CW, 0.5, cover ? t.rule : c.pal.rule);
      break;
    case "chalk-line":
      line(0, 0, PAGE_W, 9, col);
      break;
    case "corner-ticks":
      for (const [x, y, dx, dy] of [
        [24, 24, 1, 1],
        [PAGE_W - 24, 24, -1, 1],
        [24, PAGE_H - 24, 1, -1],
        [PAGE_W - 24, PAGE_H - 24, -1, -1],
      ] as const) {
        line(Math.min(x, x + dx * 18), y, 18, 0.8, col);
        line(x, Math.min(y, y + dy * 18), 0.8, 18, col);
      }
      break;
    case "spectrum-bar":
      SPECTRUM.forEach((color, i) => line((PAGE_W / 6) * i, PAGE_H - 8, PAGE_W / 6, 8, color));
      break;
  }
  if (number === null) return;
  const text = t.id === "blueprint" ? `SHEET ${String(number).padStart(2, "0")}` : `${number}`;
  para(c, page, text, MX, PAGE_H - 44, CW, {
    font: c.sans,
    size: 9,
    color: c.pal.muted,
    align: "right",
  });
  para(c, page, c.plan.title, MX, PAGE_H - 44, CW - 60, {
    font: c.sans,
    size: 9,
    color: c.pal.muted,
  });
}

function drawCover(c: Ctx, page: PDFPage, slide: Extract<Slide, { layout: "title" }>) {
  const t = c.theme;
  box(c, page, 0, 0, PAGE_W, PAGE_H, t.bg);
  pageFrame(c, page, null, true);
  const x = MX + 6;
  const tagH = para(c, page, slide.tag.toUpperCase(), x, 250, CW - 12, {
    font: c.sansBold,
    size: 10,
    color: t.accent,
  });
  const th = para(c, page, upper(c, slide.title), x, 250 + tagH + 8, CW - 12, {
    font: c.theme.pdfHeading === "serif" ? c.serifBold : c.sansBold,
    size: 34,
    color: t.ink,
    lh: 1.18,
  });
  box(c, page, x, 250 + tagH + th + 24, 60, 4, t.accent);
  para(c, page, slide.subtitle, x, 250 + tagH + th + 44, CW - 12, {
    font: c.sans,
    size: 14,
    color: t.muted,
  });
}

type Placed = { slide: Slide; y: number; h: number };

/** Flows blocks onto pages (measure only). Sections and the answers divider start a new page. */
function layout(c: Ctx, slides: Slide[]): Placed[][] {
  const pages: Placed[][] = [[]];
  let y = TOP;
  const limit = PAGE_H - BOTTOM;
  for (const slide of slides) {
    const h = block(c, null, slide, MX, 0, CW) + notesBlock(c, null, slide, MX, 0, CW);
    if (h === 0) continue;
    const force =
      (slide.layout === "section" || slide.layout === "summary") && pages.at(-1)!.length > 0;
    if (force || (y + h > limit && pages.at(-1)!.length > 0)) {
      pages.push([]);
      y = TOP;
    }
    pages.at(-1)!.push({ slide, y, h });
    y += h + GAP;
  }
  return pages;
}

const tocTitle = (s: Slide): string | null => {
  switch (s.layout) {
    case "section":
    case "bullets":
    case "two-column":
    case "steps":
    case "comparison":
    case "formula":
    case "example":
    case "activity":
    case "recap":
    case "questions":
    case "answers":
    case "sources":
    case "summary":
      return s.title;
    case "image":
      return s.title || null;
    default:
      return null;
  }
};

function drawContents(c: Ctx, page: PDFPage, entries: { title: string; page: number }[]) {
  pageFrame(c, page, 2);
  let y = TOP;
  y += heading(c, page, "Contents", MX, y, CW) + 8;
  for (const e of entries.slice(0, 34)) {
    para(c, page, e.title, MX, y, CW - 40, { font: c.sans, size: 11, color: c.pal.ink });
    para(c, page, String(e.page), MX, y, CW, {
      font: c.sans,
      size: 11,
      color: c.pal.muted,
      align: "right",
    });
    box(c, page, MX, y + 17, CW, 0.3, c.pal.muted);
    y += 21;
  }
}

function dataUrlBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Builds the PDF bytes for a plan (browser, or tests with stand-in fonts and images). */
export async function renderPdf(
  plan: SlidePlan,
  theme: Theme,
  images: ImageMap,
  fonts: PdfFonts,
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(plan.title);
  doc.setSubject(plan.subject);
  doc.setAuthor("Prism");
  doc.setCreator("Prism");
  doc.setProducer("Prism");
  const [sans, sansBold, serif, serifBold] = await Promise.all([
    doc.embedFont(fonts.sans, { subset: false }),
    doc.embedFont(fonts.sansBold, { subset: false }),
    doc.embedFont(fonts.serif, { subset: false }),
    doc.embedFont(fonts.serifBold, { subset: false }),
  ]);
  const hex = (h: string) => {
    const n = Number.parseInt(h.replace("#", "").slice(0, 6), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  };
  const embedded = new Map<string, Embedded>();
  for (const [key, img] of Object.entries(images)) {
    const png = await doc.embedPng(dataUrlBytes(img.dataUrl));
    embedded.set(key, { image: png, w: img.width, h: img.height });
  }
  const c: Ctx = {
    doc,
    sans,
    sansBold,
    serif,
    serifBold,
    glyphs: new Map(),
    pal: palette(theme),
    theme,
    plan,
    rgb: hex,
    images: embedded,
  };

  const addPage = () => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    box(c, page, 0, 0, PAGE_W, PAGE_H, c.pal.bg);
    return page;
  };

  const cover = plan.slides.find((s) => s.layout === "title");
  const body = plan.slides.filter((s) => s.layout !== "title");
  const pages = layout(c, body);
  const hasCover = Boolean(cover) && plan.purpose !== "summary";
  const hasContents = hasCover && pages.length >= CONTENTS_FROM_PAGES;
  const offset = (hasCover ? 1 : 0) + (hasContents ? 1 : 0);

  if (hasCover && cover?.layout === "title") drawCover(c, doc.addPage([PAGE_W, PAGE_H]), cover);
  if (hasContents) {
    const entries: { title: string; page: number }[] = [];
    pages.forEach((pg, i) => {
      for (const b of pg) {
        const t = tocTitle(b.slide);
        if (t && !/\(continued\)$/.test(t) && !entries.some((e) => e.title === t))
          entries.push({ title: t, page: offset + i + 1 });
      }
    });
    drawContents(c, addPage(), entries);
  }
  pages.forEach((pg, i) => {
    const page = addPage();
    pageFrame(c, page, offset + i + 1);
    for (const b of pg) {
      block(c, page, b.slide, MX, b.y, CW);
      notesBlock(c, page, b.slide, MX, b.y + block(c, null, b.slide, MX, 0, CW), CW);
    }
  });

  // A summary's credits go in small print at the foot of the page.
  if (plan.purpose === "summary" && plan.credits.length > 0) {
    const page = doc.getPages()[0];
    para(c, page, `Sources: ${plan.credits.slice(0, 6).join(" · ")}`, MX, PAGE_H - 100, CW, {
      font: sans,
      size: 7.5,
      color: c.pal.muted,
    });
  }
  return doc.save();
}

/** Pages a plan will take (for the length picker's "≈ pages" label and for tests). */
export function pdfPageEstimate(slides: number): number {
  return Math.max(1, Math.ceil(slides / 2));
}
