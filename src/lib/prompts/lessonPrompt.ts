import type { LessonRequest } from "@/lib/lessonRequest";
import { levelGuides } from "@/lib/prompts/levelGuides";
import type { Source } from "@/lib/schema";
import { effectiveTier } from "@/lib/tiers";

/** A source plus (from Step 7) the text excerpt the AI must ground its facts in. */
export type GroundingSource = Source & { excerpt?: string };

/**
 * Bumped whenever the lesson prompt changes meaningfully: shared-library lessons written
 * with an older version are treated as stale and rewritten (SPEC §6.1 rule 10).
 */
export const PROMPT_VERSION = "2026-10-03.4";

/** Total words across all sections, scaled to the student's time budget. */
export function sectionWordTarget(durationMin: number): string {
  if (durationMin <= 5) return "350-500";
  if (durationMin <= 10) return "700-1000";
  return "1000-1400";
}

const jsonShape = `{
  "visualPlan": [{ "section": "section id", "visual": "the visual kind, or none", "why": "a few words" }],
  "hook": "one sentence: why this topic matters to a student",
  "prerequisites": [{ "concept": "...", "oneLiner": "..." }],
  "sections": [{
    "id": "kebab-case-id (unique)",
    "title": "...",
    "body": "Markdown with KaTeX maths",
    "visual": { ...optional, see VISUALS },
    "sourceIds": ["ids from SOURCES, at least one"]
  }],
  "analogies": [{ "concept": "...", "analogy": "...", "whereItBreaks": "..." }],
  "workedExamples": [{ "problem": "...", "steps": ["...", "..."], "answer": "...", "check": { "expression": "mathjs calculation", "answer": 0 } }],
  "misconceptions": [{ "wrong": "...", "right": "...", "why": "..." }],
  "quiz": [{
    "question": "...",
    "options": ["2 to 6 options, omit this key for a short-answer question"],
    "answer": "must be EXACTLY one of the options when options exist",
    "explanation": "...",
    "difficulty": "easy | medium | hard"
  }],
  "revisionSheet": { "formulas": ["LaTeX without $ signs"], "keyPoints": ["..."], "mnemonics": ["optional"] },
  "glossary": [{ "term": "a key term written EXACTLY as it appears in the sections", "definition": "one plain sentence a beginner understands" }],
  "audioScript": [{ "id": "kebab-case-id", "title": "...", "text": "plain spoken English", "sectionId": "optional section id" }],
  "furtherLearning": { "videos": [], "papers": [], "readings": [] }
}`;

export const defaultVisualRules = `VISUALS (optional, at most one per section, only where it truly helps):
- {"type":"plot","expression":"<function of x using + - * / ^ and sin cos tan exp ln sqrt abs pi>","xRange":[min,max],"xLabel":"...","yLabel":"...","caption":"..."} for how one quantity depends on another.
- {"type":"mermaid","code":"flowchart TD ...","caption":"..."} for processes or concept maps ONLY. Keep node labels short, plain words, no quotes or brackets inside labels.
Never output SVG, HTML or image URLs.`;

export function buildLessonPrompt(
  request: LessonRequest,
  sources: GroundingSource[],
  visualRules: string = defaultVisualRules,
) {
  const guide = levelGuides[request.level.slug];

  const system = `You are ${guide.persona}. You write structured study lessons for college students as JSON.

TEACHING APPROACH for the "${request.level.name}" level:
${guide.approach.map((a) => `- ${a}`).join("\n")}

ACCURACY RULES:
- State only facts supported by the SOURCES below or by standard first-year university ${request.subject.field.toLowerCase()} textbooks.
- CORE CONTENT, at every level: the lesson must state what a textbook section on this topic always states: the precise definition, the main formula(s) with every symbol explained and the SI unit, standard special cases and results (e.g. the formula for a point charge, a straight wire or a parallel-plate arrangement where relevant), characteristic numbers (such as constants or the 63% of a time constant), and key properties (scalar or vector, what is conserved, what is zero). A beginner level changes HOW you explain, never WHETHER these appear; put each one in the sections or the revision sheet.
- No source, no claim: if the SOURCES don't cover something a section needs, say plainly "This could not be verified from the provided sources." instead of filling the gap. Standard textbook definitions and formulas are fine; specific facts, figures, dates and history must come from the sources.
- Cite with "sourceIds" using ONLY the ids listed in SOURCES. Never invent sources, URLs or references. Never write source ids or citation tags inside the text itself; the app shows citations from "sourceIds".
- Every number in a worked example must be calculated correctly. Show the substitution step.
- ANSWER CHECKS: for every worked example whose final answer is a number, add "check": {"expression": "<one mathjs expression that computes the answer from the problem's data>", "answer": <that number>}. The app re-computes it, so it must be exact. Allowed: + - * / ^, sqrt, exp, log (natural), log10, sin cos tan (radians), pi, e, abs, det([[a,b],[c,d]]), inv, max(eigs(M).values), sum, nintegrate("f(x)", "x", a, b), nderivative("f(x)", "x", x0). Write numbers plainly (5e-9). Omit "check" for proofs and symbolic answers.
- Use SI units and correct significant figures.

FORMAT RULES:
- Reply with ONE JSON object only. No markdown code fences, no text before or after it.
- Maths uses KaTeX: inline $...$; display maths on its own line as $$...$$.
- Inside JSON strings every backslash must be doubled: write \\\\frac{a}{b}, \\\\varepsilon_0, \\\\text{N/C}.
- "audioScript" text is read aloud: plain words only, no symbols, no LaTeX, no markdown. Say "epsilon nought", "E equals k q over r squared".
- "audioScript" is an outline of 3-6 short chapters (2-4 sentences each) in a ${guide.audioStyle} style; it is expanded into full narration later.
- Leave all "furtherLearning" arrays empty; curated links are added by the app.

${visualRules}

JSON SHAPE:
${jsonShape}`;

  const sourceList = sources
    .map((s) => {
      const head = `- id: ${s.id} | ${s.title} (${s.publisher})`;
      return s.excerpt ? `${head}\n  EXCERPT: ${s.excerpt}` : head;
    })
    .join("\n");

  // Too little source text: a shorter, careful lesson (SPEC §6.1, "limited" tier).
  const limited = effectiveTier(request.subject.tier, sources) === "limited";
  const limitedRule = limited
    ? `
LIMITED SOURCES: almost no source text was found for this topic. Write a SHORT lesson (half the usual size), keep to core textbook definitions, and say clearly in the first section which parts could not be verified.
`
    : "";
  // Theory and skill subjects (a student's own subject, V3 · Step 4) are taught differently.
  const styleRule =
    request.subject.teaching === "theory"
      ? `
THEORY SUBJECT: this subject is descriptive.
- Prefer visuals that organise ideas: Mermaid "mindmap", "flowchart LR" or "gantt" (as a timeline), and "compare" tables. Use formulas only if the sources contain them.
- Worked examples become short case studies or model answers (omit "check").${
          request.level.slug === "exam-prep"
            ? `
- ANSWER-WRITING HELP: in "workedExamples" give model answers sized to the marks: a 2-mark answer (2-3 sentences), a 5-mark answer (short, structured) and, if time allows, a 10-mark answer outline (introduction, 4-6 headed points, conclusion). Put the question with its marks in "problem", the points an examiner looks for in "steps", and the model answer in "answer". Add one section on how to structure a long answer on this topic.`
            : ""
        }
`
      : request.subject.teaching === "skill"
        ? `
SKILL SUBJECT: teach by practice, not only explanation.
- In the sections, include practice exercises with answers (grammar or vocabulary items), and where it fits a format with a complete example the student can follow (letter, email, report, notice).
- "workedExamples" are worked practice items; quiz questions are practice items too.
`
        : "";
  const hasNotes = sources.some((s) => s.kind === "notes");
  const notesRule = hasNotes
    ? `
THE STUDENT'S OWN NOTES:
- Sources with ids starting "notes-" are excerpts from the student's college notes. Follow their order, notation and emphasis, and cite them wherever you use them.
- Your notes come first: build each section on them where they cover it, and cite other sources only for what they add.
- If the notes and the other sources disagree, show both and say so plainly, e.g. "Your notes write X; the textbook writes Y." Never silently pick one.
`
    : "";

  const prompt = `Write a lesson.

SUBJECT: ${request.subject.name} (${request.subject.field})
CHAPTER: ${request.chapter.name}
TOPIC: ${request.topic.name}
LEVEL: ${request.level.name} (${request.level.forWho})
TIME BUDGET: ${request.duration} minutes

SIZE:
- sections: ${guide.counts.sections}, totalling about ${sectionWordTarget(request.duration)} words
- analogies: ${guide.counts.analogies}
- workedExamples: ${guide.counts.examples}
- misconceptions: ${guide.counts.misconceptions}
- quiz questions: ${guide.counts.quiz}
- prerequisites: 2-4
- glossary: 4-10 key terms (technical words a student might not know), no formulas as terms

SOURCES (cite only these ids):
${sourceList}
${notesRule}${limitedRule}${styleRule}`;

  return { system, prompt };
}

/** The follow-up prompt when a reply fails validation: show the problems, ask for a full fix. */
export function buildRepairPrompt(
  originalPrompt: string,
  previousReply: string,
  problems: string[],
) {
  return `${originalPrompt}

YOUR PREVIOUS REPLY HAD THESE PROBLEMS:
${problems
  .slice(0, 30)
  .map((p) => `- ${p}`)
  .join("\n")}

PREVIOUS REPLY:
${previousReply.slice(0, 30000)}

Return the complete corrected JSON object, fixing every problem above.`;
}
