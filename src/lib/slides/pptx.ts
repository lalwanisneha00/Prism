import type PptxGenJS from "pptxgenjs";
import { containImage, fitFont, textHeight } from "@/lib/slides/fit";
import { ACTIVITY_LABEL, type Picture, type Slide, type SlidePlan } from "@/lib/slides/plan";
import { SPECTRUM, type Theme } from "@/lib/slides/themes";

/*
 * Slide plan → an editable PowerPoint file (Feature B). Real text boxes, real tables, pictures
 * as pictures, and the speaker notes in the notes pane: nothing is a screenshot of a slide.
 * Layouts are drawn from one set of measurements so every slide has the same margins.
 */

/** A picture made in the browser: a PNG as a data URL, with its pixel size. */
export type RenderedImage = { dataUrl: string; width: number; height: number };
export type ImageMap = Record<string, RenderedImage>;

export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;
const M = 0.75; // outer margin
const CW = SLIDE_W - 2 * M; // content width

type Pres = InstanceType<typeof PptxGenJS>;
type Sld = ReturnType<Pres["addSlide"]>;

type Ctx = { pres: Pres; theme: Theme; images: ImageMap; plan: SlidePlan };

const hex = (c: string) => c.replace("#", "");

function strip(dataUrl: string): string {
  return dataUrl.replace(/^data:/, "");
}

function heading(ctx: Ctx, text: string): string {
  return ctx.theme.upper ? text.toUpperCase() : text;
}

/** A line of text in a box at the largest size that fits (max→min), never overflowing. */
function textBox(
  ctx: Ctx,
  s: Sld,
  text: string,
  box: { x: number; y: number; w: number; h: number },
  o: {
    max: number;
    min: number;
    font?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
  },
) {
  const fit = fitFont([text], box, o.max, o.min);
  s.addText(text, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    margin: 0,
    fontFace: o.font ?? ctx.theme.bodyFont,
    fontSize: fit.pt,
    color: hex(o.color ?? ctx.theme.ink),
    bold: o.bold,
    italic: o.italic,
    align: o.align ?? "left",
    valign: o.valign ?? "top",
    fit: "shrink",
  });
}

/** The theme's recurring detail, plus page number and deck title in the footer. */
function decorate(ctx: Ctx, s: Sld, index: number, total: number, quiet = false) {
  const { theme: t, pres } = ctx;
  s.background = { color: hex(t.bg) };
  const line = (x: number, y: number, w: number, h: number, color: string, alpha = 0) =>
    s.addShape(pres.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: hex(color), transparency: alpha },
      line: { color: hex(color), transparency: 100, width: 0 },
    });
  switch (t.detail) {
    case "double-rule":
      line(M, 0.38, CW, 0.03, t.rule);
      line(M, 0.45, CW, 0.01, t.rule);
      break;
    case "chalk-line":
      line(0, 0, SLIDE_W, 0.12, t.accent);
      break;
    case "corner-ticks":
      for (const [cx, cy, dx, dy] of [
        [0.3, 0.3, 1, 1],
        [SLIDE_W - 0.3, 0.3, -1, 1],
        [0.3, SLIDE_H - 0.3, 1, -1],
        [SLIDE_W - 0.3, SLIDE_H - 0.3, -1, -1],
      ] as const) {
        line(Math.min(cx, cx + dx * 0.3), cy, 0.3, 0.015, t.accent);
        line(cx, Math.min(cy, cy + dy * 0.3), 0.015, 0.3, t.accent);
      }
      break;
    case "spectrum-bar":
      SPECTRUM.forEach((c, i) => line((SLIDE_W / 6) * i, SLIDE_H - 0.14, SLIDE_W / 6, 0.14, c));
      break;
  }
  if (quiet) return;
  s.addText(ctx.plan.title, {
    x: M,
    y: SLIDE_H - 0.55,
    w: 7,
    h: 0.3,
    margin: 0,
    fontFace: t.labelFont,
    fontSize: 11,
    color: hex(t.muted),
  });
}

function titleBar(ctx: Ctx, s: Sld, title: string, width = CW) {
  const t = ctx.theme;
  const text = heading(ctx, title);
  // One line at a good size if it fits, otherwise two lines a little smaller.
  const one = fitFont([text], { w: width, h: 0.62 }, 34, 26);
  const pt = one.overflow ? fitFont([text], { w: width, h: 0.95 }, 26, 18).pt : one.pt;
  s.addText(text, {
    x: M,
    y: 0.7,
    w: width,
    h: 0.95,
    margin: 0,
    fontFace: t.headingFont,
    fontSize: pt,
    bold: true,
    color: hex(t.ink),
    valign: "bottom",
    fit: "shrink",
  });
  // The title style: a short accent rule under it (a thicker "chalk" stroke on the chalkboard).
  s.addShape(ctx.pres.ShapeType.rect, {
    x: M,
    y: 1.7,
    w: t.id === "chalk" ? 1.6 : 0.9,
    h: t.id === "chalk" ? 0.07 : 0.045,
    fill: { color: hex(t.accent) },
    line: { color: hex(t.accent), transparency: 100, width: 0 },
  });
}

function card(ctx: Ctx, s: Sld, x: number, y: number, w: number, h: number, fill?: string) {
  s.addShape(ctx.pres.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: hex(fill ?? ctx.theme.card) },
    line: { color: hex(ctx.theme.rule), transparency: 80, width: 0.75 },
  });
}

/** Pictures sit on a white card so a diagram drawn on white reads well on dark themes too. */
function placeImage(
  ctx: Ctx,
  s: Sld,
  pic: Picture,
  box: { x: number; y: number; w: number; h: number },
) {
  const img = ctx.images[pic.key];
  if (!img) return;
  card(ctx, s, box.x, box.y, box.w, box.h, "FFFFFF");
  const r = containImage(img, {
    x: box.x + 0.12,
    y: box.y + 0.12,
    w: box.w - 0.24,
    h: box.h - 0.24,
  });
  s.addImage({ data: strip(img.dataUrl), x: r.x, y: r.y, w: r.w, h: r.h, altText: pic.alt });
}

function bulletRuns(ctx: Ctx, points: string[], pt: number, color = ctx.theme.ink) {
  return points.map((p) => ({
    text: p,
    options: {
      bullet: { code: "25A0", indent: pt * 1.3 },
      fontFace: ctx.theme.bodyFont,
      fontSize: pt,
      color: hex(color),
      paraSpaceAfter: Math.round(pt * 0.45),
      breakLine: true,
    },
  }));
}

function bullets(
  ctx: Ctx,
  s: Sld,
  points: string[],
  box: { x: number; y: number; w: number; h: number },
  max = 24,
  min = 14,
  color?: string,
) {
  const fit = fitFont(points, { w: box.w - 0.4, h: box.h }, max, min);
  s.addText(bulletRuns(ctx, points, fit.pt, color), {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    margin: 0,
    valign: "top",
    fit: "shrink",
  });
}

const BODY_TOP = 2.05;
const BODY_H = SLIDE_H - BODY_TOP - 0.85;

/** Code is set in a fixed-width font; its characters are a little wider than prose. */
const CODE_FONT = "Consolas";
const CODE_CHAR = 0.6;

/** Height in inches of code set at `pt` in a box `w` wide (long lines wrap). */
function codeHeight(code: string, w: number, pt: number): number {
  const cpl = Math.max(8, Math.floor((w * 72) / (pt * CODE_CHAR)));
  const lines = code
    .replace(/\s+$/, "")
    .split("\n")
    .reduce((n, l) => n + Math.max(1, Math.ceil(l.length / cpl)), 0);
  return (lines * pt * 1.2) / 72;
}

function codeBox(
  ctx: Ctx,
  s: Sld,
  code: string,
  box: { x: number; y: number; w: number; h: number },
  pt: number,
) {
  card(ctx, s, box.x, box.y, box.w, box.h, ctx.theme.card);
  s.addText(code.replace(/\t/g, "    ").replace(/\s+$/, ""), {
    x: box.x + 0.15,
    y: box.y + 0.1,
    w: box.w - 0.3,
    h: box.h - 0.2,
    margin: 0,
    fontFace: CODE_FONT,
    fontSize: pt,
    color: hex(ctx.theme.ink),
    valign: "top",
    fit: "shrink",
  });
}

type ConceptSlide = Extract<Slide, { layout: "concept" }>;

/** The concept slide's text column: as wide as the slide, or beside the picture. */
const conceptTextW = (slide: ConceptSlide) => (slide.picture ? CW * 0.56 : CW);
/** Room for the analogy, points and example (between the title and the takeaway bar). */
const CONCEPT_H = BODY_H - 0.85;

/** Heights (inches) of a concept slide's parts at body size `pt`. */
function conceptParts(slide: ConceptSlide, pt: number) {
  const w = conceptTextW(slide);
  const small = Math.max(11, pt - 2);
  const analogy = slide.analogy
    ? textHeight([`Think of it like this: ${slide.analogy}`], w - 0.5, small) + 0.3
    : 0;
  const points = slide.points.length ? textHeight(slide.points, w - 0.4, pt, pt * 0.45) + 0.1 : 0;
  const ex = slide.example;
  const example = ex
    ? 0.45 +
      (ex.text ? textHeight([ex.text], w - 0.5, small) + 0.1 : 0) +
      (ex.code ? codeHeight(ex.code, w - 0.5, Math.max(10, small - 1)) + 0.25 : 0)
    : 0;
  return { analogy, points, example, gaps: 0.15 * 2 };
}

/**
 * The largest body size (20pt down to 13pt) at which a concept slide's text fits. `fits` false
 * means the slide must be split (the example goes to a "continued" slide); text is never shrunk
 * below 13pt.
 */
export function conceptFit(slide: ConceptSlide): { pt: number; fits: boolean } {
  for (let pt = 20; pt >= 13; pt--) {
    const p = conceptParts(slide, pt);
    if (p.analogy + p.points + p.example + p.gaps <= CONCEPT_H) return { pt, fits: true };
  }
  return { pt: 13, fits: false };
}

/** Draws one slide. */
function drawSlide(ctx: Ctx, slide: Slide, index: number, total: number) {
  const { pres, theme: t } = ctx;
  const s = pres.addSlide();
  const label = (text: string, x: number, y: number, w = 6) =>
    s.addText(text.toUpperCase(), {
      x,
      y,
      w,
      h: 0.35,
      margin: 0,
      fontFace: t.labelFont,
      fontSize: 13,
      bold: true,
      charSpacing: 3,
      color: hex(t.accent),
    });

  switch (slide.layout) {
    case "title": {
      decorate(ctx, s, index, total, true);
      label(slide.tag, M, 2.1);
      textBox(
        ctx,
        s,
        heading(ctx, slide.title),
        { x: M, y: 2.55, w: 10.5, h: 2.1 },
        {
          max: 56,
          min: 30,
          font: t.headingFont,
          bold: true,
          valign: "top",
        },
      );
      textBox(
        ctx,
        s,
        slide.subtitle,
        { x: M, y: 4.85, w: 10, h: 0.7 },
        {
          max: 22,
          min: 14,
          color: t.muted,
        },
      );
      s.addShape(pres.ShapeType.rect, {
        x: M,
        y: 4.7,
        w: 1.6,
        h: 0.06,
        fill: { color: hex(t.accent) },
        line: { color: hex(t.accent), transparency: 100, width: 0 },
      });
      break;
    }
    case "section": {
      decorate(ctx, s, index, total, true);
      s.addShape(pres.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 0.55,
        h: SLIDE_H,
        fill: { color: hex(t.accent) },
        line: { color: hex(t.accent), transparency: 100, width: 0 },
      });
      if (slide.kicker) label(slide.kicker, 1.3, 2.7);
      textBox(
        ctx,
        s,
        heading(ctx, slide.title),
        { x: 1.3, y: 3.15, w: 10.8, h: 1.9 },
        {
          max: 48,
          min: 28,
          font: t.headingFont,
          bold: true,
        },
      );
      break;
    }
    case "statement": {
      decorate(ctx, s, index, total);
      if (slide.label) label(slide.label, 1.3, 1.9, 9);
      s.addShape(pres.ShapeType.rect, {
        x: M,
        y: 2.4,
        w: 0.09,
        h: 3.3,
        fill: { color: hex(t.accent) },
        line: { color: hex(t.accent), transparency: 100, width: 0 },
      });
      textBox(
        ctx,
        s,
        slide.text,
        { x: 1.3, y: 2.4, w: 10.7, h: 3.3 },
        {
          max: 40,
          min: 22,
          font: t.headingFont,
          valign: "middle",
        },
      );
      break;
    }
    case "bullets":
    case "recap": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      bullets(ctx, s, slide.points, { x: M, y: BODY_TOP, w: CW - 0.4, h: BODY_H }, 26, 16);
      break;
    }
    case "two-column": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const w = (CW - 0.4) / 2;
      [slide.left, slide.right].forEach((col, i) => {
        const x = M + i * (w + 0.4);
        card(ctx, s, x, BODY_TOP, w, BODY_H);
        s.addText(col.heading.toUpperCase(), {
          x: x + 0.3,
          y: BODY_TOP + 0.25,
          w: w - 0.6,
          h: 0.35,
          margin: 0,
          fontFace: t.labelFont,
          fontSize: 13,
          bold: true,
          charSpacing: 2,
          color: hex(i === 0 ? t.accent : t.accent2),
        });
        bullets(
          ctx,
          s,
          col.points,
          { x: x + 0.3, y: BODY_TOP + 0.75, w: w - 0.6, h: BODY_H - 1 },
          20,
          13,
        );
      });
      break;
    }
    case "steps": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const n = slide.steps.length;
      const rowH = Math.min(1.05, BODY_H / n);
      slide.steps.forEach((step, i) => {
        const y = BODY_TOP + i * rowH;
        s.addShape(pres.ShapeType.ellipse, {
          x: M,
          y: y + 0.08,
          w: 0.55,
          h: 0.55,
          fill: { color: hex(t.accent) },
          line: { color: hex(t.accent), transparency: 100, width: 0 },
        });
        s.addText(String(i + 1), {
          x: M,
          y: y + 0.08,
          w: 0.55,
          h: 0.55,
          margin: 0,
          align: "center",
          valign: "middle",
          bold: true,
          fontFace: t.labelFont,
          fontSize: 18,
          color: hex(t.onAccent),
        });
        textBox(
          ctx,
          s,
          step,
          { x: M + 0.85, y, w: CW - 0.85, h: rowH - 0.1 },
          {
            max: 20,
            min: 12,
            valign: "middle",
          },
        );
      });
      break;
    }
    case "comparison": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const cols = slide.columns.length;
      const colW = CW / cols;
      const cell = (text: string, header: boolean, zebra: boolean) => ({
        text,
        options: {
          fontFace: header ? t.labelFont : t.bodyFont,
          fontSize: header ? 15 : 15,
          bold: header,
          color: hex(header ? t.onAccent : t.ink),
          fill: { color: hex(header ? t.accent : zebra ? t.card : t.bg) },
          valign: "middle" as const,
          margin: [0.1, 0.14, 0.1, 0.14] as [number, number, number, number],
          border: [
            { type: "solid" as const, pt: 0.5, color: hex(t.rule) },
            { type: "solid" as const, pt: 0.5, color: hex(t.rule) },
            { type: "solid" as const, pt: 0.5, color: hex(t.rule) },
            { type: "solid" as const, pt: 0.5, color: hex(t.rule) },
          ] as never,
        },
      });
      const rows = [
        slide.columns.map((c) => cell(c, true, false)),
        ...slide.rows.map((r, ri) =>
          slide.columns.map((_, ci) => cell(r[ci] ?? "", false, ri % 2 === 0)),
        ),
      ];
      s.addTable(rows, {
        x: M,
        y: BODY_TOP,
        w: CW,
        colW: Array.from({ length: cols }, () => colW),
        rowH: Math.min(0.8, BODY_H / rows.length),
      });
      break;
    }
    case "image": {
      decorate(ctx, s, index, total);
      if (slide.title) titleBar(ctx, s, slide.title);
      const top = slide.title ? BODY_TOP : 0.8;
      const h = SLIDE_H - top - 0.85 - (slide.picture.caption ? 0.55 : 0);
      if (slide.side === "full" || slide.points.length === 0) {
        placeImage(ctx, s, slide.picture, { x: M, y: top, w: CW, h });
        if (slide.picture.caption)
          textBox(
            ctx,
            s,
            slide.picture.caption,
            { x: M, y: top + h + 0.1, w: CW, h: 0.5 },
            {
              max: 15,
              min: 11,
              color: t.muted,
              italic: true,
            },
          );
      } else {
        const imgW = CW * 0.58;
        const imgX = slide.side === "left" ? M : M + CW - imgW;
        const txtX = slide.side === "left" ? M + imgW + 0.45 : M;
        placeImage(ctx, s, slide.picture, { x: imgX, y: top, w: imgW, h });
        bullets(ctx, s, slide.points, { x: txtX, y: top, w: CW - imgW - 0.45, h }, 20, 13);
        if (slide.picture.caption)
          textBox(
            ctx,
            s,
            slide.picture.caption,
            { x: imgX, y: top + h + 0.1, w: imgW, h: 0.5 },
            {
              max: 14,
              min: 10,
              color: t.muted,
              italic: true,
            },
          );
      }
      break;
    }
    case "formula": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const n = slide.formulas.length;
      const gap = 0.25;
      const h = Math.min(1.6, (BODY_H - gap * (n - 1)) / n);
      const symbols = slide.symbols ?? [];
      // With symbol meanings: formulas on the left, what each symbol means on the right.
      const fw = symbols.length ? CW * 0.55 : CW - 1.6;
      const fx = symbols.length ? M : M + 0.8;
      slide.formulas.forEach((f, i) =>
        placeImage(ctx, s, f, { x: fx, y: BODY_TOP + i * (h + gap), w: fw, h }),
      );
      if (symbols.length) {
        const sx = M + fw + 0.45;
        label("What each symbol means", sx, BODY_TOP, CW - fw - 0.45);
        bullets(
          ctx,
          s,
          symbols,
          { x: sx, y: BODY_TOP + 0.45, w: CW - fw - 0.45, h: BODY_H - 0.45 },
          18,
          12,
        );
      }
      break;
    }
    case "concept": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const { pt } = conceptFit(slide);
      const parts = conceptParts(slide, pt);
      const w = conceptTextW(slide);
      const small = Math.max(11, pt - 2);
      let y = BODY_TOP;
      if (slide.analogy) {
        card(ctx, s, M, y, w, parts.analogy - 0.05, t.card);
        textBox(
          ctx,
          s,
          `Think of it like this: ${slide.analogy}`,
          { x: M + 0.25, y: y + 0.12, w: w - 0.5, h: parts.analogy - 0.25 },
          { max: small, min: 10, italic: true },
        );
        y += parts.analogy + 0.15;
      }
      if (slide.points.length) {
        bullets(ctx, s, slide.points, { x: M, y, w, h: parts.points }, pt, 12);
        y += parts.points + 0.15;
      }
      const ex = slide.example;
      if (ex) {
        label(ex.label, M, y, w);
        y += 0.42;
        if (ex.text) {
          const th = textHeight([ex.text], w - 0.5, small) + 0.1;
          textBox(ctx, s, ex.text, { x: M + 0.1, y, w: w - 0.2, h: th }, { max: small, min: 10 });
          y += th;
        }
        if (ex.code) {
          const cpt = Math.max(10, small - 1);
          codeBox(
            ctx,
            s,
            ex.code,
            { x: M, y, w, h: codeHeight(ex.code, w - 0.5, cpt) + 0.22 },
            cpt,
          );
        }
      }
      if (slide.picture) {
        const px = M + w + 0.4;
        placeImage(ctx, s, slide.picture, {
          x: px,
          y: BODY_TOP,
          w: CW - w - 0.4,
          h: CONCEPT_H - 0.45,
        });
        if (slide.picture.caption)
          textBox(
            ctx,
            s,
            slide.picture.caption,
            { x: px, y: BODY_TOP + CONCEPT_H - 0.4, w: CW - w - 0.4, h: 0.4 },
            { max: 12, min: 9, color: t.muted, italic: true },
          );
      }
      const by = SLIDE_H - 0.85 - 0.7;
      s.addShape(pres.ShapeType.rect, {
        x: M,
        y: by,
        w: CW,
        h: 0.7,
        fill: { color: hex(t.accent) },
        line: { color: hex(t.accent), transparency: 100, width: 0 },
      });
      textBox(
        ctx,
        s,
        `Takeaway: ${slide.takeaway}`,
        { x: M + 0.3, y: by, w: CW - 0.6, h: 0.7 },
        { max: 18, min: 11, bold: true, color: t.onAccent, valign: "middle" },
      );
      break;
    }
    case "example": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const leftW = CW * 0.38;
      card(ctx, s, M, BODY_TOP, leftW, BODY_H - 0.9);
      label("The problem", M + 0.3, BODY_TOP + 0.25, leftW - 0.6);
      const codeH = slide.code ? Math.min(2.2, codeHeight(slide.code, leftW - 0.8, 10) + 0.25) : 0;
      textBox(
        ctx,
        s,
        slide.problem,
        { x: M + 0.3, y: BODY_TOP + 0.75, w: leftW - 0.6, h: BODY_H - 1.9 - codeH },
        {
          max: 20,
          min: 12,
        },
      );
      if (slide.code)
        codeBox(
          ctx,
          s,
          slide.code,
          { x: M + 0.2, y: BODY_TOP + BODY_H - 1.05 - codeH, w: leftW - 0.4, h: codeH },
          10,
        );
      const sx = M + leftW + 0.4;
      const sw = CW - leftW - 0.4;
      const rowH = Math.min(0.9, (BODY_H - 0.9) / slide.steps.length);
      slide.steps.forEach((step, i) => {
        const y = BODY_TOP + i * rowH;
        s.addText(String(i + 1), {
          x: sx,
          y,
          w: 0.45,
          h: rowH - 0.08,
          margin: 0,
          bold: true,
          fontFace: t.labelFont,
          fontSize: 18,
          color: hex(t.accent),
          valign: "middle",
        });
        textBox(
          ctx,
          s,
          step,
          { x: sx + 0.55, y, w: sw - 0.55, h: rowH - 0.08 },
          {
            max: 17,
            min: 11,
            valign: "middle",
          },
        );
      });
      s.addShape(pres.ShapeType.rect, {
        x: M,
        y: SLIDE_H - 0.85 - 0.75,
        w: CW,
        h: 0.75,
        fill: { color: hex(t.accent) },
        line: { color: hex(t.accent), transparency: 100, width: 0 },
      });
      textBox(
        ctx,
        s,
        `Answer: ${slide.answer}`,
        { x: M + 0.3, y: SLIDE_H - 0.85 - 0.75, w: CW - 0.6, h: 0.75 },
        {
          max: 20,
          min: 12,
          bold: true,
          color: t.onAccent,
          valign: "middle",
        },
      );
      break;
    }
    case "quiz": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const hasOptions = slide.options.length > 0;
      textBox(
        ctx,
        s,
        slide.question,
        { x: M, y: BODY_TOP, w: CW, h: hasOptions ? 1.5 : 2.4 },
        {
          max: 28,
          min: 16,
          font: t.headingFont,
        },
      );
      if (hasOptions) {
        const lines = slide.options.map((o, i) => `${String.fromCharCode(65 + i)}.  ${o}`);
        const h = slide.showAnswer ? BODY_H - 2.9 : BODY_H - 1.7;
        const fit = fitFont(lines, { w: CW - 0.4, h }, 22, 13);
        s.addText(
          lines.map((l) => ({
            text: l,
            options: {
              fontFace: t.bodyFont,
              fontSize: fit.pt,
              color: hex(t.ink),
              paraSpaceAfter: Math.round(fit.pt * 0.5),
              breakLine: true,
            },
          })),
          {
            x: M + 0.2,
            y: BODY_TOP + 1.6,
            w: CW - 0.4,
            h,
            margin: 0,
            valign: "top",
            fit: "shrink",
          },
        );
      }
      if (slide.showAnswer) {
        const y = SLIDE_H - 0.85 - 1.2;
        card(ctx, s, M, y, CW, 1.2);
        textBox(
          ctx,
          s,
          `Answer: ${slide.answer}${slide.explanation ? `. ${slide.explanation}` : ""}`,
          { x: M + 0.3, y: y + 0.1, w: CW - 0.6, h: 1.0 },
          { max: 16, min: 11, valign: "middle" },
        );
      }
      break;
    }
    case "activity": {
      decorate(ctx, s, index, total);
      label(
        [
          "Activity",
          slide.format ? ACTIVITY_LABEL[slide.format] : "",
          `${slide.minutes} min`,
          slide.group ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
        M,
        1.2,
        CW,
      );
      textBox(
        ctx,
        s,
        heading(ctx, slide.title),
        { x: M, y: 1.6, w: CW, h: 0.8 },
        { max: 34, min: 22, font: t.headingFont, bold: true },
      );
      const hasHints = slide.hints.length > 0;
      const leftW = hasHints ? CW * 0.58 : CW;
      card(ctx, s, M, 2.65, leftW, 3.85);
      const matH = slide.material
        ? Math.min(2.1, codeHeight(slide.material, leftW - 1.0, 10) + 0.25)
        : 0;
      textBox(
        ctx,
        s,
        slide.prompt,
        { x: M + 0.4, y: 2.85, w: leftW - 0.8, h: 3.45 - matH - (matH ? 0.1 : 0) },
        { max: 26, min: 12, font: t.headingFont, valign: slide.material ? "top" : "middle" },
      );
      if (slide.material)
        codeBox(
          ctx,
          s,
          slide.material,
          { x: M + 0.3, y: 6.35 - matH, w: leftW - 0.6, h: matH },
          10,
        );
      if (hasHints) {
        const hx = M + leftW + 0.4;
        const hw = CW - leftW - 0.4;
        label("How to work on it", hx, 2.65, hw);
        const rowH = Math.min(1.15, 3.4 / slide.hints.length);
        slide.hints.forEach((hint, i) => {
          const y = 3.1 + i * rowH;
          s.addText(String(i + 1), {
            x: hx,
            y,
            w: 0.4,
            h: rowH - 0.1,
            margin: 0,
            bold: true,
            fontFace: t.labelFont,
            fontSize: 18,
            color: hex(t.accent),
            valign: "top",
          });
          textBox(
            ctx,
            s,
            hint,
            { x: hx + 0.5, y, w: hw - 0.5, h: rowH - 0.1 },
            { max: 18, min: 11, valign: "top" },
          );
        });
      }
      break;
    }
    case "questions": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const rowH = Math.min(1.25, BODY_H / slide.items.length);
      slide.items.forEach((it, i) => {
        const y = BODY_TOP + i * rowH;
        s.addText(`${it.n}.`, {
          x: M,
          y,
          w: 0.7,
          h: rowH - 0.1,
          margin: 0,
          bold: true,
          fontFace: t.labelFont,
          fontSize: 22,
          color: hex(t.accent),
          valign: "top",
        });
        textBox(
          ctx,
          s,
          it.text,
          { x: M + 0.8, y, w: CW - 0.8, h: rowH - 0.1 },
          { max: 20, min: 12 },
        );
      });
      break;
    }
    case "answers": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const rowH = Math.min(1.3, BODY_H / slide.items.length);
      slide.items.forEach((it, i) => {
        const y = BODY_TOP + i * rowH;
        s.addText(`${it.n}.`, {
          x: M,
          y,
          w: 0.7,
          h: rowH - 0.1,
          margin: 0,
          bold: true,
          fontFace: t.labelFont,
          fontSize: 22,
          color: hex(t.accent),
          valign: "top",
        });
        textBox(
          ctx,
          s,
          it.why ? `${it.answer}. ${it.why}` : it.answer,
          { x: M + 0.8, y, w: CW - 0.8, h: rowH - 0.1 },
          {
            max: 18,
            min: 11,
          },
        );
      });
      break;
    }
    case "sources": {
      decorate(ctx, s, index, total);
      titleBar(ctx, s, slide.title);
      const items = slide.items.map((i) => (i.detail ? `${i.label}. ${i.detail}` : i.label));
      const fit = fitFont(items, { w: CW - 0.4, h: BODY_H }, 15, 9);
      s.addText(
        items.map((text) => ({
          text,
          options: {
            fontFace: t.bodyFont,
            fontSize: fit.pt,
            color: hex(t.muted),
            paraSpaceAfter: 5,
            breakLine: true,
          },
        })),
        { x: M, y: BODY_TOP, w: CW, h: BODY_H, margin: 0, valign: "top", fit: "shrink" },
      );
      break;
    }
    case "summary": {
      decorate(ctx, s, index, total, true);
      textBox(
        ctx,
        s,
        heading(ctx, slide.title),
        { x: M, y: 0.7, w: CW, h: 0.9 },
        {
          max: 32,
          min: 20,
          font: t.headingFont,
          bold: true,
          valign: "middle",
        },
      );
      const leftW = slide.formulas.length > 0 || slide.map ? CW * 0.55 : CW;
      if (slide.map && slide.formulas.length === 0) {
        const x = M + leftW + 0.4;
        label("How it connects", x, 1.85, CW - leftW - 0.4);
        placeImage(ctx, s, slide.map, { x, y: 2.3, w: CW - leftW - 0.4, h: 3.5 });
      }
      if (slide.groups?.length) {
        // Grouped boxes: up to 3 per row, each idea cluster in its own card.
        const n = slide.groups.length;
        const cols = n <= 4 ? 2 : 3;
        const rows = Math.ceil(n / cols);
        const gw = leftW;
        const gap = 0.18;
        const bw = (gw - gap * (cols - 1)) / cols;
        const bh = (3.95 - gap * (rows - 1)) / rows;
        slide.groups.forEach((g, i) => {
          const gx = M + (i % cols) * (bw + gap);
          const gy = 1.85 + Math.floor(i / cols) * (bh + gap);
          card(ctx, s, gx, gy, bw, bh, t.card);
          textBox(
            ctx,
            s,
            g.heading,
            { x: gx + 0.15, y: gy + 0.08, w: bw - 0.3, h: 0.38 },
            {
              max: 14,
              min: 10,
              bold: true,
              color: t.accent,
            },
          );
          bullets(ctx, s, g.points, { x: gx + 0.15, y: gy + 0.5, w: bw - 0.3, h: bh - 0.6 }, 13, 9);
        });
      } else {
        label("Key points", M, 1.85, leftW);
        bullets(ctx, s, slide.points, { x: M, y: 2.3, w: leftW, h: 3.6 }, 18, 11);
      }
      if (slide.formulas.length > 0) {
        const x = M + leftW + 0.4;
        label("Formulas", x, 1.85, CW - leftW - 0.4);
        const n = slide.formulas.length;
        const h = Math.min(1.1, 3.6 / n);
        slide.formulas.forEach((f, i) =>
          placeImage(ctx, s, f, { x, y: 2.3 + i * (h + 0.12), w: CW - leftW - 0.4, h }),
        );
      }
      if (slide.mnemonic) {
        card(ctx, s, M, 6.05, CW, 0.7, t.card);
        textBox(
          ctx,
          s,
          `Remember: ${slide.mnemonic}`,
          { x: M + 0.25, y: 6.05, w: CW - 0.5, h: 0.7 },
          {
            max: 16,
            min: 10,
            valign: "middle",
            italic: true,
          },
        );
      }
      break;
    }
  }
  if (slide.notes) s.addNotes(slide.notes);
  return s;
}

/** Builds the .pptx bytes for a plan (call from the browser, or from tests with a stand-in image map). */
export async function renderPptx(
  plan: SlidePlan,
  theme: Theme,
  images: ImageMap,
): Promise<Uint8Array> {
  const { default: Pptx } = await import("pptxgenjs");
  const pres = new Pptx();
  pres.layout = "LAYOUT_WIDE";
  pres.title = plan.title;
  pres.subject = plan.subject;
  pres.author = "Prism";
  pres.company = "Prism";
  const ctx: Ctx = { pres, theme, images, plan };
  plan.slides.forEach((slide, i) => drawSlide(ctx, slide, i, plan.slides.length));
  const out = (await pres.write({ outputType: "uint8array" })) as Uint8Array;
  return out;
}

/** For tests and layout checks: the text lines that must fit, with the box they are set in. */
export function overflowRisks(plan: SlidePlan): string[] {
  const out: string[] = [];
  plan.slides.forEach((s, i) => {
    const check = (name: string, items: string[], w: number, h: number, minPt: number) => {
      if (textHeight(items, w, minPt, minPt * 0.4) > h)
        out.push(`slide ${i + 1} (${s.layout}): ${name} does not fit at ${minPt}pt`);
    };
    switch (s.layout) {
      case "bullets":
      case "recap":
        check("points", s.points, CW - 0.4, BODY_H, 16);
        break;
      case "statement":
        check("statement", [s.text], 10.7, 3.3, 22);
        break;
      case "title":
        check("title", [s.title], 10.5, 2.1, 30);
        break;
      case "example":
        check("problem", [s.problem], CW * 0.38 - 0.6, BODY_H - 1.9, 12);
        break;
      case "quiz":
        check("question", [s.question], CW, s.options.length ? 1.5 : 2.4, 16);
        break;
      case "activity":
        check("prompt", [s.prompt], CW * 0.58 - 0.8, 3.45, 13);
        break;
      case "concept":
        if (!conceptFit(s).fits) out.push(`slide ${i + 1} (concept): too much to fit at 13pt`);
        break;
      default:
        break;
    }
  });
  return out;
}
