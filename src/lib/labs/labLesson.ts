import { z } from "zod";
import { archetypeById, type Archetype } from "@/lib/labs/archetypes";
import { circuitProblems } from "@/lib/labs/circuit/validate";
import { drawingProblems } from "@/lib/labs/drawing";
import { PracticalLessonSchema } from "@/lib/labs/practicalSchema";
import { APP_KINDS, SECTION_KINDS, type SectionValue } from "@/lib/labs/sections";

/*
 * Lab lessons v2 (syllabus fix, Phase 7C): an archetype id plus one value per section of that
 * archetype, checked by the section kinds. Phase 7B lessons (one fixed format) still open until
 * they are marked stale; `LabLessonAny` covers both.
 */

const LabMetaSchema = PracticalLessonSchema.shape.meta.extend({
  archetype: z.string(),
});

const LabLessonShape = z.object({
  version: z.literal(2),
  archetype: z.string(),
  sections: z.record(z.string(), z.unknown()),
  meta: LabMetaSchema,
});

export type LabLesson = z.infer<typeof LabLessonShape>;
export type LabLessonAny = LabLesson | z.infer<typeof PracticalLessonSchema>;

export const isLabV2 = (l: LabLessonAny): l is LabLesson => "version" in l && l.version === 2;

/** The schema of the AI's sections object for one archetype. */
export function sectionsSchema(archetype: Archetype) {
  const shape: Record<string, z.ZodType> = {};
  for (const s of archetype.sections) {
    if (APP_KINDS.has(s.kind)) continue;
    const base = SECTION_KINDS[s.kind].schema;
    shape[s.id] = s.optional || s.kind === "simulation" ? base.nullable().optional() : base;
  }
  return z.object(shape);
}

/** Checks that join sections: steps name real parts, a trace follows a real example. */
export function crossProblems(archetype: Archetype, sections: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const s of archetype.sections) {
    const v = sections[s.id];
    if (v === null || v === undefined) continue;
    if (s.kind === "steps" && s.diagram) {
      const target = archetype.sections.find((t) => t.id === s.diagram)!;
      const d = sections[target.id];
      const ids = new Set(
        target.kind === "setup"
          ? ((d as SectionValue<"setup"> | undefined)?.parts.map((p) => p.id) ?? [])
          : [],
      );
      if (target.kind === "circuit")
        for (const c of (d as SectionValue<"circuit"> | undefined)?.components ?? [])
          ids.add(c.id.toLowerCase());
      (v as SectionValue<"steps">).forEach((step, i) => {
        for (const p of step.parts)
          if (!ids.has(target.kind === "circuit" ? p.toLowerCase() : p))
            problems.push(`${s.id}.${i}.parts: "${p}" is not a part in ${target.id}`);
      });
    }
    if (s.kind === "setup") {
      const setup = v as SectionValue<"setup">;
      const ids = new Set(setup.parts.map((p) => p.id));
      if (ids.size !== setup.parts.length) problems.push(`${s.id}.parts: part ids must be unique`);
      setup.links.forEach((l, i) => {
        for (const end of [l.from, l.to])
          if (!ids.has(end)) problems.push(`${s.id}.links.${i}: unknown part "${end}"`);
      });
    }
    if (s.kind === "circuit") {
      const c = v as SectionValue<"circuit">;
      if (!c.fallback) for (const p of circuitProblems(c)) problems.push(`${s.id}: ${p}`);
    }
    if (s.kind === "drawing")
      for (const p of drawingProblems(v as SectionValue<"drawing">)) problems.push(`${s.id}.${p}`);
    if (s.kind === "trace") {
      const t = v as SectionValue<"trace">;
      const codeSection = archetype.sections.find((x) => x.kind === "code");
      const examples = codeSection
        ? (sections[codeSection.id] as SectionValue<"code"> | undefined)
        : undefined;
      const ex = examples?.[t.example];
      if (!ex) problems.push(`${s.id}.example: there is no code example ${t.example}`);
      else {
        const lines = ex.code.split("\n").length;
        t.steps.forEach((st, i) => {
          if (st.line > lines)
            problems.push(`${s.id}.steps.${i}.line: example ${t.example} has only ${lines} lines`);
        });
      }
    }
    if (s.kind === "code") {
      (v as SectionValue<"code">).forEach((ex, i) => {
        const lines = ex.code.split("\n").length;
        ex.explanation.forEach((e, j) => {
          const last = Number(e.lines.split("-").at(-1));
          if (last > lines)
            problems.push(`${s.id}.${i}.explanation.${j}: the code has only ${lines} lines`);
        });
      });
      if (archetype.id === "programming" && (v as unknown[]).length < 2)
        problems.push(`${s.id}: give 2 to 4 examples, simple to harder`);
    }
  }
  return problems;
}

export function parseLab(
  data: unknown,
): { ok: true; lesson: LabLesson } | { ok: false; problems: string[] } {
  const shell = LabLessonShape.safeParse(data);
  if (!shell.success) return { ok: false, problems: issues(shell.error) };
  const archetype = archetypeById(shell.data.archetype);
  if (!archetype) return { ok: false, problems: [`unknown archetype "${shell.data.archetype}"`] };
  const sections = sectionsSchema(archetype).safeParse(shell.data.sections);
  if (!sections.success) return { ok: false, problems: issues(sections.error) };
  const cross = crossProblems(archetype, sections.data);
  if (cross.length) return { ok: false, problems: cross };
  return { ok: true, lesson: { ...shell.data, sections: sections.data } };
}

function issues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(String).join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
