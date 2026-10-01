import { generateNarration } from "@/lib/audio/generateNarration";
import type { AudioEvent } from "@/lib/audio/audioEvents";
import { errorCopy } from "@/lib/lessonEvents";
import { generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { LlmProvider } from "@/lib/llm/types";
import { parseLesson } from "@/lib/schema";

export const maxDuration = 60;

function providers(): LlmProvider[] {
  if (process.env.LLM_PROVIDER === "fake") {
    // Offline testing: echo the chapter outline back, padded to a realistic length.
    return [
      new FakeProvider((options) => {
        const outline = /OUTLINE FOR THIS CHAPTER: (.*)/.exec(options.prompt)?.[1] ?? "";
        return JSON.stringify({ text: `${outline} ${outline} This is test narration.` });
      }, 50),
    ];
  }
  return providersFromEnv();
}

/**
 * POST { lesson } → NDJSON stream of narration chapters sized to lesson.meta.durationMin.
 * The lesson is re-validated here: the server never trusts a lesson sent by a browser.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lesson?: unknown } | null;
  const parsed = parseLesson(body?.lesson);
  if (!parsed.ok) {
    const event: AudioEvent = {
      type: "error",
      kind: "invalid-request",
      message: "That lesson isn't valid.",
    };
    return Response.json(event, { status: 400 });
  }
  const lesson = parsed.lesson;
  const chain = providers();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: AudioEvent) => {
        if (!req.signal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await generateNarration(
          lesson,
          (options) => generateJsonWithFallback(chain, options),
          (index, chapter) =>
            send({ type: "chapter", index, total: lesson.audioScript.length, chapter }),
          req.signal,
        );
        send({ type: "done" });
      } catch (err) {
        if (req.signal.aborted) return;
        const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
        console.error(`[api/audio] ${lesson.meta.topic}:`, error.message);
        send({ type: "error", kind: error.kind, message: errorCopy[error.kind].message });
      } finally {
        try {
          controller.close();
        } catch {
          // The listener left the page.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
