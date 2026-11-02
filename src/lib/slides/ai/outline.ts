import { z } from "zod";
import { activitiesFor } from "@/lib/slides/ai/count";
import {
  ACTIVITY_FORMATS,
  ACTIVITY_LABEL,
  PURPOSES,
  type ActivityFormat,
  type Purpose,
} from "@/lib/slides/plan";

/*
 * Step 1 of a deck (deck quality overhaul): a detailed OUTLINE before any slide is written:
 * learning goals, prerequisites, misconceptions, and the slide-by-slide sequence (what each slide
 * must teach, where examples, visuals and activities go). Like a lesson plan before the lesson.
 * Code checks the outline (slide count, activity count and variety, practice answers at the end)
 * before step 2 writes the slides from it.
 */

export const OUTLINE_KINDS = [
  "hook",
  "goals",
  "section",
  "concept",
  "example",
  "formula",
  "compare",
  "diagram",
  "activity",
  "reveal",
  "mistakes",
  "confuse",
  "check",
  "recap",
  "exit",
  "exam",
  "questions",
  "answers",
  "summary",
] as const;
export type OutlineKind = (typeof OUTLINE_KINDS)[number];

const str = (max: number) => z.string().trim().max(max);

/**
 * An activity format however the AI wrote it ("Spot the flaw", "spot_the_flaw", "Predict then
 * reveal", "Pick a side") → the format id, or undefined when it isn't one.
 */
export function activityFormat(v: unknown): ActivityFormat | undefined {
  if (typeof v !== "string") return undefined;
  const key = v
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
    .replace(/^-|-$/g, "");
  const direct = ACTIVITY_FORMATS.find((f) => f === key);
  if (direct) return direct;
  const byLabel = ACTIVITY_FORMATS.find(
    (f) =>
      ACTIVITY_LABEL[f]
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")
        .replace(/^-|-$/g, "") === key,
  );
  if (byLabel) return byLabel;
  // Close enough: "debate-pick-a-side", "fermi", "predict-then-reveal", "misconception".
  return (
    ACTIVITY_FORMATS.find((f) => key.includes(f)) ??
    ACTIVITY_FORMATS.find((f) => key.split("-")[0] === f.split("-")[0])
  );
}

export const OutlineItemSchema = z.object({
  // An unknown kind ("worked example", "intro") is planned as a concept slide, not a failed plan.
  kind: z
    .preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(OUTLINE_KINDS))
    .catch("concept"),
  title: str(100).min(1),
  /** What this slide must teach or do, specifically (the writer's brief). */
  focus: str(500).min(1),
  /** Which topic it belongs to (by name). */
  topic: str(120).default(""),
  /** The visual it needs, described ("flowchart of the compile stages"), or "". */
  visual: str(200).default(""),
  /** Activities: the format. */
  activity: z.preprocess(activityFormat, z.enum(ACTIVITY_FORMATS).optional()).catch(undefined),
  /** Teaching decks: minutes for this slide. */
  minutes: z.number().min(0).max(60).optional().catch(undefined),
});
export type OutlineItem = z.infer<typeof OutlineItemSchema>;

export const OutlineSchema = z.object({
  goals: z.array(str(240).min(1)).min(1).max(6),
  prerequisites: z.array(str(200).min(1)).max(6).default([]),
  misconceptions: z.array(str(260).min(1)).max(8).default([]),
  /** Assumptions the deck makes (stated, never invented as fact). */
  assumptions: str(400).default(""),
  slides: z.array(OutlineItemSchema).min(1).max(80),
});
export type Outline = z.infer<typeof OutlineSchema>;

/** Slides the code adds itself (the title slide and the sources slide; none for a summary). */
export const fixedSlides = (purpose: Purpose) => (purpose === "summary" ? 0 : 2);

/** Content slides the outline must plan for a deck of `total` slides. */
export const contentSlides = (purpose: Purpose, total: number) =>
  purpose === "summary" ? 1 : Math.max(1, total - fixedSlides(purpose));

/** What the student's choices ask of the deck (the request every step shares). */
export type DeckBrief = {
  purpose: Purpose;
  title: string;
  /** "Applied Physics, PDEU B.Tech, semester 1" */
  course: string;
  level: string;
  /** Total slides asked for (title and sources included). */
  slides: number;
  topics: { name: string; digest: string }[];
  /** The lessons' own visuals the writer may reuse. */
  visuals: { key: string; caption: string }[];
  /** The student's notes for these topics. */
  material: string[];
  /** Past exam questions (revision and practice). */
  pyqs: string[];
  /** Share of past-paper questions per topic, when there are past papers. */
  weights: { topic: string; percent: number }[];
};

const briefText = (max: number) => z.string().trim().max(max);
/** The brief as the server receives it (every deck request carries it). */
export const DeckBriefSchema = z.object({
  purpose: z.enum(PURPOSES),
  title: briefText(160).min(1),
  course: briefText(200).min(1),
  level: briefText(60).min(1),
  slides: z.int().min(1).max(60),
  topics: z
    .array(z.object({ name: briefText(160).min(1), digest: briefText(6000) }))
    .min(1)
    .max(30),
  visuals: z
    .array(z.object({ key: briefText(20), caption: briefText(240) }))
    .max(60)
    .default([]),
  material: z.array(briefText(800)).max(10).default([]),
  pyqs: z.array(briefText(500)).max(15).default([]),
  weights: z
    .array(z.object({ topic: briefText(160), percent: z.number().min(0).max(100) }))
    .max(30)
    .default([]),
});

/** The structure each purpose follows (shared by the outline and the writer). */
export const PURPOSE_RULES: Record<Purpose, string> = {
  teach: `A TEACHING deck for a teacher presenting to college students. Structure: hook → learning goals → concepts built step by step (each concept slide followed by an example where useful) → an ACTIVITY right after each hard concept → recap → exit question. Slides carry moderate text; the teacher's detail goes in the speaker notes.`,
  study: `A SELF-STUDY deck read alone, with no teacher: fuller explanations on the slides themselves, an everyday analogy before each hard idea, worked examples step by step, a "common mistakes" slide, and "check yourself" questions with their answers at the end.`,
  revise: `A REVISION deck: dense but scannable. Key formulas with symbols explained, precise definitions, diagrams worth remembering, "don't confuse X with Y" slides, likely exam questions. No long explanations.`,
  practice: `A PRACTICE SHEET: questions in graded sections (warm-up → exam level → challenge), a mix of question types matching the past papers when given, then a full ANSWER KEY with steps at the end (answers slides after all questions slides).`,
  summary: `A ONE-PAGE SUMMARY: every key idea, formula and relationship on a single page, organised in grouped boxes (one per idea cluster) with a small concept map, not a bullet list.`,
};

export function outlinePrompt(b: DeckBrief): { system: string; prompt: string } {
  const n = contentSlides(b.purpose, b.slides);
  const acts = b.purpose === "teach" ? activitiesFor(b.slides) : 0;
  const system = `You are an expert university teacher planning ${b.purpose === "summary" ? "a one-page summary" : "a slide deck"} on ${b.title} for ${b.course} (${b.level} level).
${PURPOSE_RULES[b.purpose]}
Plan it as a detailed OUTLINE first:
- "goals": 2-5 learning goals (what students can DO afterwards). "prerequisites": what they must already know. "misconceptions": the common wrong ideas this topic causes. "assumptions": anything you assume (e.g. "Assume ideal wires"), or "".
- "slides": EXACTLY ${n} slides in teaching order. Each: "kind" (${OUTLINE_KINDS.join(", ")}), "title", "focus" (precisely what the slide must teach or do: the idea, the example to use with its numbers, the code, the comparison; specific enough for another teacher to write it), "topic" (the topic name), "visual" (the diagram, table, graph or formula breakdown it needs, or "").
- Slide count is DEPTH, not padding: more slides means more examples, more steps, more practice. Never plan two slides with the same content.
- Plan a visual wherever it helps: flowcharts, process steps, labelled structures, comparison tables, graphs, formula breakdowns. A lesson visual may be reused by its key (listed below).${
    acts
      ? `\n- Plan ${acts} activity slide${acts > 1 ? "s" : ""} ("kind": "activity"), each right after a hard concept, each a DIFFERENT "activity" format from: ${ACTIVITY_FORMATS.join(", ")}. A "predict-reveal" activity is followed by a "reveal" slide. "minutes": time per slide.`
      : ""
  }${b.purpose === "practice" ? `\n- "questions" slides (up to 5 questions each) in graded sections, then "answers" slides for every question at the end.` : ""}${b.purpose === "summary" ? `\n- Exactly 1 slide of kind "summary".` : ""}
- Ground the plan in the LESSON MATERIAL and the STUDENT'S NOTES first; fill gaps with standard textbook knowledge. Don't invent exam patterns or weightage that aren't given.
Reply with JSON only: {"goals":["..."],"prerequisites":["..."],"misconceptions":["..."],"assumptions":"","slides":[{"kind":"concept","title":"...","focus":"...","topic":"...","visual":"..."}]}`;
  const prompt = `Deck: ${b.title} (${b.slides} slides in all; you plan the ${n} content slides, the title and sources slides are added for you)
Course: ${b.course}

LESSON MATERIAL (checked):
${b.topics.map((t) => t.digest).join("\n\n")}${b.visuals.length ? `\n\nLESSON VISUALS (reuse by key):\n${b.visuals.map((v) => `- ${v.key}: ${v.caption}`).join("\n")}` : ""}${b.material.length ? `\n\nSTUDENT'S NOTES:\n${b.material.map((m) => `- ${m}`).join("\n")}` : ""}${b.pyqs.length ? `\n\nPAST EXAM QUESTIONS:\n${b.pyqs.map((q) => `- ${q}`).join("\n")}` : ""}${b.weights.length ? `\n\nEXAM WEIGHTAGE (share of past-paper questions):\n${b.weights.map((w) => `- ${w.topic}: ${w.percent}%`).join("\n")}` : ""}`;
  return { system, prompt };
}

/**
 * Problems with an outline (code, no AI): the slide count, activities (count, variety, placed
 * after a concept), practice answers after the questions, one summary page. Empty = fine.
 */
export function outlineProblems(o: Outline, purpose: Purpose, total: number): string[] {
  const out: string[] = [];
  const n = contentSlides(purpose, total);
  // Up to SHORT_BY slides fewer is accepted (a slide that's too full is split later anyway).
  if (o.slides.length > n || o.slides.length < n - SHORT_BY)
    out.push(`plan exactly ${n} slides, not ${o.slides.length}`);
  if (purpose === "teach") {
    const acts = o.slides.filter((s) => s.kind === "activity");
    const need = activitiesFor(total);
    if (acts.length < need) out.push(`plan at least ${need} activities, not ${acts.length}`);
    const formats = acts.map((a) => a.activity);
    if (formats.some((f) => !f)) out.push(`every activity needs an "activity" format`);
    if (new Set(formats).size !== formats.length)
      out.push("use a different format for each activity");
    o.slides.forEach((s, i) => {
      if (s.kind === "activity" && i < 2)
        out.push(`slide ${i + 1}: an activity belongs after a concept has been taught`);
    });
  }
  if (purpose === "practice") {
    const q = o.slides.findIndex((s) => s.kind === "questions");
    const lastQ = o.slides.map((s) => s.kind).lastIndexOf("questions");
    const a = o.slides.findIndex((s) => s.kind === "answers");
    if (q < 0 || a < 0) out.push(`plan "questions" slides and "answers" slides`);
    else if (a < lastQ) out.push("all answers slides go after the last questions slide");
  }
  if (purpose === "summary" && !o.slides.some((s) => s.kind === "summary"))
    out.push(`plan one slide of kind "summary"`);
  const titles = o.slides.map((s) => s.title.toLowerCase());
  const repeats = titles.filter((t, i) => titles.indexOf(t) !== i);
  if (repeats.length)
    out.push(`two slides share a title ("${repeats[0]}"): each slide must be different`);
  return out;
}

/** How many content slides fewer than asked an outline may plan. */
export const SHORT_BY = 2;

/**
 * Small repairs code can make instead of rejecting a good plan: extra slides dropped (from the
 * end, keeping recap, answers and activities), and every activity given its own format (a missing
 * or repeated one gets the next unused format).
 */
export function fitOutline(o: Outline, purpose: Purpose, total: number): Outline {
  const n = contentSlides(purpose, total);
  let slides = [...o.slides];
  if (slides.length > n) {
    const keep = new Set<OutlineKind>([
      "recap",
      "exit",
      "answers",
      "summary",
      "activity",
      "reveal",
    ]);
    for (let i = slides.length - 1; i >= 0 && slides.length > n; i--)
      if (!keep.has(slides[i].kind)) slides.splice(i, 1);
    slides = slides.slice(0, n);
  }
  const used = new Set<ActivityFormat>();
  slides = slides.map((s) => {
    if (s.kind !== "activity") return s;
    if (s.activity && !used.has(s.activity)) {
      used.add(s.activity);
      return s;
    }
    const free = ACTIVITY_FORMATS.find((f) => !used.has(f));
    if (!free) return s;
    used.add(free);
    return { ...s, activity: free };
  });
  return { ...o, slides };
}

/** The test AI's outline: a valid plan of the right shape for each purpose. */
export function fakeOutline(b: DeckBrief): Outline {
  const n = contentSlides(b.purpose, b.slides);
  const topic = b.topics[0]?.name ?? b.title;
  const base: OutlineItem = { kind: "concept", title: "", focus: "", topic, visual: "" };
  let kinds: OutlineKind[];
  if (b.purpose === "summary") kinds = ["summary"];
  else if (b.purpose === "practice") {
    const half = Math.max(1, Math.floor(n / 2));
    kinds = Array.from({ length: n }, (_, i) => (i < half ? "questions" : "answers"));
  } else {
    kinds = Array.from({ length: n }, (_, i) => (i % 3 === 1 ? "example" : "concept"));
    if (b.purpose === "teach") {
      const acts = activitiesFor(b.slides);
      for (let k = 0; k < acts; k++) kinds[Math.min(n - 1, 2 + k * 3)] = "activity";
      kinds[n - 1] = "recap";
    }
  }
  let act = 0;
  return {
    goals: [`Explain ${topic} and use it to solve a problem.`],
    prerequisites: [],
    misconceptions: [],
    assumptions: "",
    slides: kinds.map((kind, i) => ({
      ...base,
      kind,
      title: `${kind[0].toUpperCase()}${kind.slice(1)} ${i + 1}: ${topic}`.slice(0, 100),
      focus: `Test focus for slide ${i + 1} on ${topic}.`,
      ...(kind === "activity"
        ? { activity: ACTIVITY_FORMATS[act++ % ACTIVITY_FORMATS.length] }
        : {}),
    })),
  };
}
