import { z } from "zod";
import { explain, ExplainInputSchema, type ExplainResponse } from "@/lib/explain/explain";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { parseLesson } from "@/lib/schema";

export const maxDuration = 60;

function providers(): LlmProvider[] {
  if (process.env.LLM_PROVIDER === "fake") {
    // Offline testing: a short answer that names the task, with a little maths.
    return [
      new FakeProvider((o) => {
        const task = /TASK: (\w+)/.exec(o.prompt)?.[1] ?? "Explain";
        const selected = /SELECTED TEXT: "([^"]*)"/.exec(o.prompt)?.[1];
        return JSON.stringify({
          text: `**Test answer (${task.toLowerCase()})**${selected ? ` for “${selected}”` : ""}: flux is like rain through a window, $\\Phi = EA$.`,
        });
      }, 20),
    ];
  }
  return providersFromEnv();
}

const RequestSchema = z.object({ lesson: z.unknown(), input: ExplainInputSchema });

const reply = (body: ExplainResponse, status = 200) => Response.json(body, { status });

/** POST { lesson, input: { action, sectionId?, selection?, avoid? } } → { ok, text }. */
export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  // The lesson is checked again here: the server never trusts a lesson sent by a browser.
  const lesson = body.success ? parseLesson(body.data.lesson) : null;
  if (!body.success || !lesson?.ok) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  const chain = chainFor(req, providers);
  const generate = (o: GenerateOptions) => generateJsonWithFallback(chain, o);
  try {
    return reply({
      ok: true,
      text: await explain(lesson.lesson, body.data.input, generate, req.signal),
    });
  } catch (err) {
    const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
    console.error(
      `[api/explain] ${lesson.lesson.meta.topic}/${body.data.input.action}:`,
      error.message,
    );
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
