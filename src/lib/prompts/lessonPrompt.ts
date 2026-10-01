import type { LessonRequest } from "@/lib/lessonRequest";
import { levelGuides } from "@/lib/prompts/levelGuides";
import type { Source } from "@/lib/schema";

/** A source plus (from Step 7) the text excerpt the AI must ground its facts in. */
export type GroundingSource = Source & { excerpt?: string };

/** Total words across all sections, scaled to the student's time budget. */
export function sectionWordTarget(durationMin: number): string {
  if (durationMin <= 5) return "350-500";
  if (durationMin <= 10) return "700-1000";
  return "1000-1400";
}

const jsonShape = `{
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
  "workedExamples": [{ "problem": "...", "steps": ["...", "..."], "answer": "..." }],
  "misconceptions": [{ "wrong": "...", "right": "...", "why": "..." }],
  "quiz": [{
    "question": "...",
    "options": ["2 to 6 options, omit this key for a short-answer question"],
    "answer": "must be EXACTLY one of the options when options exist",
    "explanation": "...",
    "difficulty": "easy | medium | hard"
  }],
  "revisionSheet": { "formulas": ["LaTeX without $ signs"], "keyPoints": ["..."], "mnemonics": ["optional"] },
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
- State only facts supported by the SOURCES below or by standard first-year university physics textbooks.
- If you must say something beyond the sources, write "(beyond the provided sources)" after it.
- Cite with "sourceIds" using ONLY the ids listed in SOURCES. Never invent sources, URLs or references.
- Every number in a worked example must be calculated correctly. Show the substitution step.
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

SOURCES (cite only these ids):
${sourceList}`;

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
