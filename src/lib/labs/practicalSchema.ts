import { z } from "zod";
import { SourceSchema } from "@/lib/schema";

/*
 * The practical (lab) lesson contract (syllabus fix, Phase 7B). One lesson per experiment, with the
 * 11 parts of a lab record: aim, theory, apparatus (with a labelled setup diagram), procedure,
 * observation table, calculations, result, precautions and errors, viva, simulation, videos.
 * Videos are not written by the AI: the app finds them (YouTube Data API) and shows them apart.
 */

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids must be lowercase-kebab-case");
const text = z.string().trim().min(1);
const short = (max: number) => z.string().trim().min(1).max(max);

/** A part of the setup, drawn as a labelled box; procedure steps can light it up. */
export const ApparatusPartSchema = z.object({
  id,
  label: short(40),
  /** What it is or does, in a few words. */
  role: short(160).optional(),
});

export const DiagramLinkSchema = z.object({
  from: id,
  to: id,
  /** What joins them, e.g. "wire", "tube", "light ray". */
  label: short(30).optional(),
});

export const ObservationTableSchema = z
  .object({
    /** Column headings with units, e.g. "Distance x (cm)". */
    columns: z.array(short(40)).min(2).max(8),
    /** Rows a student copies into the record (blank cells to fill in the lab). */
    blankRows: z.int().min(3).max(15),
    /** A filled example with realistic values, one cell per column. */
    sampleRows: z
      .array(z.array(short(30)))
      .min(2)
      .max(12),
  })
  .refine((t) => t.sampleRows.every((r) => r.length === t.columns.length), {
    message: "every sample row needs one cell per column",
    path: ["sampleRows"],
  });

/** The simulation the AI picked from the shortlist (null: none fits; the procedure is animated). */
/** A missing caption gets a plain one instead of failing the lesson. */
const simCaption = text.default("Change the values and watch the readings respond.");

export const LabSimulationSchema = z.union([
  z.object({
    type: z.literal("widget"),
    widget: id,
    params: z.record(z.string(), z.unknown()),
    caption: simCaption,
  }),
  z.object({ type: z.literal("phet"), sim: id, caption: simCaption }),
]);

/** What the AI writes. */
export const PracticalBodySchema = z.object({
  aim: text,
  theory: z.object({
    /** Markdown with KaTeX maths. */
    body: text,
    formulas: z.array(z.object({ latex: text, meaning: short(200) })).max(8),
  }),
  apparatus: z.object({
    items: z.array(short(120)).min(1).max(25),
    parts: z.array(ApparatusPartSchema).min(2).max(10),
    links: z.array(DiagramLinkSchema).max(14),
  }),
  procedure: z
    .array(
      z.object({
        text,
        /** Ids of apparatus parts this step uses (highlighted on the diagram). */
        parts: z.array(id).max(4).default([]),
      }),
    )
    .min(3)
    .max(20),
  observations: ObservationTableSchema,
  calculations: z.object({
    steps: z.array(text).min(1).max(12),
    /** A calculation that reproduces the sample result, re-run by the server. */
    check: z
      .object({
        expression: z.string().trim().min(1).max(300),
        answer: z.number(),
        unit: z.string().trim().min(1).max(40).optional(),
      })
      .optional(),
  }),
  result: z.object({
    statement: text,
    /** What students usually get, e.g. "g between 9.6 and 9.9 m/s²". */
    typicalRange: text,
  }),
  precautions: z.array(text).min(2).max(10),
  errors: z.array(text).min(1).max(8),
  viva: z
    .array(z.object({ question: text, answer: text }))
    .min(5)
    .max(8),
  simulation: LabSimulationSchema.nullable(),
});

export const PracticalLessonSchema = PracticalBodySchema.extend({
  meta: z.object({
    kind: z.literal("practical"),
    subject: id,
    chapter: id,
    topic: id,
    title: text,
    number: z.int().optional(),
    createdAt: z.iso.datetime(),
    /** May be empty: then the page says it follows standard lab-manual content. */
    sources: z.array(SourceSchema).max(6),
    /** Theory topics of the related theory course this experiment builds on (links on the page). */
    theoryLinks: z
      .array(z.object({ subject: id, chapter: id, topic: id, name: text }))
      .max(4)
      .optional(),
    /** A free Virtual Labs (vlab.co.in) simulation of this experiment, from our checked list. */
    virtualLab: z.object({ title: text, url: z.url(), lab: text }).optional(),
    generatedBy: z
      .object({ provider: z.string().max(100), model: z.string().max(120), ownKey: z.boolean() })
      .optional(),
  }),
}).superRefine((lesson, ctx) => {
  const parts = new Set(lesson.apparatus.parts.map((p) => p.id));
  if (parts.size !== lesson.apparatus.parts.length)
    ctx.addIssue({
      code: "custom",
      message: "part ids must be unique",
      path: ["apparatus", "parts"],
    });
  lesson.apparatus.links.forEach((l, i) => {
    for (const end of [l.from, l.to])
      if (!parts.has(end))
        ctx.addIssue({
          code: "custom",
          message: `unknown part "${end}"`,
          path: ["apparatus", "links", i],
        });
  });
  lesson.procedure.forEach((s, i) => {
    for (const part of s.parts)
      if (!parts.has(part))
        ctx.addIssue({
          code: "custom",
          message: `unknown part "${part}"`,
          path: ["procedure", i, "parts"],
        });
  });
});

export type PracticalBody = z.infer<typeof PracticalBodySchema>;
export type PracticalLesson = z.infer<typeof PracticalLessonSchema>;
export type LabSimulation = z.infer<typeof LabSimulationSchema>;

/** The shared library and lesson-flag key of an experiment's lesson: one lesson per experiment. */
export const PRACTICAL_LEVEL = "practical";
export const PRACTICAL_DURATION = 1;

export function parsePractical(
  data: unknown,
): { ok: true; lesson: PracticalLesson } | { ok: false; problems: string[] } {
  const result = PracticalLessonSchema.safeParse(data);
  if (result.success) return { ok: true, lesson: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) => {
      const path = issue.path.map(String).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
