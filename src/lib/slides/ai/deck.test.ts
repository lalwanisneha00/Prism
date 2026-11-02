// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";

// Embedding whole fonts takes a few seconds per document.
vi.setConfig({ testTimeout: 60_000 });
import { sampleLessons } from "@/data/sampleLessons";
import { assemblePlan, writeDeck, type Post } from "@/lib/slides/ai/deck";
import { lessonDigest } from "@/lib/slides/ai/digest";
import { contentSlides, fakeOutline, type DeckBrief } from "@/lib/slides/ai/outline";
import {
  DeckReviewSchema,
  fakeReview,
  reviewResults,
  type SlideVerdict,
} from "@/lib/slides/ai/review";
import { splitOverflow } from "@/lib/slides/ai/split";
import { fakeSlides, type AiSlide } from "@/lib/slides/ai/write";
import { renderPdf, type PdfFonts } from "@/lib/slides/pdf";
import { PURPOSES, type Purpose, type Slide, type SlidePlan } from "@/lib/slides/plan";
import { conceptFit, overflowRisks, renderPptx, type ImageMap } from "@/lib/slides/pptx";
import { THEMES } from "@/lib/slides/themes";

const lesson = sampleLessons[0];
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const imagesFor = (plan: SlidePlan): ImageMap =>
  Object.fromEntries(
    Object.keys(plan.visuals).map((k) => [k, { dataUrl: PNG, width: 800, height: 400 }]),
  );
const font = (name: string) =>
  new Uint8Array(readFileSync(path.join(process.cwd(), "public", "fonts", name)));
const fonts: PdfFonts = {
  sans: font("NotoSans_400Regular.ttf"),
  sansBold: font("NotoSans_700Bold.ttf"),
  serif: font("NotoSerif_400Regular.ttf"),
  serifBold: font("NotoSerif_700Bold.ttf"),
};

const brief = (purpose: Purpose, slides: number): DeckBrief => ({
  purpose,
  title: lesson.meta.title,
  course: "Applied Physics, PDEU B.Tech, semester 1",
  level: "First Encounter",
  slides: purpose === "summary" ? 1 : slides,
  topics: [{ name: lesson.meta.title, digest: lessonDigest(lesson) }],
  visuals: [],
  material: [],
  pyqs: [],
  weights: [],
});

/** The server routes, as the test AI answers them (optionally flagging some slides once). */
function fakeServer(flagOnce = new Set<number>()) {
  const calls: string[] = [];
  const post: Post = async (url, body) => {
    calls.push(url);
    const b = body as {
      brief: DeckBrief;
      outline: ReturnType<typeof fakeOutline>;
      indices: number[];
      slides: { index: number }[];
    };
    if (url.endsWith("/outline")) return { ok: true, outline: fakeOutline(body as DeckBrief) };
    if (url.endsWith("/write"))
      return { ok: true, slides: b.indices.map((i) => fakeSlides([b.outline.slides[i]], i)[0]) };
    const results = fakeReview(b.slides).results.map((r): SlideVerdict => {
      const flag = flagOnce.delete(r.index);
      return {
        index: r.index,
        pass: !flag,
        issues: flag ? ["the formula's unit is wrong"] : [],
        fix: flag ? "use N/C" : "",
      };
    });
    return { ok: true, results };
  };
  return { post, calls };
}

describe("the deck pipeline: outline → slides → review → plan", () => {
  it("a 15-slide teaching deck: one outline call, slides in batches, one review, activities with notes", async () => {
    const { post, calls } = fakeServer();
    const deck = await writeDeck(brief("teach", 15), post, () => {});
    expect(calls.filter((c) => c.endsWith("/outline"))).toHaveLength(1);
    expect(calls.filter((c) => c.endsWith("/review"))).toHaveLength(1);
    expect(deck.slides).toHaveLength(contentSlides("teach", 15));
    const { plan, checks } = assemblePlan({
      brief: brief("teach", 15),
      outline: deck.outline,
      slides: deck.slides,
      lessons: [lesson],
      subjectName: "Applied Physics",
      levelName: "First Encounter",
      teacherNotes: true,
    });
    expect(checks).toEqual([]);
    expect(plan.slides[0].layout).toBe("title");
    expect(plan.slides.at(-1)?.layout).toBe("sources");
    const acts = plan.slides.filter((s) => s.layout === "activity");
    expect(acts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(acts.map((a) => a.layout === "activity" && a.format)).size).toBe(acts.length);
    for (const a of acts) expect(a.notes).toMatch(/EXPECTED ANSWER[\s\S]*HINTS[\s\S]*DEBRIEF/);
  });

  it("rewrites only the slides the review flags, then checks just those again", async () => {
    const { post, calls } = fakeServer(new Set([3]));
    const deck = await writeDeck(brief("study", 12), post, () => {});
    expect(deck.review).toEqual({ rounds: 2, fixed: 1, stillFlagged: 0 });
    expect(calls.filter((c) => c.endsWith("/review"))).toHaveLength(2);
  });

  it("still delivers the deck, marked unreviewed, when the review can't run", async () => {
    const { post } = fakeServer();
    const failing: Post = async (url, body) => {
      if (url.endsWith("/review")) throw new Error("the review's reply couldn't be read");
      return post(url, body);
    };
    const deck = await writeDeck(brief("teach", 15), failing, () => {});
    expect(deck.slides).toHaveLength(contentSlides("teach", 15));
    expect(deck.reviewSkipped).toMatch(/couldn't be read/);
  });

  it("reads review replies with slide numbers written as text or under another name", () => {
    const parsed = DeckReviewSchema.parse(
      reviewResults({
        reviews: [
          { slide: "Slide 3", pass: "false", issues: ["wrong unit"], fix: "use N/C" },
          { id: 4, pass: true },
        ],
      }),
    );
    expect(parsed.results.map((r) => [r.index, r.pass])).toEqual([
      [3, false],
      [4, true],
    ]);
  });

  it("revision decks and one-page summaries skip the AI review", async () => {
    for (const purpose of ["revise", "summary"] as const) {
      const { post, calls } = fakeServer();
      const deck = await writeDeck(brief(purpose, 10), post, () => {});
      expect(calls.some((c) => c.endsWith("/review"))).toBe(false);
      expect(deck.review).toBeUndefined();
    }
  });
});

describe("rendering the new decks in every theme", () => {
  const rich: AiSlide[] = [
    {
      layout: "concept",
      title: "Gauss's law in one picture",
      analogy:
        "Like counting cars leaving a car park: what drives out tells you how many were parked inside.",
      points: [
        "The total electric flux through any closed surface equals the enclosed charge divided by ε₀.",
        "It works because field lines start and end only on charges, so only enclosed charge adds net flux.",
        "It is most useful when symmetry makes the field constant over the surface.",
      ],
      example: {
        label: "Code check",
        text: "A tiny program that adds up flux through the faces of a cube:",
        code: 'double flux = 0;\nfor (int face = 0; face < 6; face++) {\n    flux += field[face] * area;\n}\nprintf("%f\\n", flux);',
      },
      takeaway: "Enclosed charge sets the flux, whatever the surface's shape.",
      visual: {
        type: "latex",
        latex: "\\oint \\vec E \\cdot d\\vec A = \\frac{Q}{\\varepsilon_0}",
        caption: "Gauss's law",
      },
      notes: {
        say: "Walk the class through this slide slowly and check understanding.",
        ask: "",
        doubts: [],
      },
    },
    {
      layout: "formula",
      title: "The symbols",
      formulas: [{ latex: "E = \\frac{kQ}{r^2}", caption: "" }],
      symbols: [
        "E: electric field (N/C)",
        "k: Coulomb constant (N·m²/C²)",
        "Q: charge (C)",
        "r: distance (m)",
      ],
      notes: {
        say: "Walk the class through this slide slowly and check understanding.",
        ask: "",
        doubts: [],
      },
    },
    {
      layout: "example",
      title: "Debug the loop",
      problem: "This loop is meant to add the first five numbers. What does it print, and why?",
      code: 'int s = 0;\nfor (int i = 1; i < 5; i++)\n    s += i;\nprintf("%d", s);',
      steps: ["The loop stops at i = 4.", "It adds 1 + 2 + 3 + 4."],
      answer: "10, not 15.",
      notes: {
        say: "Walk the class through this slide slowly and check understanding.",
        ask: "",
        doubts: [],
      },
    },
    {
      ...fakeSlides(
        [
          {
            kind: "activity",
            title: "Find the flaw",
            focus: "",
            topic: "Gauss",
            visual: "",
            activity: "spot-the-flaw",
          },
        ],
        3,
      )[0],
    },
  ];
  const outline = {
    ...fakeOutline(brief("teach", 6)),
    slides: fakeOutline(brief("teach", 6)).slides.slice(0, rich.length),
  };
  const summary: AiSlide[] = [
    {
      layout: "summary",
      title: "Gauss's law on one page",
      groups: [
        { heading: "The law", points: ["Flux through a closed surface = Q/ε₀."] },
        { heading: "When to use it", points: ["Spherical, cylindrical or planar symmetry."] },
        { heading: "Common slips", points: ["Using total charge instead of enclosed charge."] },
        { heading: "Units", points: ["Flux in N·m²/C."] },
      ],
      formulas: [{ latex: "\\Phi = \\frac{Q}{\\varepsilon_0}" }],
      mnemonic: "Inside counts, outside doesn't.",
      map: { code: "flowchart LR\n A[Charge] --> B[Flux]" },
      notes: {
        say: "Walk the class through this slide slowly and check understanding.",
        ask: "",
        doubts: [],
      },
    },
  ];

  for (const theme of THEMES)
    it(`${theme.name}: a teaching PowerPoint and PDF with concept, code, symbols and activity render without overflow`, async () => {
      const { plan } = assemblePlan({
        brief: { ...brief("teach", rich.length + 2) },
        outline,
        slides: rich,
        lessons: [lesson],
        subjectName: "Applied Physics",
        levelName: "First Encounter",
        teacherNotes: true,
      });
      expect(overflowRisks(plan)).toEqual([]);
      const files = unzipSync(await renderPptx(plan, theme, imagesFor(plan)));
      const xml = Object.keys(files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .map((f) => strFromU8(files[f]))
        .join(" ");
      expect(xml.toLowerCase()).toContain("think of it like this");
      expect(xml.toLowerCase()).toContain("what each symbol means");
      expect(xml).toContain("Consolas");
      expect(xml.toLowerCase()).toContain("spot the flaw");
      const pdf = await renderPdf(plan, theme, imagesFor(plan), fonts);
      expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    });

  it("a one-page summary of grouped boxes renders on one page and one slide", async () => {
    const { plan } = assemblePlan({
      brief: brief("summary", 1),
      outline: fakeOutline(brief("summary", 1)),
      slides: summary,
      lessons: [lesson],
      subjectName: "Applied Physics",
      levelName: "First Encounter",
      teacherNotes: false,
    });
    expect(plan.slides).toHaveLength(1);
    const files = unzipSync(await renderPptx(plan, THEMES[0], imagesFor(plan)));
    expect(Object.keys(files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(
      1,
    );
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await renderPdf(plan, THEMES[0], imagesFor(plan), fonts));
    expect(doc.getPageCount()).toBe(1);
  });
});

describe("too much for one slide", () => {
  it("splits an overflowing concept slide in two instead of shrinking the text", () => {
    const long =
      "This point is long on purpose so the slide fills up well past what fits at a readable size. ".repeat(
        2,
      );
    const slide: Slide = {
      id: "s1",
      layout: "concept",
      title: "A very full idea",
      analogy: long,
      points: Array.from({ length: 6 }, () => long),
      example: { label: "Example", text: long, code: "int x = 1;\n".repeat(12) },
      takeaway: "Split, don't shrink.",
      notes: "",
    };
    expect(slide.layout === "concept" && conceptFit(slide).fits).toBe(false);
    const plan = splitOverflow({
      title: "T",
      subject: "S",
      purpose: "study",
      level: "L",
      topics: ["t"],
      slides: [slide],
      visuals: {},
      credits: [],
    });
    expect(plan.slides.length).toBeGreaterThanOrEqual(2);
    expect(plan.slides.at(-1)).toMatchObject({ title: "A very full idea (continued)" });
    expect(overflowRisks(plan)).toEqual([]);
  });
});

describe("every purpose end to end with the test AI", () => {
  for (const purpose of PURPOSES)
    it(`${purpose}: a valid plan that renders`, async () => {
      const { post } = fakeServer();
      const b = brief(purpose, 12);
      const deck = await writeDeck(b, post, () => {});
      const { plan, checks } = assemblePlan({
        brief: b,
        outline: deck.outline,
        slides: deck.slides,
        lessons: [lesson],
        subjectName: "Applied Physics",
        levelName: "First Encounter",
        teacherNotes: true,
      });
      expect(checks).toEqual([]);
      const bytes = await renderPptx(plan, THEMES[1], imagesFor(plan));
      expect(bytes.length).toBeGreaterThan(10_000);
    });
});
