import { z } from "zod";
import { findSubject } from "@/lib/subjects";
import { findMathErrors, katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { parseJsonReply } from "@/lib/jsonReply";
import type { GenerateOptions } from "@/lib/llm/types";
import type { GroundingSource } from "@/lib/prompts/lessonPrompt";
import { parseLesson, type Lesson } from "@/lib/schema";
import { findVisualProblems } from "@/visuals/visualChecks";

/*
 * Pass 2 of SPEC §6: an AI fact-checker compares the lesson with the sources, recomputes
 * every worked example, and proposes exact find/replace corrections. The app applies them
 * only if the corrected lesson still passes every check.
 */

export const VerificationSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["supported", "unsupported"]),
      note: z.string().optional(),
    }),
  ),
  corrections: z.array(
    z.object({
      path: z.string(),
      find: z.string().min(1),
      replace: z.string(),
      reason: z.string().optional(),
    }),
  ),
  /** Core textbook facts the lesson never states (SPEC §6.1): added to the revision sheet. */
  missing: z
    .array(
      z.object({
        keyPoint: z.string().trim().min(1).max(300),
        /** Optional display formula, LaTeX without $ signs. */
        formula: z.string().trim().max(200).optional(),
      }),
    )
    .max(8)
    .optional(),
});
export type Verification = z.infer<typeof VerificationSchema>;

export type VerifyResult = {
  lesson: Lesson;
  applied: number;
  /** False when the fact-check itself could not run (quota, outage, unusable reply). */
  checked: boolean;
};

export function buildVerifyPrompt(lesson: Lesson, sources: GroundingSource[]) {
  const field = (findSubject(lesson.meta.subject)?.field ?? "science").toLowerCase();
  const system = `You are a meticulous ${field} fact-checker reviewing a study lesson before students see it.

CHECK every definition, formula, number, unit and claim against the SOURCES and standard first-year university ${field}.
RECOMPUTE every worked-example calculation and quiz answer yourself.

Reply with ONE JSON object only:
{
  "sections": [{ "id": "<section id>", "status": "supported" | "unsupported", "note": "one short reason" }],
  "corrections": [{ "path": "<field path>", "find": "<exact text currently in that field>", "replace": "<corrected text>", "reason": "..." }],
  "missing": [{ "keyPoint": "<a core fact the lesson never states>", "formula": "<optional LaTeX>" }]
}

RULES:
- Give a status for EVERY section. "supported" = its main claims agree with the sources or standard textbooks.
- Only correct real errors (wrong ${field}, wrong numbers, wrong units, quiz answers that are wrong). Do not rewrite style.
- "path" uses dots and zero-based indexes, e.g. "sections.2.body", "workedExamples.0.steps.1", "quiz.3.answer", "revisionSheet.formulas.0".
- "find" must be copied EXACTLY from the current field (it is used for find-and-replace). Keep it short but unique.
- If a quiz answer changes, the new answer must still exactly match one of its options; correct the option text too if needed.
- Inside JSON strings, backslashes must be doubled (\\\\frac).
- If everything is correct, return an empty "corrections" array.
- COMPLETENESS: in "missing", list the core facts a textbook section on this topic always states that this lesson never states anywhere (definition, main formula with SI unit, standard special cases, characteristic numbers, key properties). Each as one short plain key point, with its formula as LaTeX (no $ signs) in "formula" when there is one. Only facts supported by the SOURCES or standard first-year textbooks; never repeat something the lesson already says. Return [] if nothing is missing.`;

  // Only the teaching content is checked; meta, audio outline and links are set by the app.
  const content = {
    hook: lesson.hook,
    prerequisites: lesson.prerequisites,
    sections: lesson.sections,
    analogies: lesson.analogies,
    workedExamples: lesson.workedExamples,
    misconceptions: lesson.misconceptions,
    quiz: lesson.quiz,
    revisionSheet: lesson.revisionSheet,
    glossary: lesson.glossary ?? [],
  };
  const sourceList = sources
    .map((s) => `- ${s.id}: ${s.title}${s.excerpt ? `\n  EXCERPT: ${s.excerpt}` : ""}`)
    .join("\n");

  const prompt = `TOPIC: ${lesson.meta.title}

SOURCES:
${sourceList}

LESSON TO CHECK:
${JSON.stringify(content, null, 1)}`;

  return { system, prompt };
}

/** Reads and writes a string at a dotted path like "sections.2.body". */
function stringAt(
  root: unknown,
  path: string,
): { get: () => unknown; set: (v: string) => void } | null {
  const keys = path.split(".");
  let parent: unknown = root;
  for (const key of keys.slice(0, -1)) {
    if (parent === null || typeof parent !== "object") return null;
    parent = (parent as Record<string, unknown>)[key];
  }
  if (parent === null || typeof parent !== "object") return null;
  const last = keys[keys.length - 1];
  const record = parent as Record<string, unknown>;
  return { get: () => record[last], set: (v) => (record[last] = v) };
}

/** Applies find/replace corrections; returns the new lesson and how many applied. */
export function applyCorrections(lesson: Lesson, corrections: Verification["corrections"]) {
  const draft = structuredClone(lesson);
  let applied = 0;
  for (const c of corrections) {
    if (c.path.startsWith("meta") || c.path.endsWith(".id") || c.path.includes("sourceIds"))
      continue;
    const field = stringAt(draft, c.path);
    const current = field?.get();
    if (typeof current === "string" && current.includes(c.find)) {
      field!.set(current.replace(c.find, c.replace));
      applied++;
      // A corrected worked example no longer matches its computer check: drop the check
      // (and its "answer checked" badge) rather than show a stale one.
      const example = /^workedExamples\.(\d+)\./.exec(c.path);
      if (example) delete draft.workedExamples[Number(example[1])]?.check;
    }
  }
  return { draft, applied };
}

/** Marks each section Sourced ✓ or Verify ⚠ from the fact-checker's verdicts. */
export function markSections(lesson: Lesson, verdicts: Verification["sections"] | null): Lesson {
  return {
    ...lesson,
    sections: lesson.sections.map((section) => {
      if (!verdicts) {
        return {
          ...section,
          check: { status: "verify", note: "Automatic fact-check was unavailable." },
        };
      }
      const verdict = verdicts.find((v) => v.id === section.id);
      if (!verdict)
        return { ...section, check: { status: "verify", note: "Not covered by the fact-check." } };
      return {
        ...section,
        check: {
          status: verdict.status === "supported" ? "sourced" : "verify",
          note: verdict.note,
        },
      };
    }),
  };
}

/** Runs the fact-check pass. Never throws: on failure the lesson is returned marked "Verify ⚠". */
/**
 * Adds core facts the fact-checker found missing to the revision sheet (key points and
 * formulas). Each must typeset; duplicates are skipped. Returns how many were added.
 */
export function addMissingFacts(
  lesson: Lesson,
  missing: NonNullable<Verification["missing"]>,
): number {
  let added = 0;
  const sheet = lesson.revisionSheet;
  for (const m of missing.slice(0, 6)) {
    if (mathErrorsInMarkdown(m.keyPoint).length) continue;
    if (m.formula && katexError(m.formula, true)) continue;
    if (sheet.keyPoints.some((k) => k.toLowerCase() === m.keyPoint.toLowerCase())) continue;
    sheet.keyPoints.push(m.keyPoint);
    if (m.formula && !sheet.formulas.includes(m.formula)) sheet.formulas.push(m.formula);
    added++;
  }
  return added;
}

export async function verifyLesson(
  lesson: Lesson,
  sources: GroundingSource[],
  generate: (options: GenerateOptions) => Promise<string>,
  signal?: AbortSignal,
): Promise<VerifyResult> {
  try {
    const { system, prompt } = buildVerifyPrompt(lesson, sources);
    const reply = await generate({ system, prompt, signal, temperature: 0 });
    const verification = VerificationSchema.parse(parseJsonReply(reply));

    const corrected = applyCorrections(lesson, verification.corrections);
    const { draft } = corrected;
    const applied = corrected.applied + addMissingFacts(draft, verification.missing ?? []);
    // Keep the corrections only if the corrected lesson is still fully valid.
    const reparsed = parseLesson(draft);
    const usable =
      reparsed.ok &&
      findMathErrors(reparsed.lesson).length === 0 &&
      findVisualProblems(reparsed.lesson).length === 0;
    const base = usable ? reparsed.lesson : lesson;
    return {
      lesson: markSections(base, verification.sections),
      applied: usable ? applied : 0,
      checked: true,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return { lesson: markSections(lesson, null), applied: 0, checked: false };
  }
}
