import { answerCheckProblems } from "@/lib/checks/answerCheck";
import { katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { stripCitationTags, type GenerateFn } from "@/lib/generateLesson";
import { parseJsonReply } from "@/lib/jsonReply";
import { LlmError } from "@/lib/llm/types";
import type { GroundingSource } from "@/lib/prompts/lessonPrompt";
import type { Archetype } from "@/lib/labs/archetypes";
import { crossProblems, sectionsSchema, type LabLesson } from "@/lib/labs/labLesson";
import { buildLabPrompt } from "@/lib/labs/labPrompt";
import { buildPracticalRepairPrompt, type PracticalRequest } from "@/lib/labs/practicalPrompt";
import type { LabSimulation } from "@/lib/labs/practicalSchema";
import { markdownOf, type SectionValue } from "@/lib/labs/sections";
import { inShortlist, type LabTemplate } from "@/lib/labs/templates";
import { chartProblem } from "@/visuals/generic/checks";
import { visualProblem } from "@/visuals/visualChecks";

/*
 * Writes a lab lesson v2 with the AI (syllabus fix, Phase 7C) and returns it only once it passes
 * the archetype's schema and the app's own checks: formulas typeset, the calculation recomputes,
 * the circuit is electrically sound, the drawing stays on its sheet, the simulation is shortlisted.
 * Replies with problems go back to the AI with the list. A circuit that fails twice becomes a
 * labelled diagram (logged); from the second try a bad simulation, graph or calculation check is
 * dropped rather than asking again.
 */

export type LabStage = "writing" | "fixing";

export type GenerateLabOptions = {
  generate: GenerateFn;
  archetype: Archetype;
  sources: GroundingSource[];
  shortlist: readonly LabTemplate[];
  meta: Omit<LabLesson["meta"], "createdAt" | "sources" | "kind" | "archetype">;
  fixedSimulation?: LabSimulation | null;
  knownProblems?: string;
  onStage?: (stage: LabStage, attempt: number) => void;
  /** What went back to the AI after a try (for the server log). */
  onProblems?: (problems: string[], attempt: number) => void;
  signal?: AbortSignal;
  maxAttempts?: number;
  now?: () => Date;
};

export type GeneratedLab = {
  lesson: LabLesson;
  /** The circuit could not be made sound and is shown as a labelled diagram. */
  circuitFallback: boolean;
};

/** Problems with a lesson whose sections already passed the schema. */
export function labProblems(
  archetype: Archetype,
  sections: Record<string, unknown>,
  shortlist: readonly LabTemplate[],
  fixed?: LabSimulation | null,
): string[] {
  const problems = [...crossProblems(archetype, sections)];
  for (const s of archetype.sections) {
    const v = sections[s.id];
    if (v === null || v === undefined) continue;
    for (const [path, text] of markdownOf(s.kind, v, s.id))
      for (const e of mathErrorsInMarkdown(text)) problems.push(`${path}: ${e}`);
    if (s.kind === "theory")
      (v as SectionValue<"theory">).formulas.forEach((f, i) => {
        const e = katexError(f.latex, true);
        if (e) problems.push(`${s.id}.formulas.${i}.latex: ${e}`);
      });
    if (s.kind === "calculations") {
      const calc = v as SectionValue<"calculations">;
      const result = archetype.sections.find((r) => r.kind === "result");
      const statement = result
        ? ((sections[result.id] as SectionValue<"result"> | undefined)?.statement ?? "")
        : "";
      if (calc.check)
        for (const p of answerCheckProblems(calc.check, `${calc.steps.at(-1) ?? ""} ${statement}`))
          problems.push(`${s.id}.check: ${p}`);
    }
    if (s.kind === "graph") {
      const g = v as SectionValue<"graph">;
      const p = chartProblem({
        type: "chart",
        chart: "scatter",
        xLabel: g.xLabel,
        yLabel: g.yLabel,
        scatter: [{ name: g.title, points: g.points }],
        data: "illustrative",
        caption: g.title,
      });
      if (p) problems.push(`${s.id}: ${p}`);
    }
    if (s.kind === "simulation" && fixed === undefined) {
      const sim = v as LabSimulation;
      if (!inShortlist(shortlist, sim))
        problems.push(
          `${s.id}: "${sim.type === "widget" ? sim.widget : sim.sim}" is not one of the listed templates; pick one of them or write null`,
        );
      else {
        const p = visualProblem(sim);
        if (p) problems.push(`${s.id}: ${p}`);
      }
    }
  }
  return problems;
}

const sectionOf = (p: string) => p.split(/[.:]/)[0];

export async function generateLab(
  request: PracticalRequest,
  options: GenerateLabOptions,
): Promise<GeneratedLab> {
  const {
    generate,
    archetype,
    sources,
    shortlist,
    fixedSimulation,
    knownProblems,
    onStage,
    onProblems,
    signal,
    maxAttempts = 3,
    now = () => new Date(),
  } = options;
  const { system, prompt } = buildLabPrompt(request, archetype, sources, shortlist, {
    fixedSimulation,
    knownProblems,
  });
  const meta: LabLesson["meta"] = {
    ...options.meta,
    kind: "practical",
    archetype: archetype.id,
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
  const kindOf = new Map(archetype.sections.map((s) => [s.id, s.kind]));
  const simId = archetype.sections.find((s) => s.kind === "simulation")?.id;
  let circuitFailures = 0;
  let current = prompt;
  let last: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onStage?.(attempt === 1 ? "writing" : "fixing", attempt);
    const reply = await generate({ system, prompt: current, signal });
    let raw: unknown;
    try {
      raw = stripCitationTags(parseJsonReply(reply));
    } catch (err) {
      last = [`the reply was not valid JSON (${(err as Error).message})`];
      onProblems?.(last, attempt);
      current = buildPracticalRepairPrompt(prompt, reply, last);
      continue;
    }
    const body =
      raw && typeof raw === "object" && "sections" in raw
        ? (raw as { sections: unknown }).sections
        : raw;
    const withSim =
      body && typeof body === "object" && simId && fixedSimulation !== undefined
        ? { ...body, [simId]: fixedSimulation }
        : body;
    let parsed = sectionsSchema(archetype).safeParse(withSim);
    // From the second try, a simulation or graph that still doesn't fit its shape is left out.
    if (!parsed.success && attempt >= 2 && withSim && typeof withSim === "object") {
      const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
      if ([...bad].every((id) => DROPPABLE.has(kindOf.get(id) ?? ""))) {
        const trimmed: Record<string, unknown> = { ...withSim };
        for (const id of bad) trimmed[id] = null;
        parsed = sectionsSchema(archetype).safeParse(trimmed);
      }
    }
    if (!parsed.success) {
      last = parsed.error.issues.map((i) => `${i.path.map(String).join(".")}: ${i.message}`);
      onProblems?.(last, attempt);
      current = buildPracticalRepairPrompt(prompt, reply, last);
      continue;
    }
    const sections: Record<string, unknown> = { ...parsed.data };
    let problems = labProblems(archetype, sections, shortlist, fixedSimulation);

    // A circuit that is still wrong on its second try becomes a labelled diagram.
    const circuitIds = problems.map(sectionOf).filter((id) => kindOf.get(id) === "circuit");
    let circuitFallback = false;
    if (circuitIds.length) circuitFailures++;
    if (circuitIds.length && circuitFailures >= 2) {
      for (const id of new Set(circuitIds)) {
        sections[id] = { ...(sections[id] as SectionValue<"circuit">), fallback: true };
      }
      circuitFallback = true;
      problems = labProblems(archetype, sections, shortlist, fixedSimulation);
    }

    const done = (s: Record<string, unknown>): GeneratedLab => ({
      lesson: { version: 2, archetype: archetype.id, sections: s, meta },
      circuitFallback,
    });
    if (problems.length === 0) return done(sections);
    // From the second try, a lesson whose only problems can be dropped is kept without them
    // (a third AI call costs about a minute and the student's quota).
    if (attempt >= 2) {
      const rescued = rescue(sections, problems, kindOf);
      if (rescued) return done(rescued);
    }
    last = problems;
    onProblems?.(last, attempt);
    current = buildPracticalRepairPrompt(prompt, reply, last);
  }
  throw new LlmError(
    "bad-response",
    `The AI's lab lesson did not pass our checks after ${maxAttempts} tries: ${last.slice(0, 3).join("; ")}`,
  );
}

/** Sections a lesson can do without (they are optional or nullable). */
const DROPPABLE = new Set(["simulation", "graph"]);

/**
 * Second try onward: no simulation instead of a broken one, no check instead of a wrong one, no graph
 * instead of a bad one. Formula problems are shown in red rather than failing the lesson (as for
 * theory lessons). Anything else fails.
 */
function rescue(
  sections: Record<string, unknown>,
  problems: string[],
  kindOf: Map<string, string>,
): Record<string, unknown> | null {
  const out = { ...sections };
  for (const p of problems) {
    const id = sectionOf(p);
    const kind = kindOf.get(id);
    if (kind === "simulation" || kind === "graph") out[id] = null;
    else if (kind === "calculations" && p.startsWith(`${id}.check`))
      out[id] = { steps: (sections[id] as SectionValue<"calculations">).steps };
    else if (/(KaTeX|maths|formula|\$)/i.test(p)) continue;
    else return null;
  }
  return out;
}
