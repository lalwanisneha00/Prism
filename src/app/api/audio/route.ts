import { z } from "zod";
import type { AudioResponse } from "@/lib/audio/audioEvents";
import {
  ChapterPlanSchema,
  generateChapter,
  generateOutline,
  MAX_CHAPTERS,
} from "@/lib/audio/generateNarration";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { parseLesson } from "@/lib/schema";

export const maxDuration = 60;

function providers(): LlmProvider[] {
  if (process.env.LLM_PROVIDER === "fake") {
    // Offline testing: a padded echo of the chapter brief, or a 2× outline.
    return [
      new FakeProvider((o) => {
        if (o.system.includes("You plan long audio lessons")) {
          const n = Number(/exactly (\d+) chapters/.exec(o.system)?.[1] ?? 4);
          return JSON.stringify({
            chapters: Array.from({ length: n }, (_, i) => ({
              id: `part-${i + 1}`,
              title: `Part ${i + 1}`,
              brief: `Test chapter ${i + 1}.`,
            })),
          });
        }
        const brief = /WHAT THIS CHAPTER COVERS: (.*)/.exec(o.prompt)?.[1] ?? "";
        return JSON.stringify({ text: `${brief} ${brief} This is test narration.` });
      }, 30),
    ];
  }
  return providersFromEnv();
}

const RequestSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("outline"), lesson: z.unknown() }),
  z.object({
    step: z.literal("chapter"),
    lesson: z.unknown(),
    plan: z.array(ChapterPlanSchema).min(1).max(MAX_CHAPTERS),
    index: z.int().min(0),
    previousEnding: z.string().max(2000),
  }),
]);

const reply = (body: AudioResponse, status = 200) => Response.json(body, { status });

/** POST { step: "outline" | "chapter", lesson, … }: one piece of an audio narration. */
export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  // The lesson is re-validated here: the server never trusts a lesson sent by a browser.
  const lesson = body.success ? parseLesson(body.data.lesson) : null;
  if (!body.success || !lesson?.ok) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  const chain = chainFor(req, providers);
  const generate = (o: GenerateOptions) => generateJsonWithFallback(chain, o);

  try {
    if (body.data.step === "outline") {
      return reply({ ok: true, plan: await generateOutline(lesson.lesson, generate, req.signal) });
    }
    const { plan, index, previousEnding } = body.data;
    if (index >= plan.length) {
      return reply({ ok: false, kind: "invalid-request", message: "No such chapter." }, 400);
    }
    const chapter = await generateChapter(
      lesson.lesson,
      plan,
      index,
      previousEnding,
      generate,
      req.signal,
    );
    return reply({ ok: true, chapter });
  } catch (err) {
    const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
    console.error(`[api/audio] ${lesson.lesson.meta.topic}:`, error.message);
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, 503);
  }
}
