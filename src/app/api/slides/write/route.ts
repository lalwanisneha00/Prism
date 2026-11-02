import { z } from "zod";
import { katexError } from "@/lib/checks/mathCheck";
import { LlmError } from "@/lib/llm";
import { DeckBriefSchema, OutlineSchema } from "@/lib/slides/ai/outline";
import { askJson, clock, errorReply, invalid, isFake } from "@/lib/slides/ai/server";
import {
  AiSlideSchema,
  coerceSlide,
  fakeSlides,
  isSoft,
  slideProblems,
  slideText,
  WriteReplySchema,
  writePrompt,
  type AiSlide,
} from "@/lib/slides/ai/write";
import { ACTIVITY_FORMATS } from "@/lib/slides/plan";

/*
 * POST a few outline positions → { ok, slides }: step 2 of a deck (deck quality overhaul). The AI
 * writes those slides from the outline and the checked lesson material; code checks each one
 * (depth, teaching notes, activities against the reject list, formulas that typeset) and has
 * failed ones rewritten. With `feedback` it rewrites slides the review flagged.
 */

export const maxDuration = 60;

/** A rewrite only starts with this much time left. */
const REWRITE_NEEDS_MS = 18_000;

const RequestSchema = z.object({
  brief: DeckBriefSchema,
  outline: OutlineSchema,
  /** Outline positions (0-based) to write. */
  indices: z.array(z.int().min(0)).min(1).max(6),
  /** Earlier slides as text, to continue from and not repeat. */
  earlier: z.array(z.string().trim().max(400)).max(80).default([]),
  formatsUsed: z.array(z.enum(ACTIVITY_FORMATS)).max(9).default([]),
  feedback: z
    .array(
      z.object({
        index: z.int().min(0),
        issues: z.array(z.string().trim().max(400)).max(8),
        fix: z.string().trim().max(800).optional(),
        previous: z.string().trim().max(1500).optional(),
      }),
    )
    .max(6)
    .default([]),
});

/** Formulas that KaTeX can't typeset (they would leave a hole in the slide). */
function formulaProblems(s: AiSlide): string[] {
  const latex =
    s.layout === "formula" || s.layout === "summary"
      ? s.formulas.map((f) => f.latex)
      : s.layout === "concept" && s.visual?.type === "latex"
        ? [s.visual.latex]
        : [];
  return latex.flatMap((l) => {
    const e = katexError(l, true);
    return e ? [`the formula "${l.slice(0, 60)}" doesn't typeset: ${e}`] : [];
  });
}

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return invalid();
  const data = body.data;
  if (data.indices.some((i) => i >= data.outline.slides.length)) return invalid();
  const c = clock(req);
  try {
    if (isFake())
      return Response.json({
        ok: true,
        slides: data.indices.map((i) => fakeSlides([data.outline.slides[i]], i)[0]),
      });
    const done = new Map<number, AiSlide>();
    let problems: { index: number; reason: string }[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0 && c.left() < REWRITE_NEEDS_MS) break;
      const todo = data.indices.filter((i) => !done.has(i));
      const { system, prompt } = writePrompt({
        brief: data.brief,
        outline: data.outline,
        indices: todo,
        earlier: [...data.earlier, ...[...done.values()].map((s) => slideText(s).slice(0, 300))],
        formatsUsed: data.formatsUsed,
        feedback: data.feedback.filter((f) => todo.includes(f.index)),
        problems: attempt > 0 ? problems : undefined,
      });
      const raw = await askJson(req, c, { system, prompt, temperature: attempt === 0 ? 0.6 : 0.4 });
      const reply = WriteReplySchema.safeParse(raw);
      const written = reply.success ? reply.data.slides : [];
      problems = [];
      const formats = [
        ...data.formatsUsed,
        ...[...done.values()].flatMap((s) => (s.layout === "activity" ? [s.format] : [])),
      ];
      todo.forEach((index, k) => {
        const parsed = AiSlideSchema.safeParse(coerceSlide(written[k]));
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          problems.push({
            index,
            reason:
              written[k] === undefined
                ? "missing"
                : `${issue?.path.join(".") || "slide"}: ${issue?.message}`,
          });
          return;
        }
        const slide = parsed.data;
        const found = [
          ...slideProblems(slide, data.brief.purpose, { formats, texts: data.earlier }),
          ...formulaProblems(slide),
        ];
        // On the last try, a slide with only soft problems is kept (the review checks it again).
        const lastTry = attempt === 2 || c.left() < REWRITE_NEEDS_MS;
        if (found.length && !(lastTry && found.every(isSoft)))
          problems.push(...found.map((reason) => ({ index, reason })));
        else {
          done.set(index, slide);
          if (slide.layout === "activity") formats.push(slide.format);
        }
      });
      if (done.size === data.indices.length) break;
      console.warn(
        "[api/slides/write] rewriting:",
        problems.map((p) => `${p.index + 1}: ${p.reason}`).join(" | "),
      );
    }
    if (done.size < data.indices.length)
      throw new LlmError("bad-response", "slides failed the checks");
    return Response.json({ ok: true, slides: data.indices.map((i) => done.get(i)!) });
  } catch (err) {
    return errorReply(err, c, "api/slides/write");
  }
}
