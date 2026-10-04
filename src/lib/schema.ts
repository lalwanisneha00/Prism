import { TIERS } from "@/lib/tiers";
import { z } from "zod";
import { levels, type LevelSlug } from "@/data/levels";
import {
  ChartSpecSchema,
  CompareSpecSchema,
  FormulaSpecSchema,
  GraphSpecSchema,
  StatsSpecSchema,
  StepsSpecSchema,
} from "@/visuals/generic/specs";

/*
 * The lesson contract (SPEC §5). Every lesson, hand-written or AI-generated,
 * must pass LessonSchema before the app renders it.
 */

const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids must be lowercase-kebab-case");
const text = z.string().trim().min(1);
const levelSlugs = levels.map((l) => l.slug) as [LevelSlug, ...LevelSlug[]];

export const SourceSchema = z.object({
  id,
  title: text,
  /** Missing only for the student's own notes, which live on their device. */
  url: z.url().optional(),
  publisher: text,
  kind: z.enum(["encyclopedia", "textbook", "paper", "video", "simulation", "notes"]),
  /** Licence shown next to the citation, e.g. "CC BY 4.0". */
  license: text.optional(),
});

export const LinkSchema = z.object({
  title: text,
  url: z.url(),
  publisher: text,
  note: text.optional(),
});

/*
 * Visuals: the AI only ever picks and configures one of these (SPEC §4).
 * Widget params are checked against the widget registry in Step 8.
 */
const caption = text;
export const VisualSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("widget"),
    widget: id,
    params: z.record(z.string(), z.unknown()),
    caption,
  }),
  z.object({ type: z.literal("phet"), sim: id, caption }),
  z.object({ type: z.literal("mermaid"), code: text, caption }),
  z.object({
    type: z.literal("plot"),
    /** A function of x, e.g. "1/x^2". Drawn by the plotting library, never by the AI. */
    expression: text,
    xRange: z.tuple([z.number(), z.number()]),
    xLabel: text,
    yLabel: text,
    caption,
  }),
  z.object({
    type: z.literal("derivation"),
    /** A step-by-step derivation the student reveals one line at a time. */
    steps: z
      .array(
        z.object({
          /** LaTeX for one line, without the surrounding $ signs. */
          math: text,
          /** Why this step follows, in plain words (markdown allowed). */
          why: text,
        }),
      )
      .min(2)
      .max(12),
    caption,
  }),
  // Generic visuals (SPEC §4.1): usable in any subject.
  ChartSpecSchema,
  GraphSpecSchema,
  FormulaSpecSchema,
  CompareSpecSchema,
  StepsSpecSchema,
  StatsSpecSchema,
  z.object({
    type: z.literal("image"),
    /** A Wikimedia Commons file name, e.g. "File:Gauss law.svg". */
    file: z.string().startsWith("File:"),
    alt: text,
    caption,
  }),
]);

export const SectionSchema = z.object({
  id,
  title: text,
  /** Markdown with KaTeX maths: $inline$ and $$display$$. */
  body: text,
  visual: VisualSpecSchema.optional(),
  /** Every teaching section must be backed by at least one source. */
  sourceIds: z.array(id).min(1, "every section needs at least one source"),
  /** Set by the fact-check pass (never by the writer): drives the Sourced ✓ / Verify ⚠ badge. */
  check: z.object({ status: z.enum(["sourced", "verify"]), note: text.optional() }).optional(),
});

export const QuizQuestionSchema = z
  .object({
    question: text,
    /** Present for multiple choice; absent for short-answer questions. */
    // A repeated option is dropped (it would show the same choice twice).
    options: z
      .array(text)
      .min(2)
      .max(6)
      .transform((o) => [...new Set(o)])
      .optional(),
    answer: text,
    explanation: text,
    difficulty: z.enum(["easy", "medium", "hard"]),
  })
  .refine((q) => !q.options || q.options.length >= 2, {
    message: "a multiple-choice question needs at least 2 different options",
    path: ["options"],
  })
  .refine((q) => !q.options || q.options.includes(q.answer), {
    message: "the answer must be one of the options",
    path: ["answer"],
  });

export const AudioChunkSchema = z.object({
  id,
  title: text,
  /** Plain spoken text: no markdown or LaTeX, since it is read aloud. */
  text,
  /** The section this narration belongs to, for watch-along mode. */
  sectionId: id.optional(),
});

export const LessonSchema = z
  .object({
    meta: z.object({
      subject: id,
      chapter: id,
      topic: id,
      title: text,
      level: z.enum(levelSlugs),
      durationMin: z.int().positive(),
      createdAt: z.iso.datetime(),
      sources: z.array(SourceSchema).min(1),
      /** How far this lesson can be trusted (SPEC §6.1); set by the app, never by the AI. */
      tier: z.enum(TIERS).optional(),
      /** True when the lesson was grounded in the student's uploaded notes. */
      fromNotes: z.boolean().optional(),
      /** Which AI wrote it (the student's own key or Prism's shared one); set by the app. */
      generatedBy: z
        .object({ provider: z.string().max(100), model: z.string().max(120), ownKey: z.boolean() })
        .optional(),
    }),
    hook: text,
    prerequisites: z.array(z.object({ concept: text, oneLiner: text })),
    sections: z.array(SectionSchema).min(1),
    analogies: z.array(z.object({ concept: text, analogy: text, whereItBreaks: text })),
    workedExamples: z.array(
      z.object({
        problem: text,
        steps: z.array(text).min(1),
        answer: text,
        /** A calculation that reproduces a numeric answer, re-run by the server (SPEC §6.1 rule 7). */
        check: z
          .object({
            expression: z.string().trim().min(1).max(300),
            answer: z.number(),
            /** The SI unit the answer must state (checked in code, SPEC §12.3 rule 7). */
            unit: z.string().trim().min(1).max(40).optional(),
          })
          .optional(),
      }),
    ),
    misconceptions: z.array(z.object({ wrong: text, right: text, why: text })),
    quiz: z.array(QuizQuestionSchema).min(1),
    revisionSheet: z.object({
      /** LaTeX, without the surrounding $ signs. */
      formulas: z.array(text),
      keyPoints: z.array(text).min(1),
      mnemonics: z.array(text).optional(),
    }),
    /** Key terms shown as hover cards where they appear (V2 · Step 7; older lessons have none). */
    glossary: z
      .array(z.object({ term: text.max(60), definition: text.max(300) }))
      .max(15)
      .optional(),
    audioScript: z.array(AudioChunkSchema).min(1),
    furtherLearning: z.object({
      videos: z.array(LinkSchema),
      papers: z.array(LinkSchema),
      readings: z.array(LinkSchema),
    }),
  })
  .superRefine((lesson, ctx) => {
    const sourceIds = new Set(lesson.meta.sources.map((s) => s.id));
    const sectionIds = new Set(lesson.sections.map((s) => s.id));

    if (sourceIds.size !== lesson.meta.sources.length) {
      ctx.addIssue({
        code: "custom",
        message: "source ids must be unique",
        path: ["meta", "sources"],
      });
    }
    if (sectionIds.size !== lesson.sections.length) {
      ctx.addIssue({ code: "custom", message: "section ids must be unique", path: ["sections"] });
    }
    lesson.sections.forEach((section, i) => {
      for (const sid of section.sourceIds) {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: "custom",
            message: `unknown source "${sid}"`,
            path: ["sections", i, "sourceIds"],
          });
        }
      }
    });
    lesson.audioScript.forEach((chunk, i) => {
      if (chunk.sectionId && !sectionIds.has(chunk.sectionId)) {
        ctx.addIssue({
          code: "custom",
          message: `unknown section "${chunk.sectionId}"`,
          path: ["audioScript", i, "sectionId"],
        });
      }
    });
  });

export type Source = z.infer<typeof SourceSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type VisualSpec = z.infer<typeof VisualSpecSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type AudioChunk = z.infer<typeof AudioChunkSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export type ParseLessonResult = { ok: true; lesson: Lesson } | { ok: false; problems: string[] };

/**
 * Checks unknown data (a JSON file, or an AI reply in Step 6) against the schema.
 * Problems are short "path: message" lines, so they can be fed back to the AI for a retry.
 */
export function parseLesson(data: unknown): ParseLessonResult {
  const result = LessonSchema.safeParse(data);
  if (result.success) return { ok: true, lesson: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) => {
      const path = issue.path.map(String).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
