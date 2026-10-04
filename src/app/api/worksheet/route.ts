import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { parseLesson } from "@/lib/schema";
import { fakeWorksheet } from "@/lib/worksheet/fakeWorksheet";
import { generateWorksheet } from "@/lib/worksheet/generateWorksheet";
import { WorksheetModeSchema, type WorksheetResponse } from "@/lib/worksheet/schema";

export const maxDuration = 60;

function providers(): LlmProvider[] {
  if (process.env.LLM_PROVIDER === "fake") {
    return [new FakeProvider((o) => JSON.stringify(fakeWorksheet(o.prompt)), 20)];
  }
  return providersFromEnv();
}

const RequestSchema = z.object({ lesson: z.unknown(), mode: WorksheetModeSchema });

const reply = (body: WorksheetResponse, status = 200) => Response.json(body, { status });

/**
 * POST { lesson, mode: { mode: "practice", count } | { mode: "pyq", questions } }
 * → an exam worksheet with model answers (validated before it is sent back).
 */
export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  // The server never trusts a lesson sent by a browser: it is checked again here.
  const lesson = body.success ? parseLesson(body.data.lesson) : null;
  if (!body.success || !lesson?.ok) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  const chain = chainFor(req, providers);
  const generate = (o: GenerateOptions) => generateJsonWithFallback(chain, o);
  try {
    const worksheet = await generateWorksheet(lesson.lesson, body.data.mode, generate, req.signal);
    return reply({ ok: true, worksheet });
  } catch (err) {
    const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
    console.error(`[api/worksheet] ${lesson.lesson.meta.topic}:`, error.message);
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, 503);
  }
}
