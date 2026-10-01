import { findSampleLesson } from "@/data/sampleLessons";
import { generateLesson } from "@/lib/generateLesson";
import { errorCopy, type LessonEvent } from "@/lib/lessonEvents";
import { validateLessonRequest, type RawLessonRequest } from "@/lib/lessonRequest";
import { generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import { fakeLessonBody } from "@/lib/llm/fakeLesson";
import type { LlmProvider } from "@/lib/llm/types";
import { sourcesForTopic } from "@/lib/sources";

// Writing and checking a lesson can take a while on the free tier.
export const maxDuration = 60;

function providers(sources: ReturnType<typeof sourcesForTopic>): LlmProvider[] {
  // LLM_PROVIDER=fake streams a canned lesson: for testing without an API key.
  if (process.env.LLM_PROVIDER === "fake") {
    return [new FakeProvider(() => JSON.stringify(fakeLessonBody(sources)), 150)];
  }
  return providersFromEnv();
}

/**
 * POST { subject, chapter, topic, level, duration } → a stream of LessonEvent lines
 * (application/x-ndjson). The AI key is only ever used here, on the server.
 */
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  const result = validateLessonRequest(
    raw && typeof raw === "object" ? (raw as RawLessonRequest) : {},
  );
  if (!result.ok) {
    const event: LessonEvent = {
      type: "error",
      kind: "invalid-request",
      message: Object.values(result.errors).join(" "),
    };
    return Response.json(event, { status: 400 });
  }
  const request = result.request;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: LessonEvent) => {
        if (req.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const sample = findSampleLesson(request.topic.id, request.level.slug);
        if (sample) {
          send({
            type: "lesson",
            lesson: { ...sample, meta: { ...sample.meta, durationMin: request.duration } },
            cached: true,
          });
          return;
        }

        send({ type: "stage", stage: "sources", message: "Gathering trusted sources…" });
        const sources = sourcesForTopic(request.subject.id, request.topic.id);
        const chain = providers(sources);
        const lesson = await generateLesson(request, {
          generate: (options) => generateJsonWithFallback(chain, options),
          emit: send,
          sources,
          signal: req.signal,
        });
        send({ type: "lesson", lesson, cached: false });
      } catch (err) {
        if (req.signal.aborted) return;
        const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
        console.error(`[api/lesson] ${request.topic.id}/${request.level.slug}:`, error.message);
        send({ type: "error", kind: error.kind, message: errorCopy[error.kind].message });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed because the student left the page.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
