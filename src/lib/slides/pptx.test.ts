// @vitest-environment node
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { buildPlan } from "@/lib/slides/build";
import { type Purpose, type SlidePlan } from "@/lib/slides/plan";
import { overflowRisks, renderPptx, type ImageMap } from "@/lib/slides/pptx";
import { THEMES } from "@/lib/slides/themes";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const lesson = sampleLessons[0];
const make = (purpose: Purpose, target: number) =>
  buildPlan([lesson], {
    purpose,
    targetSlides: target,
    subjectName: "Electricity & Magnetism",
    levelName: "First Encounter",
    title: lesson.meta.title,
  });

const imagesFor = (plan: SlidePlan): ImageMap =>
  Object.fromEntries(
    Object.keys(plan.visuals).map((k) => [k, { dataUrl: PNG, width: 800, height: 400 }]),
  );

function slideFiles(files: Record<string, Uint8Array>) {
  return Object.keys(files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort();
}

describe("renderPptx", () => {
  const purposes: Purpose[] = ["teach", "study", "revise", "practice", "summary"];
  for (const theme of THEMES) {
    for (const purpose of purposes) {
      it(`${theme.name} · ${purpose}: right slide count, notes, no empty slides, pictures present`, async () => {
        const plan = make(purpose, 15);
        const bytes = await renderPptx(plan, theme, imagesFor(plan));
        const files = unzipSync(bytes);
        const slides = slideFiles(files);
        expect(slides).toHaveLength(plan.slides.length);
        // Nothing empty: every slide has text or a picture.
        for (const f of slides) {
          const xml = strFromU8(files[f]);
          expect(/<a:t>[^<]+<\/a:t>|<p:pic>/.test(xml)).toBe(true);
        }
        // Speaker notes in the notes pane for teaching decks.
        const notes = Object.keys(files).filter((f) =>
          /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f),
        );
        if (purpose === "teach") {
          expect(notes.length).toBeGreaterThanOrEqual(plan.slides.filter((s) => s.notes).length);
          expect(notes.map((f) => strFromU8(files[f])).join(" ")).toMatch(/Ask|ask/);
        }
        // Pictures are real images, one slot per picture used.
        const media = Object.keys(files).filter((f) => f.startsWith("ppt/media/"));
        const used = plan.slides.reduce(
          (n, s) =>
            n +
            (s.layout === "image"
              ? 1
              : s.layout === "formula" || s.layout === "summary"
                ? s.formulas.length
                : 0),
          0,
        );
        expect(media.length > 0 || used === 0).toBe(true);
        expect(used === 0 || slides.some((f) => strFromU8(files[f]).includes("<p:pic>"))).toBe(
          true,
        );
        // Slides are real text boxes and tables, not pictures of text.
        const allXml = slides.map((f) => strFromU8(files[f])).join("");
        expect(allXml).toContain("<a:t>");
        expect(overflowRisks(plan)).toEqual([]);
      });
    }
  }

  it("uses only fonts that exist on Windows, macOS and Google Slides", () => {
    const ok = new Set([
      "Georgia",
      "Arial",
      "Trebuchet MS",
      "Verdana",
      "Courier New",
      "Times New Roman",
    ]);
    for (const t of THEMES) {
      for (const f of [t.headingFont, t.bodyFont, t.labelFont]) expect(ok.has(f)).toBe(true);
    }
  });

  it("renders a comparison as a real table", async () => {
    const plan = make("study", 30);
    const files = unzipSync(await renderPptx(plan, THEMES[0], imagesFor(plan)));
    const hasTable = slideFiles(files).some((f) => strFromU8(files[f]).includes("<a:tbl>"));
    expect(plan.slides.some((s) => s.layout === "comparison")).toBe(hasTable);
  });
});
