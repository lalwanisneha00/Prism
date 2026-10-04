import { z } from "zod";
import { VisualSpecSchema } from "@/lib/schema";

/*
 * The slide plan (Feature B): a validated JSON outline of a deck or PDF, produced first and
 * then rendered. Like an architect's drawing before the builders arrive: slide type, title,
 * short content, speaker notes and which picture goes where. The AI never draws: pictures are
 * the lesson's own checked visuals, formulas typeset by KaTeX, or labelled stills.
 */

export const PURPOSES = ["teach", "study", "revise", "practice", "summary"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_INFO: Record<Purpose, { label: string; hint: string }> = {
  teach: {
    label: "For teaching",
    hint: "A presentation with speaker notes, a class activity and a recap.",
  },
  study: {
    label: "To study from",
    hint: "Fuller explanations, analogies, worked examples and common mistakes.",
  },
  revise: {
    label: "For revision",
    hint: "Compact: key points, formulas, a concept map, mnemonics, quick questions.",
  },
  practice: { label: "Practice sheet", hint: "Questions first, answers at the end." },
  summary: { label: "One-page summary", hint: "Everything that matters on a single page." },
};

export const FORMATS = ["pptx", "pdf"] as const;
export type Format = (typeof FORMATS)[number];

const short = (max: number) => z.string().trim().min(1).max(max);
const line = short(160);
const notes = z.string().trim().max(1600);

const base = { id: z.string().min(1).max(60), notes };

/** A picture slot: the key points at an entry of `visuals` (rendered to an image later). */
const picture = z.object({
  key: z.string().min(1).max(80),
  caption: z.string().trim().max(240),
  alt: z.string().trim().max(240),
});

export const SlideSchema = z.discriminatedUnion("layout", [
  z.object({
    ...base,
    layout: z.literal("title"),
    title: short(100),
    subtitle: z.string().trim().max(160),
    tag: z.string().trim().max(80),
  }),
  z.object({
    ...base,
    layout: z.literal("section"),
    title: short(90),
    kicker: z.string().trim().max(60),
  }),
  z.object({
    ...base,
    layout: z.literal("statement"),
    text: short(190),
    label: z.string().trim().max(50),
  }),
  z.object({
    ...base,
    layout: z.literal("bullets"),
    title: short(90),
    points: z.array(line).min(1).max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("two-column"),
    title: short(90),
    left: z.object({ heading: short(50), points: z.array(line).min(1).max(4) }),
    right: z.object({ heading: short(50), points: z.array(line).min(1).max(4) }),
  }),
  z.object({
    ...base,
    layout: z.literal("steps"),
    title: short(90),
    steps: z.array(short(150)).min(1).max(6),
  }),
  z.object({
    ...base,
    layout: z.literal("comparison"),
    title: short(90),
    columns: z.array(short(40)).min(2).max(4),
    rows: z
      .array(z.array(short(70)))
      .min(1)
      .max(6),
  }),
  z.object({
    ...base,
    layout: z.literal("image"),
    title: z.string().trim().max(90),
    picture,
    /** Where the text goes next to the picture ("full" = diagram across the whole slide). */
    side: z.enum(["left", "right", "full"]),
    points: z.array(line).max(3),
  }),
  z.object({
    ...base,
    layout: z.literal("formula"),
    title: short(90),
    /** Keys of `visuals` entries (one typeset formula each). */
    formulas: z.array(picture).min(1).max(4),
  }),
  z.object({
    ...base,
    layout: z.literal("example"),
    title: short(90),
    problem: short(260),
    steps: z.array(short(170)).min(1).max(6),
    answer: short(160),
  }),
  z.object({
    ...base,
    layout: z.literal("quiz"),
    title: short(90),
    question: short(260),
    options: z.array(short(110)).max(6),
    /** Shown on the slide only for study and revision material. */
    answer: z.string().trim().max(220),
    explanation: z.string().trim().max(300),
    showAnswer: z.boolean(),
  }),
  z.object({
    ...base,
    layout: z.literal("activity"),
    title: short(90),
    prompt: short(260),
    minutes: z.int().min(1).max(30),
  }),
  z.object({
    ...base,
    layout: z.literal("recap"),
    title: short(90),
    points: z.array(line).min(1).max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("questions"),
    title: short(90),
    items: z
      .array(z.object({ n: z.int().min(1), text: short(260) }))
      .min(1)
      .max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("answers"),
    title: short(90),
    items: z
      .array(z.object({ n: z.int().min(1), answer: short(220), why: z.string().trim().max(300) }))
      .min(1)
      .max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("sources"),
    title: short(90),
    items: z
      .array(z.object({ label: short(120), detail: z.string().trim().max(200) }))
      .min(1)
      .max(10),
  }),
  z.object({
    ...base,
    layout: z.literal("summary"),
    title: short(100),
    points: z.array(line).min(1).max(5),
    formulas: z.array(picture).max(3),
    mnemonic: z.string().trim().max(200),
  }),
]);
export type Slide = z.infer<typeof SlideSchema>;
export type SlideLayout = Slide["layout"];
export type Picture = z.infer<typeof picture>;

/** What must be drawn for a picture slot. Filled in by the browser, never by the AI. */
export const VisualRequestSchema = z.discriminatedUnion("kind", [
  /** One of the lesson's own visuals, drawn by its trusted renderer (a widget at fixed settings, a chart, a diagram…). */
  z.object({ kind: z.literal("visual"), spec: VisualSpecSchema }),
  /** A formula typeset by KaTeX. */
  z.object({ kind: z.literal("latex"), latex: short(400) }),
  /** A concept map: a Mermaid flowchart built from the lesson's prerequisites. */
  z.object({ kind: z.literal("mermaid"), code: short(2000) }),
]);
export type VisualRequest = z.infer<typeof VisualRequestSchema>;

export const SlidePlanSchema = z.object({
  title: short(160),
  subject: short(120),
  purpose: z.enum(PURPOSES),
  level: short(40),
  topics: z.array(short(120)).min(1),
  /** How long a teacher should plan for (teaching decks). */
  minutes: z.int().min(1).max(600).optional(),
  slides: z.array(SlideSchema).min(1).max(80),
  visuals: z.record(z.string(), VisualRequestSchema),
  /** Wording for a source / licence line, e.g. "Wikimedia Commons, CC BY-SA". */
  credits: z.array(z.string().max(240)).max(40),
});
export type SlidePlan = z.infer<typeof SlidePlanSchema>;

/** Every picture key a slide uses. */
export function pictureKeys(slide: Slide): string[] {
  switch (slide.layout) {
    case "image":
      return [slide.picture.key];
    case "formula":
    case "summary":
      return slide.formulas.map((f) => f.key);
    default:
      return [];
  }
}

/**
 * Problems a plan must not have (empty slides, too many lines, a picture with nothing to draw,
 * teaching slides without notes). An empty list means the plan is ready to render.
 */
export function planProblems(plan: SlidePlan): string[] {
  const out: string[] = [];
  const parsed = SlidePlanSchema.safeParse(plan);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  plan.slides.forEach((s, i) => {
    const where = `slide ${i + 1} (${s.layout})`;
    for (const key of pictureKeys(s)) {
      if (!plan.visuals[key]) out.push(`${where}: picture "${key}" has nothing to draw`);
    }
    if (plan.purpose === "teach" && s.notes.trim().length < 20 && s.layout !== "sources") {
      out.push(`${where}: a teaching slide needs speaker notes`);
    }
  });
  const ids = plan.slides.map((s) => s.id);
  if (new Set(ids).size !== ids.length) out.push("slide ids must be unique");
  return out;
}

/** Slides → rough pages for a PDF (a PDF page holds about two slides' worth). */
export function pagesFor(slides: number): number {
  return Math.max(1, Math.ceil(slides / 2));
}
