import { z } from "zod";
import config from "@/data/labs/archetypes.json";
import { hits as has, normal } from "@/lib/labs/text";
import { SECTION_KINDS, type SectionKind } from "@/lib/labs/sections";

/*
 * Lab archetypes (syllabus fix, Phase 7C): which lesson format each lab and experiment gets.
 * The formats and the keyword rules live in src/data/labs/archetypes.json (edit them there).
 */

const kinds = Object.keys(SECTION_KINDS) as [SectionKind, ...SectionKind[]];

export const SectionSpecSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  kind: z.enum(kinds),
  title: z.string().min(1),
  optional: z.boolean().optional(),
  /** Steps: the setup or circuit section whose parts they highlight. */
  diagram: z.string().optional(),
  /** Lists: "warning" draws them as a highlighted safety box. */
  tone: z.enum(["warning"]).optional(),
  /** Steps: play them as an animated step-through. Drawings: show finished, not animated. */
  animated: z.boolean().optional(),
  still: z.boolean().optional(),
  /** Result: the label for the range line. */
  rangeLabel: z.string().optional(),
});
export type SectionSpec = z.infer<typeof SectionSpecSchema>;

const ArchetypeSchema = z.object({
  id: z.string(),
  letter: z.string(),
  name: z.string(),
  sections: z.array(SectionSpecSchema).min(2),
  courseKeywords: z.array(z.string()).default([]),
  switch: z.object({ to: z.string(), keywords: z.array(z.string()) }).optional(),
});
export type Archetype = z.infer<typeof ArchetypeSchema>;

export const ArchetypeConfigSchema = z
  .object({
    version: z.literal(1),
    archetypes: z.array(ArchetypeSchema).min(1),
    generic: ArchetypeSchema,
    genericKeywords: z.array(z.string()).default([]),
    branchDefaults: z.record(z.string(), z.string()),
    overrides: z.object({
      courses: z.record(z.string(), z.string()),
      experiments: z.record(z.string(), z.string()),
    }),
  })
  .superRefine((c, ctx) => {
    const ids = new Set([...c.archetypes.map((a) => a.id), c.generic.id]);
    const known = (id: string, path: (string | number)[]) => {
      if (!ids.has(id))
        ctx.addIssue({ code: "custom", message: `unknown archetype "${id}"`, path });
    };
    for (const a of [...c.archetypes, c.generic]) {
      const sectionIds = new Set<string>();
      for (const s of a.sections) {
        if (sectionIds.has(s.id))
          ctx.addIssue({
            code: "custom",
            message: `${a.id}: section "${s.id}" twice`,
            path: [a.id],
          });
        sectionIds.add(s.id);
      }
      for (const s of a.sections) {
        if (!s.diagram) continue;
        const target = a.sections.find((t) => t.id === s.diagram);
        if (!target || (target.kind !== "setup" && target.kind !== "circuit"))
          ctx.addIssue({
            code: "custom",
            message: `${a.id}.${s.id}: diagram "${s.diagram}" is not a setup or circuit section`,
            path: [a.id],
          });
      }
      if (a.switch) known(a.switch.to, [a.id, "switch"]);
    }
    for (const [b, id] of Object.entries(c.branchDefaults)) known(id, ["branchDefaults", b]);
    for (const [k, id] of Object.entries(c.overrides.courses)) known(id, ["overrides", k]);
    for (const [k, id] of Object.entries(c.overrides.experiments)) known(id, ["overrides", k]);
  });

export const ARCHETYPES = ArchetypeConfigSchema.parse(config);

const all = [...ARCHETYPES.archetypes, ARCHETYPES.generic];

export function archetypeById(id: string): Archetype | undefined {
  return all.find((a) => a.id === id);
}

export type Classified = {
  archetype: Archetype;
  /** How it was decided; anything but "name" or "override" is worth a human look. */
  how: "override" | "name" | "experiments" | "branch" | "generic";
};

type LabLike = {
  id: string;
  name: string;
  branches?: readonly string[];
  chapters: readonly { topics: readonly { id: string; name: string; aim?: string }[] }[];
};

export function classifyCourse(lab: LabLike): Classified {
  const override = ARCHETYPES.overrides.courses[lab.id];
  if (override) return { archetype: archetypeById(override)!, how: "override" };
  const name = normal(lab.name);
  const byName = ARCHETYPES.archetypes.find((a) => a.courseKeywords.some((k) => has(name, k)));
  if (byName) return { archetype: byName, how: "name" };
  if (ARCHETYPES.genericKeywords.some((k) => has(name, k)))
    return { archetype: ARCHETYPES.generic, how: "generic" };
  // The experiments' own words: the archetype whose keywords they use most.
  const words = normal(lab.chapters.flatMap((c) => c.topics.map((t) => t.name)).join(" "));
  let best: { a: Archetype; score: number } | null = null;
  for (const a of ARCHETYPES.archetypes) {
    const score = a.courseKeywords.filter((k) => has(words, k)).length;
    if (score > (best?.score ?? 0)) best = { a, score };
  }
  if (best && best.score >= 2) return { archetype: best.a, how: "experiments" };
  const branch = lab.branches?.map((b) => ARCHETYPES.branchDefaults[b]).find(Boolean);
  if (branch) return { archetype: archetypeById(branch)!, how: "branch" };
  return { archetype: ARCHETYPES.generic, how: "generic" };
}

/** The archetype of one experiment: the lab's, unless an override or a "switch" rule moves it. */
export function classifyExperiment(
  lab: LabLike,
  experiment: { id: string; name: string; aim?: string },
): Classified & { switched?: boolean } {
  const override = ARCHETYPES.overrides.experiments[`${lab.id}/${experiment.id}`];
  if (override) return { archetype: archetypeById(override)!, how: "override" };
  const course = classifyCourse(lab);
  const sw = course.archetype.switch;
  if (sw && course.how !== "override") {
    const words = normal(`${experiment.name} ${experiment.aim ?? ""}`);
    if (sw.keywords.some((k) => has(words, k)))
      return { archetype: archetypeById(sw.to)!, how: course.how, switched: true };
  }
  return course;
}
