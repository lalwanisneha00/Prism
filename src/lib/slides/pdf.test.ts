// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { buildPlan } from "@/lib/slides/build";
import { renderPdf, CONTENTS_FROM_PAGES, type PdfFonts } from "@/lib/slides/pdf";
import { type Purpose, type SlidePlan } from "@/lib/slides/plan";
import type { ImageMap } from "@/lib/slides/pptx";
import { THEMES } from "@/lib/slides/themes";

const font = (name: string) =>
  new Uint8Array(readFileSync(path.join(process.cwd(), "public", "fonts", name)));
const fonts: PdfFonts = {
  sans: font("NotoSans_400Regular.ttf"),
  sansBold: font("NotoSans_700Bold.ttf"),
  serif: font("NotoSerif_400Regular.ttf"),
  serifBold: font("NotoSerif_700Bold.ttf"),
};

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const lesson = sampleLessons[0];
const make = (purpose: Purpose, target: number, count = 1): SlidePlan =>
  buildPlan(
    Array.from({ length: count }, (_, i) => ({
      ...lesson,
      meta: {
        ...lesson.meta,
        title: i === 0 ? lesson.meta.title : `${lesson.meta.title} (${i + 1})`,
      },
    })),
    {
      purpose,
      targetSlides: target,
      subjectName: "Electricity & Magnetism",
      levelName: "First Encounter",
      title: lesson.meta.title,
    },
  );
const imagesFor = (plan: SlidePlan): ImageMap =>
  Object.fromEntries(
    Object.keys(plan.visuals).map((k) => [k, { dataUrl: PNG, width: 800, height: 400 }]),
  );

async function textOf(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return pages;
}

describe("renderPdf", () => {
  for (const theme of THEMES) {
    it(`${theme.name}: a study PDF has a cover, selectable text and page numbers`, async () => {
      const plan = make("study", 20);
      const bytes = await renderPdf(plan, theme, imagesFor(plan), fonts);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(2);
      const pages = await textOf(bytes);
      expect(pages[0].toLowerCase()).toContain(plan.title.split(" ")[0].toLowerCase());
      // Selectable text on content pages, with the page number printed.
      const body = pages.slice(1).join(" ");
      expect(body.length).toBeGreaterThan(200);
      expect(pages[1]).toMatch(/\b2\b|SHEET 02/);
    });
  }

  it("adds a contents page when the document is long", async () => {
    const plan = make("study", 80, 6);
    const bytes = await renderPdf(plan, THEMES[0], imagesFor(plan), fonts);
    const pages = await textOf(bytes);
    expect(pages.length).toBeGreaterThanOrEqual(CONTENTS_FROM_PAGES);
    expect(pages[1]).toContain("Contents");
  }, 60_000);

  it("makes every purpose without throwing, and a summary is one page", async () => {
    for (const purpose of ["teach", "revise", "practice", "summary"] as const) {
      const plan = make(purpose, 12);
      const bytes = await renderPdf(plan, THEMES[1], imagesFor(plan), fonts);
      const doc = await PDFDocument.load(bytes);
      if (purpose === "summary") expect(doc.getPageCount()).toBe(1);
      else expect(doc.getPageCount()).toBeGreaterThan(1);
    }
  });

  it("keeps Greek letters and maths symbols readable", async () => {
    const plan = make("revise", 12);
    const pages = await textOf(await renderPdf(plan, THEMES[0], imagesFor(plan), fonts));
    expect(pages.join(" ")).toMatch(/[εΦ∮∇·]/);
  });

  it("teaching PDFs carry the teacher notes", async () => {
    const plan = make("teach", 15);
    const pages = await textOf(await renderPdf(plan, THEMES[0], imagesFor(plan), fonts));
    expect(pages.join(" ")).toContain("Teacher notes");
  });
});
