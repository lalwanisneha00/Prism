import { z } from "zod";
import { LlmError } from "@/lib/llm";
import { DeckBriefSchema } from "@/lib/slides/ai/outline";
import {
  DeckReviewSchema,
  fakeReview,
  REVIEWED,
  reviewPrompt,
  reviewResults,
} from "@/lib/slides/ai/review";
import { askJson, clock, errorReply, invalid, isFake } from "@/lib/slides/ai/server";
import { AiSlideSchema } from "@/lib/slides/ai/write";

/*
 * POST slides → { ok, results }: step 3 of a deck (deck quality overhaul), for teaching,
 * self-study and practice decks. ONE AI call reviews the slides (accuracy, depth, activities
 * against the reject list) and returns a verdict per slide; a slide without one is not passed.
 */

export const maxDuration = 60;

const RequestSchema = z.object({
  brief: DeckBriefSchema,
  slides: z
    .array(z.object({ index: z.int().min(1), slide: AiSlideSchema }))
    .min(1)
    .max(40),
  others: z.array(z.string().trim().max(400)).max(80).default([]),
});

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success || !REVIEWED.has(body.data.brief.purpose)) return invalid();
  const data = body.data;
  const c = clock(req);
  try {
    let parsed = DeckReviewSchema.safeParse(isFake() ? fakeReview(data.slides) : null);
    for (let attempt = 0; attempt < 2 && !parsed.success; attempt++) {
      if (attempt > 0 && c.left() < 15_000) break;
      const { system, prompt } = reviewPrompt(data.brief, data.slides, data.others);
      const raw = await askJson(req, c, { system, prompt, temperature: 0 });
      parsed = DeckReviewSchema.safeParse(reviewResults(raw));
      if (!parsed.success)
        console.warn("[api/slides/review] unreadable reply:", JSON.stringify(raw)?.slice(0, 300));
    }
    if (!parsed.success) throw new LlmError("bad-response", "the review's reply couldn't be read");
    const wanted = new Set(data.slides.map((s) => s.index));
    const results = parsed.data.results.filter((r) => wanted.has(r.index));
    const flagged = results.filter((r) => !r.pass);
    if (flagged.length)
      console.info(
        "[api/slides/review] flagged:",
        flagged.map((f) => `${f.index}: ${f.issues.join("; ")}`).join(" | "),
      );
    return Response.json({ ok: true, results });
  } catch (err) {
    return errorReply(err, c, "api/slides/review");
  }
}
