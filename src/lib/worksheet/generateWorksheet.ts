import { z } from "zod";
import { mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { parseJsonReply } from "@/lib/jsonReply";
import { LlmError, type GenerateOptions } from "@/lib/llm/types";
import type { Lesson } from "@/lib/schema";
import { findSubject } from "@/lib/subjects";
import { WorksheetSchema, type Worksheet, type WorksheetMode } from "@/lib/worksheet/schema";

type Generate = (options: GenerateOptions) => Promise<string>;

const SHAPE = `{"questions": [{"question": "markdown", "marks": 2, "steps": ["step 1", "step 2"], "answer": "final answer with units", "markingPoints": ["what earns marks"]}]}`;

export function buildWorksheetPrompt(lesson: Lesson, mode: WorksheetMode) {
  const subject = findSubject(lesson.meta.subject)?.name ?? lesson.meta.subject;
  const system = `You are an experienced university examiner in ${subject}. You write exam questions with model answers as JSON.
Rules:
- Reply with ONE JSON object only, shaped like: ${SHAPE}
- Maths uses KaTeX: inline $...$, display $$...$$. Inside JSON strings every backslash must be doubled (\\\\frac, \\\\varepsilon_0).
- Every number must be calculated correctly; show the substitution step. Use SI units and sensible significant figures.
- "steps" is the model answer an examiner would accept, one step per item. "markingPoints" lists what earns marks (e.g. "correct Gaussian surface (1 mark)").
- Use only physics consistent with the lesson content given; standard first-year textbook facts are fine.`;

  const lessonContext = `TOPIC: ${lesson.meta.title} (level ${lesson.meta.level})
KEY POINTS:
${lesson.revisionSheet.keyPoints.map((k) => `- ${k}`).join("\n")}
FORMULAS: ${lesson.revisionSheet.formulas.join(" ; ")}`;

  const prompt =
    mode.mode === "practice"
      ? `${lessonContext}

Write a practice worksheet of exactly ${mode.count} exam questions on this topic, in the style of university end-semester papers.
Mix: about a third short 2-mark questions (definitions, statements), a third 5-mark questions (derivations or one-step numericals), the rest 10-mark questions (multi-part numericals or long derivations). Order them from 2 to 10 marks.`
      : `${lessonContext}

These are the student's past-paper questions (PYQs). Solve EACH one, in the same order, as the questions array (exactly ${mode.questions.length} items). Copy each question text faithfully into "question". Infer the marks from the question if stated, otherwise estimate (2, 5 or 10). If a question is outside this topic, still answer it briefly and say so in the first step.
QUESTIONS:
${mode.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;

  return { system, prompt };
}

/** Problems that make a worksheet unusable: wrong count or maths that won't render. */
export function worksheetProblems(sheet: Worksheet, mode: WorksheetMode): string[] {
  const problems: string[] = [];
  const expected = mode.mode === "practice" ? mode.count : mode.questions.length;
  if (sheet.questions.length !== expected) {
    problems.push(`expected exactly ${expected} questions, got ${sheet.questions.length}`);
  }
  sheet.questions.forEach((q, i) => {
    const texts = [q.question, ...q.steps, q.answer, ...q.markingPoints];
    for (const t of texts) {
      for (const e of mathErrorsInMarkdown(t)) problems.push(`questions[${i}]: ${e}`);
    }
  });
  return problems;
}

/** Writes and validates a worksheet, asking the AI to fix problems (up to 2 repairs). */
export async function generateWorksheet(
  lesson: Lesson,
  mode: WorksheetMode,
  generate: Generate,
  signal?: AbortSignal,
): Promise<Worksheet> {
  const { system, prompt } = buildWorksheetPrompt(lesson, mode);
  let request = prompt;
  let lastProblems: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const reply = await generate({ system, prompt: request, signal, temperature: 0.5 });
    let problems: string[];
    try {
      const sheet = WorksheetSchema.parse(parseJsonReply(reply));
      problems = worksheetProblems(sheet, mode);
      // A count mismatch on the last try is fine as long as the maths renders.
      if (problems.length === 0) return sheet;
      if (attempt === 2 && problems.every((p) => p.startsWith("expected exactly"))) return sheet;
    } catch (err) {
      problems =
        err instanceof z.ZodError
          ? err.issues.slice(0, 8).map((i) => `${i.path.join(".")}: ${i.message}`)
          : ["the reply was not valid JSON"];
    }
    lastProblems = problems;
    request = `${prompt}

YOUR PREVIOUS REPLY HAD THESE PROBLEMS. Write the whole JSON again, fixing them:
${problems
  .slice(0, 10)
  .map((p) => `- ${p}`)
  .join("\n")}`;
  }
  throw new LlmError("bad-response", `worksheet failed checks: ${lastProblems.join("; ")}`);
}
