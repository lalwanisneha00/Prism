import { LlmError } from "@/lib/llm";
import {
  DeckBriefSchema,
  fakeOutline,
  fitOutline,
  outlinePrompt,
  outlineProblems,
  OutlineSchema,
  type Outline,
} from "@/lib/slides/ai/outline";
import { askJson, clock, errorReply, invalid, isFake } from "@/lib/slides/ai/server";

/*
 * POST the deck brief → { ok, outline }: step 1 of a deck (deck quality overhaul). The AI plans
 * the deck (goals, prerequisites, misconceptions, slide-by-slide sequence); code checks the plan
 * (slide count, activities, practice answers) and asks again with the problems when it fails.
 */

export const maxDuration = 60;

/** A second try only starts with this much time left. */
const RETRY_NEEDS_MS = 20_000;

export async function POST(req: Request) {
  const body = DeckBriefSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return invalid();
  const brief = body.data;
  const c = clock(req);
  try {
    if (isFake()) return Response.json({ ok: true, outline: fakeOutline(brief) });
    let problems: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0 && c.left() < RETRY_NEEDS_MS) break;
      const { system, prompt } = outlinePrompt(brief);
      const raw = await askJson(req, c, {
        system,
        prompt: problems.length
          ? `${prompt}\n\nYOUR LAST OUTLINE HAD THESE PROBLEMS (fix them):\n${problems.map((p) => `- ${p}`).join("\n")}`
          : prompt,
        temperature: attempt === 0 ? 0.5 : 0.3,
      });
      const parsed = OutlineSchema.safeParse(raw);
      if (!parsed.success) {
        problems = [`the reply didn't match the format: ${parsed.error.issues[0]?.message ?? ""}`];
        continue;
      }
      const outline: Outline = fitOutline(parsed.data, brief.purpose, brief.slides);
      problems = outlineProblems(outline, brief.purpose, brief.slides);
      if (problems.length === 0) return Response.json({ ok: true, outline });
      console.warn("[api/slides/outline] asking again:", problems.join(" | "));
    }
    throw new LlmError("bad-response", `outline failed its checks: ${problems.join("; ")}`);
  } catch (err) {
    return errorReply(err, c, "api/slides/outline");
  }
}
