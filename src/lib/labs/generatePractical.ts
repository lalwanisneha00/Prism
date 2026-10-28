import { answerCheckProblems } from "@/lib/checks/answerCheck";
import { katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { stripCitationTags, type GenerateFn } from "@/lib/generateLesson";
import { parseJsonReply } from "@/lib/jsonReply";
import { LlmError } from "@/lib/llm/types";
import type { GroundingSource } from "@/lib/prompts/lessonPrompt";
import {
  parsePractical,
  type LabSimulation,
  type PracticalLesson,
} from "@/lib/labs/practicalSchema";
import {
  buildPracticalPrompt,
  buildPracticalRepairPrompt,
  type PracticalRequest,
} from "@/lib/labs/practicalPrompt";
import { inShortlist, type LabTemplate } from "@/lib/labs/templates";
import { visualProblem } from "@/visuals/visualChecks";

/*
 * Writes a practical lesson with the AI and returns it only once it passes the schema and the
 * app's own checks (syllabus fix, Phase 7B): formulas typeset, the calculation recomputes, the
 * simulation is one of the shortlisted templates with valid values. Invalid replies go back with
 * the list of problems; on the last try a bad simulation is dropped (the procedure is animated
 * instead) and a failed calculation check is removed, rather than showing nothing.
 */

export type PracticalStage = "writing" | "fixing";

export type GeneratePracticalOptions = {
  generate: GenerateFn;
  sources: GroundingSource[];
  shortlist: readonly LabTemplate[];
  meta: Omit<PracticalLesson["meta"], "createdAt" | "sources" | "kind">;
  /** The simulation saved for this experiment earlier (reused, never picked again). */
  fixedSimulation?: LabSimulation | null;
  knownProblems?: string;
  onStage?: (stage: PracticalStage, attempt: number) => void;
  signal?: AbortSignal;
  maxAttempts?: number;
  now?: () => Date;
};

/** The app's own checks on a lesson that already passed the schema. */
export function practicalProblems(
  lesson: PracticalLesson,
  shortlist: readonly LabTemplate[],
  fixed?: LabSimulation | null,
): string[] {
  const problems: string[] = [];
  const markdown: [string, string][] = [
    ["aim", lesson.aim],
    ["theory.body", lesson.theory.body],
    ...lesson.calculations.steps.map((s, i) => [`calculations.steps.${i}`, s] as [string, string]),
    ["result.statement", lesson.result.statement],
    ...lesson.procedure.map((s, i) => [`procedure.${i}.text`, s.text] as [string, string]),
    ...lesson.viva.map((v, i) => [`viva.${i}.answer`, v.answer] as [string, string]),
  ];
  for (const [path, text] of markdown)
    for (const e of mathErrorsInMarkdown(text)) problems.push(`${path}: ${e}`);
  lesson.theory.formulas.forEach((f, i) => {
    const e = katexError(f.latex, true);
    if (e) problems.push(`theory.formulas.${i}.latex: ${e}`);
  });
  const check = lesson.calculations.check;
  if (check) {
    const written = `${lesson.calculations.steps.at(-1) ?? ""} ${lesson.result.statement}`;
    for (const p of answerCheckProblems(check, written)) problems.push(`calculations.check: ${p}`);
  }
  const sim = lesson.simulation;
  if (sim && fixed === undefined) {
    if (!inShortlist(shortlist, sim))
      problems.push(
        `simulation: "${sim.type === "widget" ? sim.widget : sim.sim}" is not one of the listed templates; pick one of them or write null`,
      );
    else {
      const p = visualProblem(sim);
      if (p) problems.push(`simulation: ${p}`);
    }
  }
  return problems;
}

/** Last-try rescue: no simulation instead of a broken one, no check instead of a wrong one. */
function rescued(lesson: PracticalLesson, problems: string[]): PracticalLesson | null {
  const rest = problems.filter(
    (p) => !p.startsWith("simulation:") && !p.startsWith("calculations.check:"),
  );
  // Formula problems are shown in red rather than failing the lesson (as for theory lessons).
  if (rest.some((p) => !/^(aim|theory|calculations|result|procedure|viva)/.test(p))) return null;
  return {
    ...lesson,
    simulation: problems.some((p) => p.startsWith("simulation:")) ? null : lesson.simulation,
    calculations: problems.some((p) => p.startsWith("calculations.check:"))
      ? { steps: lesson.calculations.steps }
      : lesson.calculations,
  };
}

export async function generatePractical(
  request: PracticalRequest,
  options: GeneratePracticalOptions,
): Promise<PracticalLesson> {
  const {
    generate,
    sources,
    shortlist,
    fixedSimulation,
    knownProblems,
    onStage,
    signal,
    maxAttempts = 3,
    now = () => new Date(),
  } = options;
  const { system, prompt } = buildPracticalPrompt(request, sources, shortlist, {
    fixedSimulation,
    knownProblems,
  });
  const meta: PracticalLesson["meta"] = {
    ...options.meta,
    kind: "practical",
    createdAt: now().toISOString(),
    sources: sources.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      publisher: s.publisher,
      kind: s.kind,
      license: s.license,
    })),
  };
  let current = prompt;
  let last: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStage?.(attempt === 1 ? "writing" : "fixing", attempt);
    const reply = await generate({ system, prompt: current, signal });
    let body: unknown;
    try {
      body = stripCitationTags(parseJsonReply(reply));
    } catch (err) {
      last = [`the reply was not valid JSON (${(err as Error).message})`];
      current = buildPracticalRepairPrompt(prompt, reply, last);
      continue;
    }
    const candidate =
      body && typeof body === "object"
        ? {
            ...body,
            ...(fixedSimulation !== undefined ? { simulation: fixedSimulation } : {}),
            meta,
          }
        : body;
    const parsed = parsePractical(candidate);
    if (!parsed.ok) {
      last = parsed.problems;
      current = buildPracticalRepairPrompt(prompt, reply, last);
      continue;
    }
    const problems = practicalProblems(parsed.lesson, shortlist, fixedSimulation);
    if (problems.length === 0) return parsed.lesson;
    if (attempt === maxAttempts) {
      const lesson = rescued(parsed.lesson, problems);
      if (lesson) return lesson;
    }
    last = problems;
    current = buildPracticalRepairPrompt(prompt, reply, last);
  }
  throw new LlmError(
    "bad-response",
    `The AI's lab lesson did not pass our checks after ${maxAttempts} tries: ${last.slice(0, 3).join("; ")}`,
  );
}
