import { z } from "zod";
import { similarity } from "@/lib/mock/paper";
import type { LessonVisual } from "@/lib/slides/ai/digest";
import {
  PURPOSE_RULES,
  type DeckBrief,
  type Outline,
  type OutlineItem,
} from "@/lib/slides/ai/outline";
import {
  ACTIVITY_FORMATS,
  type Picture,
  type Purpose,
  type Slide,
  type VisualRequest,
} from "@/lib/slides/plan";

/*
 * Step 2 of a deck (deck quality overhaul): the slides, written from the outline a few at a time.
 * The AI fills in content and asks for pictures (a Mermaid diagram, a formula, a plot, a lesson's
 * own visual); it never draws. Code then checks each slide for depth (a concept explained with
 * an example and a takeaway, no thin bullets), for teaching notes, and every activity against the
 * reject list (recall, one-word answers, "just discuss", repeated formats). Failed slides are
 * rewritten before they reach the deck.
 */

const str = (max: number) => z.string().trim().max(max);
const req = (max: number) => z.string().trim().min(1).max(max);

const NotesSchema = z
  .object({
    /** What the teacher says, how to explain it. */
    say: str(1500).default(""),
    /** The question to ask the class. */
    ask: str(400).default(""),
    doubts: z
      .array(z.object({ doubt: req(300), answer: req(500) }))
      .max(4)
      .default([]),
    minutes: z.number().min(0).max(60).optional().catch(undefined),
  })
  .default({ say: "", ask: "", doubts: [] });

const mermaidStart =
  /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|mindmap|timeline|pie|journey)\b/;

export const AiVisualSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mermaid"), code: req(2000), caption: str(200).default("") }),
  z.object({ type: z.literal("latex"), latex: req(400), caption: str(200).default("") }),
  z.object({ type: z.literal("lesson"), key: req(20), caption: str(200).default("") }),
  z.object({
    type: z.literal("plot"),
    expression: req(200),
    xRange: z.tuple([z.number(), z.number()]),
    xLabel: req(60),
    yLabel: req(60),
    caption: str(200).default(""),
  }),
]);
export type AiVisual = z.infer<typeof AiVisualSchema>;

const point = req(300);
const notes = { notes: NotesSchema };

export const AiSlideSchema = z.discriminatedUnion("layout", [
  z.object({
    layout: z.literal("concept"),
    title: req(90),
    analogy: str(300).default(""),
    points: z.array(point).max(6),
    example: z
      .object({
        label: req(60),
        text: str(600).default(""),
        code: z.string().max(1200).default(""),
      })
      .optional(),
    takeaway: req(220),
    visual: AiVisualSchema.optional(),
    ...notes,
  }),
  z.object({
    layout: z.literal("bullets"),
    title: req(90),
    points: z.array(point).min(1).max(6),
    ...notes,
  }),
  z.object({
    layout: z.literal("recap"),
    title: req(90),
    points: z.array(point).min(1).max(6),
    ...notes,
  }),
  z.object({
    layout: z.literal("two-column"),
    title: req(90),
    left: z.object({ heading: req(50), points: z.array(point).min(1).max(4) }),
    right: z.object({ heading: req(50), points: z.array(point).min(1).max(4) }),
    ...notes,
  }),
  z.object({
    layout: z.literal("steps"),
    title: req(90),
    steps: z.array(req(340)).min(2).max(6),
    ...notes,
  }),
  z.object({
    layout: z.literal("comparison"),
    title: req(90),
    columns: z.array(req(40)).min(2).max(4),
    rows: z
      .array(z.array(req(170)))
      .min(1)
      .max(6),
    ...notes,
  }),
  z.object({
    layout: z.literal("formula"),
    title: req(90),
    formulas: z
      .array(z.object({ latex: req(400), caption: str(200).default("") }))
      .min(1)
      .max(3),
    symbols: z.array(req(200)).max(8).default([]),
    ...notes,
  }),
  z.object({
    layout: z.literal("example"),
    title: req(90),
    problem: req(620),
    code: z.string().max(1200).default(""),
    steps: z.array(req(340)).min(1).max(6),
    answer: req(340),
    ...notes,
  }),
  z.object({
    layout: z.literal("diagram"),
    title: req(90),
    visual: AiVisualSchema,
    points: z.array(point).max(3).default([]),
    ...notes,
  }),
  z.object({
    layout: z.literal("quiz"),
    title: req(90),
    question: req(620),
    options: z.array(req(260)).max(6).default([]),
    answer: req(500),
    explanation: str(700).default(""),
    ...notes,
  }),
  z.object({
    layout: z.literal("activity"),
    title: req(90),
    format: z.enum(ACTIVITY_FORMATS),
    minutes: z.number().min(1).max(30),
    group: req(40),
    /** The challenge, as shown to students. */
    prompt: req(700),
    /** Code, a flawed solution or data the activity is about. */
    material: z.string().max(1200).default(""),
    /** What to do, in order (shown on the slide). */
    steps: z.array(req(300)).min(1).max(4),
    facilitation: z.object({
      answer: req(900),
      hints: z.array(req(300)).min(1).max(3),
      wrongAnswers: z
        .array(z.object({ answer: req(300), why: req(300) }))
        .max(3)
        .default([]),
      debrief: req(500),
    }),
    ...notes,
  }),
  z.object({
    layout: z.literal("statement"),
    label: str(50).default(""),
    text: req(420),
    ...notes,
  }),
  z.object({ layout: z.literal("section"), title: req(90), kicker: str(60).default(""), ...notes }),
  z.object({
    layout: z.literal("questions"),
    title: req(90),
    items: z
      .array(z.object({ n: z.int().min(1), text: req(620) }))
      .min(1)
      .max(5),
    ...notes,
  }),
  z.object({
    layout: z.literal("answers"),
    title: req(90),
    items: z
      .array(z.object({ n: z.int().min(1), answer: req(500), why: str(700).default("") }))
      .min(1)
      .max(5),
    ...notes,
  }),
  z.object({
    layout: z.literal("summary"),
    title: req(100),
    groups: z
      .array(z.object({ heading: req(60), points: z.array(req(200)).min(1).max(5) }))
      .min(2)
      .max(6),
    formulas: z
      .array(z.object({ latex: req(400) }))
      .max(3)
      .default([]),
    mnemonic: str(300).default(""),
    map: z.object({ code: req(2000) }).optional(),
    ...notes,
  }),
]);
export type AiSlide = z.infer<typeof AiSlideSchema>;
export const WriteReplySchema = z.object({ slides: z.array(z.unknown()).max(12) });

/** Slides per writer request: teaching slides carry long notes, revision slides are short. */
export const BATCH: Record<Purpose, number> = {
  teach: 3,
  study: 4,
  revise: 5,
  practice: 4,
  summary: 1,
};

/** The outline in request-sized batches (consecutive slides). */
export function batchesOf(o: Outline, purpose: Purpose): { from: number; items: OutlineItem[] }[] {
  const size = BATCH[purpose];
  const out: { from: number; items: OutlineItem[] }[] = [];
  for (let i = 0; i < o.slides.length; i += size)
    out.push({ from: i, items: o.slides.slice(i, i + size) });
  return out;
}

/** Everything a slide shows, as plain text (for repeat checks and the review). */
export function slideText(s: AiSlide): string {
  switch (s.layout) {
    case "concept":
      return [
        s.title,
        s.analogy,
        ...s.points,
        s.example?.text ?? "",
        s.example?.code ?? "",
        s.takeaway,
      ].join(" ");
    case "bullets":
    case "recap":
      return [s.title, ...s.points].join(" ");
    case "two-column":
      return [s.title, s.left.heading, ...s.left.points, s.right.heading, ...s.right.points].join(
        " ",
      );
    case "steps":
      return [s.title, ...s.steps].join(" ");
    case "comparison":
      return [s.title, ...s.columns, ...s.rows.flat()].join(" ");
    case "formula":
      return [s.title, ...s.formulas.map((f) => f.latex), ...s.symbols].join(" ");
    case "example":
      return [s.title, s.problem, s.code, ...s.steps, s.answer].join(" ");
    case "diagram":
      return [s.title, s.visual.caption, ...s.points].join(" ");
    case "quiz":
      return [s.title, s.question, ...s.options, s.answer, s.explanation].join(" ");
    case "activity":
      return [s.title, s.prompt, s.material, ...s.steps].join(" ");
    case "statement":
      return s.text;
    case "section":
      return s.title;
    case "questions":
      return [s.title, ...s.items.map((i) => i.text)].join(" ");
    case "answers":
      return [s.title, ...s.items.map((i) => `${i.answer} ${i.why}`)].join(" ");
    case "summary":
      return [s.title, ...s.groups.flatMap((g) => [g.heading, ...g.points])].join(" ");
  }
}

const RECALL =
  /^\s*(what is|what are|what do you mean|define|list|name|state|recall|who|when was)\b/i;
const MCQ = /\bwhich (one )?of the following\b|\(a\)[\s\S]*\(b\)/i;

/**
 * An activity against the reject list (code checks; the review checks the rest): it must be a
 * real challenge with a specific question, not recall, an MCQ, "just discuss", a one-word answer,
 * a repeat of an earlier format or of what a slide already says.
 */
export function activityProblems(
  a: Extract<AiSlide, { layout: "activity" }>,
  earlier: { formats: readonly string[]; texts: readonly string[] },
): string[] {
  const out: string[] = [];
  if (RECALL.test(a.prompt))
    out.push("the activity is a recall question: give students something to reason out");
  if (MCQ.test(a.prompt)) out.push("the activity is a plain multiple-choice question");
  if (/^\s*discuss\b/i.test(a.prompt) && !a.prompt.includes("?"))
    out.push(`"discuss X" with no specific question or twist`);
  if (a.prompt.length < 120)
    out.push(
      "the activity's setup is too thin (give the situation, data or code and the exact question)",
    );
  if (a.facilitation.answer.split(/\s+/).length < 12)
    out.push("the expected answer is one word or one definition: the activity must need reasoning");
  if (a.facilitation.hints.length < 2) out.push("give 2-3 hints of increasing help");
  if (a.facilitation.wrongAnswers.length === 0)
    out.push("give at least one common wrong answer and why students give it");
  if (a.minutes < 3 || a.minutes > 8) out.push("an activity takes 3-8 minutes");
  if (earlier.formats.includes(a.format))
    out.push(`the "${a.format}" format is already used in this deck`);
  const closest = Math.max(0, ...earlier.texts.map((t) => similarity(t, a.prompt)));
  if (closest >= 0.6) out.push("the activity is answered on an earlier slide");
  return out;
}

/** Depth and notes checks for one slide (code). Empty = fine. */
export function slideProblems(
  s: AiSlide,
  purpose: Purpose,
  earlier: { formats: readonly string[]; texts: readonly string[] },
): string[] {
  const out: string[] = [];
  const thin = (points: readonly string[]) =>
    points.filter((p) => p.split(/\s+/).length < 5).length;
  switch (s.layout) {
    case "concept":
      if (!s.example || (!s.example.text && !s.example.code))
        out.push(
          "a concept slide needs a concrete example (worked numbers, code, a real case or a derivation step)",
        );
      if (s.points.length < 2)
        out.push("a concept slide needs 2-6 points saying what it is and why it works");
      if (thin(s.points) > 1)
        out.push("points are too vague: 1-2 meaningful lines each, not a few words");
      if (s.visual?.type === "mermaid" && !mermaidStart.test(s.visual.code))
        out.push("the Mermaid diagram must start with its type (e.g. flowchart TD)");
      break;
    case "bullets":
      if (s.points.length < 3 && purpose !== "summary")
        out.push("3-6 meaningful points, not fewer");
      if (thin(s.points) > 1)
        out.push("points are too vague: 1-2 meaningful lines each, not a few words");
      break;
    case "diagram":
      if (s.visual.type === "mermaid" && !mermaidStart.test(s.visual.code))
        out.push("the Mermaid diagram must start with its type (e.g. flowchart TD)");
      break;
    case "activity":
      out.push(...activityProblems(s, earlier));
      break;
    case "comparison":
      if (s.rows.some((r) => r.length !== s.columns.length))
        out.push("every table row needs one cell per column");
      break;
    case "summary":
      if (s.groups.length < 3)
        out.push("a one-page summary groups every key idea: at least 3 groups");
      break;
    default:
      break;
  }
  if (purpose === "teach" && s.layout !== "section" && s.notes.say.split(/\s+/).length < 25)
    out.push(
      "teaching notes must say what to tell the class and how to explain it (several sentences)",
    );
  return out;
}

export type WriteFeedback = { index: number; issues: string[]; fix?: string; previous?: string };

export function writePrompt(input: {
  brief: DeckBrief;
  outline: Outline;
  /** The outline positions (0-based) to write now. */
  indices: readonly number[];
  /** Earlier slides as text (titles and content), to continue from and not repeat. */
  earlier: readonly string[];
  formatsUsed: readonly string[];
  feedback?: readonly WriteFeedback[];
  problems?: readonly { index: number; reason: string }[];
}): { system: string; prompt: string } {
  const b = input.brief;
  const teach = b.purpose === "teach";
  const system = `You are an expert university teacher writing slides for ${b.course} (${b.level} level): ${b.title}.
${PURPOSE_RULES[b.purpose]}
Write EXACTLY the slides listed under WRITE, in order, each following its outline brief.
Depth rules:
- Every slide must genuinely teach. No slide with 3-4 vague bullets and no wall of text: a heading, 3-6 meaningful points of 1-2 lines each, plus a visual or an example.
- "concept" slides explain one idea: an everyday "analogy" first when the idea is hard or abstract ("" otherwise), "points" saying what it is and WHY it works or matters, an "example" (label, and "text" and/or "code": a worked numerical, a code snippet, a real-world case or a derivation step), a one-line "takeaway", and a "visual" when one helps.
- Visuals: "visual" is {"type":"mermaid","code":"flowchart TD\\n  A[Source] --> B[Preprocessor]","caption":"..."} for flowcharts, process steps and labelled structures; {"type":"latex","latex":"...","caption":"..."} for one formula; {"type":"lesson","key":"L1V2","caption":"..."} to reuse a lesson visual; {"type":"plot","expression":"x^2","xRange":[0,5],"xLabel":"...","yLabel":"...","caption":"..."} for a graph. Use "comparison" slides for tables and "formula" slides (with "symbols": what each symbol means, with units) for formula breakdowns.
- Accuracy: check every formula, unit, definition, number and line of code. Code must compile and run as described. Never state implementation-defined behaviour as universal; state assumptions.
- Never repeat an earlier slide's content. Maths in LaTeX inside $...$ in text fields (in JSON write each backslash as \\\\). No HTML.${
    teach
      ? `
- "notes" (speaker notes) on every slide: {"say": what to say and how to explain it, several sentences; "ask": the question to ask the class; "doubts": [{"doubt","answer"}] students commonly raise; "minutes": time for this slide}.
- "activity" slides: {"format", "minutes" (3-8), "group" ("Pairs", "Groups of 4"…), "prompt" (the full setup and the exact question students work on, shown on the slide), "material" (code, a flawed solution or data, or ""), "steps" (instructions shown on the slide), "facilitation": {"answer" (expected answer with reasoning), "hints" (2-3, increasing help), "wrongAnswers" ([{"answer","why"}] students commonly give and why), "debrief" (1 minute linking back to the concept)}}.
  Activities must make college students THINK and pull a distracted student back in. REJECTED if: a one-word or one-definition answer; answered word for word on an earlier slide; solvable with one Google search; "discuss X" with no specific question or twist; a plain recall MCQ.
  BAD: "What is recursion?" GOOD: "Here's a recursive function meant to count down from n and stop. It runs forever for one type of input. In pairs, find which input breaks it and fix it with the smallest change. 4 min."
  Formats: predict-reveal (predict, then the next slide reveals the surprising answer), spot-the-flaw (a plausible but wrong solution/proof/circuit/code), what-breaks-if (change one assumption), real-world-mystery, fermi-estimate, debate (two reasonable positions), design-challenge (constraints), misconception-trap (the intuitive answer is wrong), team-race.`
      : `
- "notes": {"say": a short note for the reader or "", "ask": "", "doubts": []}.`
  }${b.purpose === "study" ? `\n- "quiz" slides are "check yourself" questions; give the "answer" and "explanation".` : ""}${b.purpose === "practice" ? `\n- "questions" items are numbered across the whole sheet (continue from earlier numbers); "answers" give each answer with full steps in "why".` : ""}
Layouts you may use: concept, bullets, recap, two-column, steps, comparison, formula, example (with "code" when it's about code), diagram, quiz, activity, statement (e.g. a reveal), section, questions, answers, summary (one-page: "groups" of points, "formulas" [{"latex"}], "mnemonic", "map" {"code": a small Mermaid flowchart linking the groups}).
Reply with JSON only: {"slides":[{"layout":"concept","title":"...","analogy":"...","points":["..."],"example":{"label":"Worked example","text":"...","code":""},"takeaway":"...","visual":{"type":"mermaid","code":"...","caption":"..."},"notes":{"say":"...","ask":"...","doubts":[],"minutes":3}}]}`;
  const outlineText = input.outline.slides
    .map((s, i) => `${i + 1}. [${s.kind}${s.activity ? `: ${s.activity}` : ""}] ${s.title}`)
    .join("\n");
  const items = input.indices.map((i) => input.outline.slides[i]);
  const write = items
    .map(
      (s, i) =>
        `${input.indices[i] + 1}. kind ${s.kind}${s.activity ? ` (format ${s.activity})` : ""}${s.minutes ? `, ${s.minutes} min` : ""}: "${s.title}" — ${s.focus}${s.visual ? ` VISUAL: ${s.visual}` : ""}`,
    )
    .join("\n");
  const topics = new Set(items.map((i) => i.topic.toLowerCase()));
  const digests = b.topics.filter((t) => topics.has(t.name.toLowerCase()));
  const feedback = (input.feedback ?? []).map(
    (f) =>
      `- slide ${f.index + 1}: ${f.previous ? `CORRECT this version: ${f.previous}\n  ` : ""}Reviewer found: ${f.issues.join("; ")}${f.fix ? `\n  Fix: ${f.fix}` : ""}`,
  );
  const prompt = `Deck: ${b.title}
Goals: ${input.outline.goals.join(" | ")}
Misconceptions to address: ${input.outline.misconceptions.join(" | ") || "none listed"}${input.outline.assumptions ? `\nAssumptions: ${input.outline.assumptions}` : ""}

FULL OUTLINE (for context):
${outlineText}

WRITE these slides:
${write}

LESSON MATERIAL (checked):
${(digests.length ? digests : b.topics).map((t) => t.digest).join("\n\n")}${b.visuals.length ? `\n\nLESSON VISUALS (reuse by key):\n${b.visuals.map((v) => `- ${v.key}: ${v.caption}`).join("\n")}` : ""}${b.material.length ? `\n\nSTUDENT'S NOTES:\n${b.material.map((m) => `- ${m}`).join("\n")}` : ""}${(b.purpose === "practice" || b.purpose === "revise") && b.pyqs.length ? `\n\nPAST EXAM QUESTIONS (style and pattern):\n${b.pyqs.map((q) => `- ${q}`).join("\n")}` : ""}${b.weights.length && b.purpose === "revise" ? `\n\nEXAM WEIGHTAGE:\n${b.weights.map((w) => `- ${w.topic}: ${w.percent}%`).join("\n")}` : ""}${input.earlier.length ? `\n\nEARLIER SLIDES (continue from these; don't repeat them):\n${input.earlier.map((t) => `- ${t}`).join("\n")}` : ""}${input.formatsUsed.length ? `\n\nACTIVITY FORMATS ALREADY USED: ${input.formatsUsed.join(", ")}` : ""}${feedback.length ? `\n\nREVIEWER'S FINDINGS ON THESE SLIDES:\n${feedback.join("\n")}` : ""}${input.problems?.length ? `\n\nYOUR LAST VERSION FAILED THESE CHECKS (rewrite those slides):\n${input.problems.map((p) => `- slide ${p.index + 1}: ${p.reason}`).join("\n")}` : ""}`;
  return { system, prompt };
}

/** Speaker notes as one text (teaching decks), activities with their facilitation guide. */
export function notesText(s: AiSlide, purpose: Purpose): string {
  const parts: string[] = [];
  const n = s.notes;
  if (n.say) parts.push(purpose === "teach" ? `SAY: ${n.say}` : n.say);
  if (n.ask) parts.push(`ASK THE CLASS: ${n.ask}`);
  if (n.doubts.length)
    parts.push(`COMMON DOUBTS:\n${n.doubts.map((d) => `- "${d.doubt}" → ${d.answer}`).join("\n")}`);
  if (s.layout === "activity") {
    const f = s.facilitation;
    parts.push(`EXPECTED ANSWER: ${f.answer}`);
    parts.push(
      `HINTS (give one at a time):\n${f.hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
    );
    if (f.wrongAnswers.length)
      parts.push(
        `COMMON WRONG ANSWERS:\n${f.wrongAnswers.map((w) => `- ${w.answer}: ${w.why}`).join("\n")}`,
      );
    parts.push(`DEBRIEF (1 min): ${f.debrief}`);
  }
  const minutes = s.layout === "activity" ? s.minutes : n.minutes;
  if (purpose === "teach" && minutes) parts.push(`TIME: about ${Math.round(minutes)} min`);
  return parts.join("\n\n").slice(0, 4000);
}

/** Converts written slides into the renderers' slides; pictures become `visuals` entries. */
export function toSlides(
  ai: readonly AiSlide[],
  purpose: Purpose,
  lessonVisuals: readonly LessonVisual[],
  ids: { slide: () => string; visual: () => string },
  visuals: Record<string, VisualRequest>,
): Slide[] {
  const byKey = new Map(lessonVisuals.map((v) => [v.key, v]));
  const pic = (v: AiVisual | undefined): Picture | undefined => {
    if (!v) return undefined;
    let request: VisualRequest | undefined;
    if (v.type === "mermaid") request = { kind: "mermaid", code: v.code };
    else if (v.type === "latex") request = { kind: "latex", latex: v.latex };
    else if (v.type === "lesson") request = byKey.get(v.key)?.request;
    else
      request = {
        kind: "visual",
        spec: {
          type: "plot",
          expression: v.expression,
          xRange: v.xRange,
          xLabel: v.xLabel,
          yLabel: v.yLabel,
          caption: v.caption || v.expression,
        },
      };
    if (!request) return undefined;
    const key = ids.visual();
    visuals[key] = request;
    const caption = v.caption || (v.type === "lesson" ? (byKey.get(v.key)?.caption ?? "") : "");
    return { key, caption: caption.slice(0, 240), alt: (caption || "Diagram").slice(0, 240) };
  };
  return ai.map((s): Slide => {
    const id = ids.slide();
    const notes = notesText(s, purpose);
    switch (s.layout) {
      case "concept": {
        const picture = pic(s.visual);
        return {
          id,
          notes,
          layout: "concept",
          title: s.title,
          analogy: s.analogy,
          points: s.points,
          ...(s.example ? { example: s.example } : {}),
          takeaway: s.takeaway,
          ...(picture ? { picture } : {}),
        };
      }
      case "bullets":
      case "recap":
        return { id, notes, layout: s.layout, title: s.title, points: s.points };
      case "two-column":
        return { id, notes, layout: "two-column", title: s.title, left: s.left, right: s.right };
      case "steps":
        return { id, notes, layout: "steps", title: s.title, steps: s.steps };
      case "comparison":
        return {
          id,
          notes,
          layout: "comparison",
          title: s.title,
          columns: s.columns,
          rows: s.rows,
        };
      case "formula":
        return {
          id,
          notes,
          layout: "formula",
          title: s.title,
          formulas: s.formulas.map((f) =>
            pic({ type: "latex", latex: f.latex, caption: f.caption })!,
          ),
          ...(s.symbols.length ? { symbols: s.symbols } : {}),
        };
      case "example":
        return {
          id,
          notes,
          layout: "example",
          title: s.title,
          problem: s.problem,
          ...(s.code ? { code: s.code } : {}),
          steps: s.steps,
          answer: s.answer,
        };
      case "diagram": {
        const picture = pic(s.visual);
        if (!picture)
          return {
            id,
            notes,
            layout: "bullets",
            title: s.title,
            points: s.points.length ? s.points : [s.visual.caption || s.title],
          };
        return {
          id,
          notes,
          layout: "image",
          title: s.title,
          picture,
          side: s.points.length ? "left" : "full",
          points: s.points,
        };
      }
      case "quiz":
        return {
          id,
          notes,
          layout: "quiz",
          title: s.title,
          question: s.question,
          options: s.options,
          answer: s.answer,
          explanation: s.explanation,
          showAnswer: purpose !== "teach",
        };
      case "activity":
        return {
          id,
          notes,
          layout: "activity",
          title: s.title,
          prompt: s.prompt,
          hints: s.steps,
          minutes: Math.round(Math.min(8, Math.max(3, s.minutes))),
          format: s.format,
          group: s.group,
          ...(s.material ? { material: s.material } : {}),
        };
      case "statement":
        return { id, notes, layout: "statement", label: s.label, text: s.text };
      case "section":
        return { id, notes, layout: "section", title: s.title, kicker: s.kicker };
      case "questions":
        return { id, notes, layout: "questions", title: s.title, items: s.items };
      case "answers":
        return { id, notes, layout: "answers", title: s.title, items: s.items };
      case "summary": {
        const map = s.map ? pic({ type: "mermaid", code: s.map.code, caption: "" }) : undefined;
        return {
          id,
          notes,
          layout: "summary",
          title: s.title,
          points: [],
          groups: s.groups,
          formulas: s.formulas.map((f) => pic({ type: "latex", latex: f.latex, caption: "" })!),
          mnemonic: s.mnemonic,
          ...(map ? { map } : {}),
        };
      }
    }
  });
}

/** The test AI's slides for a batch: valid, deep enough and with distinct activities. */
export function fakeSlides(items: readonly OutlineItem[], from: number): AiSlide[] {
  const say =
    "Explain this idea in your own words, link it to what the class already knows, then walk through the example slowly and check that everyone follows before moving on.";
  const notes = { say, ask: "What would change if the input doubled?", doubts: [], minutes: 3 };
  return items.map((item, i): AiSlide => {
    const n = from + i + 1;
    const tag = `test${n}`;
    if (item.kind === "summary")
      return {
        layout: "summary",
        title: item.title,
        groups: [1, 2, 3].map((g) => ({
          heading: `Group ${g}`,
          points: [`Key idea ${g} of ${item.topic} (${tag}).`],
        })),
        formulas: [],
        mnemonic: "",
        notes: { say: "", ask: "", doubts: [] },
      };
    if (item.kind === "questions")
      return {
        layout: "questions",
        title: item.title,
        items: [{ n, text: `Work out test problem ${n} on ${item.topic}, showing every step.` }],
        notes,
      };
    if (item.kind === "answers")
      return {
        layout: "answers",
        title: item.title,
        items: [{ n, answer: `Answer ${n}.`, why: "Step 1, step 2, result." }],
        notes,
      };
    if (item.kind === "activity")
      return {
        layout: "activity",
        title: item.title,
        format: item.activity ?? ACTIVITY_FORMATS[n % ACTIVITY_FORMATS.length],
        minutes: 5,
        group: "Pairs",
        prompt: `In pairs: here is a plausible solution about ${item.topic} that gives the wrong result for one kind of input (${tag}). Find that input, explain why it fails, and fix it with the smallest change.`,
        material: "",
        steps: [
          "Read the solution alone (1 min).",
          "Find the failing input with your partner.",
          "Agree on the smallest fix.",
        ],
        facilitation: {
          answer: `The solution fails when the input is zero because the base case is never reached; changing the condition to n <= 0 fixes it (${tag}).`,
          hints: ["Try the smallest inputs first.", "Look at the stopping condition."],
          wrongAnswers: [
            {
              answer: "It fails for large inputs.",
              why: "Students confuse slowness with never stopping.",
            },
          ],
          debrief: `Link the failure back to why ${item.topic} needs a reachable stopping condition.`,
        },
        notes: { ...notes, minutes: 5 },
      };
    return {
      layout: "concept",
      title: item.title,
      analogy: "",
      points: [
        `What it is: a clear statement of the idea behind ${item.topic} (${tag}).`,
        `Why it works: the reason the idea holds, in one or two lines (${tag}).`,
        `Where it matters: a place this idea is used in practice (${tag}).`,
      ],
      example: {
        label: "Worked example",
        text: `A small worked example with numbers for ${item.topic} (${tag}).`,
        code: "",
      },
      takeaway: `One line to remember about ${item.topic}.`,
      notes,
    };
  });
}
