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

/**
 * Activity formats for teaching decks (deck quality overhaul): each makes students reason, not
 * recall. A deck uses each format at most once.
 */
export const ACTIVITY_FORMATS = [
  "predict-reveal",
  "spot-the-flaw",
  "what-breaks-if",
  "real-world-mystery",
  "fermi-estimate",
  "debate",
  "design-challenge",
  "misconception-trap",
  "team-race",
] as const;
export type ActivityFormat = (typeof ACTIVITY_FORMATS)[number];
export const ACTIVITY_LABEL: Record<ActivityFormat, string> = {
  "predict-reveal": "Predict, then reveal",
  "spot-the-flaw": "Spot the flaw",
  "what-breaks-if": "What breaks if…",
  "real-world-mystery": "Real-world mystery",
  "fermi-estimate": "Fermi estimate",
  debate: "Pick a side",
  "design-challenge": "Design challenge",
  "misconception-trap": "Misconception trap",
  "team-race": "Team race",
};

export const FORMATS = ["pptx", "pdf"] as const;
export type Format = (typeof FORMATS)[number];

const short = (max: number) => z.string().trim().min(1).max(max);
const line = short(360);
const notes = z.string().trim().max(4000);

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
    text: short(420),
    label: z.string().trim().max(50),
  }),
  z.object({
    ...base,
    layout: z.literal("bullets"),
    title: short(90),
    points: z.array(line).min(1).max(6),
  }),
  z.object({
    ...base,
    /**
     * One idea explained properly: an everyday analogy for hard ideas, what it is and why it
     * works (points), a concrete example (worked numbers, code, a real case) and a one-line
     * takeaway, with an optional picture. A slide too full to read is split in two by code
     * (the example moves to a "continued" slide), never shrunk.
     */
    layout: z.literal("concept"),
    title: short(90),
    analogy: z.string().trim().max(300),
    points: z.array(line).max(6),
    example: z
      .object({
        label: short(60),
        text: z.string().trim().max(600),
        /** Source code, shown in a fixed-width font with its line breaks kept. */
        code: z.string().max(1200),
      })
      .optional(),
    takeaway: short(220),
    picture: picture.optional(),
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
    steps: z.array(short(340)).min(1).max(6),
  }),
  z.object({
    ...base,
    layout: z.literal("comparison"),
    title: short(90),
    columns: z.array(short(40)).min(2).max(4),
    rows: z
      .array(z.array(short(170)))
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
    /** What each symbol means ("E: electric field, in N/C"); older plans have none. */
    symbols: z.array(short(200)).max(8).optional(),
  }),
  z.object({
    ...base,
    layout: z.literal("example"),
    title: short(90),
    problem: short(620),
    /** Source code that belongs to the problem (fixed-width, line breaks kept). */
    code: z.string().max(1200).optional(),
    steps: z.array(short(340)).min(1).max(6),
    answer: short(340),
  }),
  z.object({
    ...base,
    layout: z.literal("quiz"),
    title: short(90),
    question: short(620),
    options: z.array(short(260)).max(6),
    /** Shown on the slide only for study and revision material. */
    answer: z.string().trim().max(500),
    explanation: z.string().trim().max(700),
    showAnswer: z.boolean(),
  }),
  z.object({
    ...base,
    layout: z.literal("activity"),
    title: short(90),
    prompt: short(700),
    /** How to work on it, in order (think alone, compare, check against the lesson). */
    hints: z.array(line).max(4),
    minutes: z.int().min(1).max(30),
    /** The kind of activity (older plans have none). */
    format: z.enum(ACTIVITY_FORMATS).optional(),
    /** Who works together: "Pairs", "Groups of 4", "Whole class". */
    group: z.string().trim().max(40).optional(),
    /** Code, a flawed solution or data the activity is about (fixed-width when code). */
    material: z.string().max(1200).optional(),
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
      .array(z.object({ n: z.int().min(1), text: short(620) }))
      .min(1)
      .max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("answers"),
    title: short(90),
    items: z
      .array(z.object({ n: z.int().min(1), answer: short(500), why: z.string().trim().max(700) }))
      .min(1)
      .max(5),
  }),
  z.object({
    ...base,
    layout: z.literal("sources"),
    title: short(90),
    items: z
      .array(z.object({ label: short(260), detail: z.string().trim().max(200) }))
      .min(1)
      .max(10),
  }),
  z.object({
    ...base,
    layout: z.literal("summary"),
    title: short(100),
    points: z.array(line).max(5),
    formulas: z.array(picture).max(3),
    mnemonic: z.string().trim().max(420),
    /** Grouped boxes (one per idea cluster); when present they replace the plain points. */
    groups: z
      .array(z.object({ heading: short(60), points: z.array(short(200)).min(1).max(5) }))
      .max(6)
      .optional(),
    /** A small concept map picture linking the groups. */
    map: picture.optional(),
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
  /** Teaching PDFs: print the speaker notes as "teacher notes" (default on). */
  teacherNotes: z.boolean().optional(),
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
    case "concept":
      return slide.picture ? [slide.picture.key] : [];
    case "formula":
      return slide.formulas.map((f) => f.key);
    case "summary":
      return [...slide.formulas.map((f) => f.key), ...(slide.map ? [slide.map.key] : [])];
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
    if (s.layout === "concept" && s.points.length === 0 && !s.example)
      out.push(`${where}: a concept slide needs points or an example`);
    if (s.layout === "summary" && s.points.length === 0 && !s.groups?.length)
      out.push(`${where}: a summary needs points or groups`);
  });
  const ids = plan.slides.map((s) => s.id);
  if (new Set(ids).size !== ids.length) out.push("slide ids must be unique");
  return out;
}

/** Slides → rough pages for a PDF (a PDF page holds about two slides' worth). */
export function pagesFor(slides: number): number {
  return Math.max(1, Math.ceil(slides / 2));
}
