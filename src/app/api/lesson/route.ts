import { findSampleLesson } from "@/data/sampleLessons";
import { generateLesson } from "@/lib/generateLesson";
import { groundSources } from "@/lib/grounding/groundSources";
import { errorCopy, type LessonEvent } from "@/lib/lessonEvents";
import { validateLessonRequest, type RawLessonRequest } from "@/lib/lessonRequest";
import { generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import { fakeLessonBody, fakeVerification } from "@/lib/llm/fakeLesson";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { sourcesForTopic } from "@/lib/sources";
import { verifyLesson } from "@/lib/verify";
import { visualPromptRules } from "@/visuals/visualChecks";

// Writing and checking a lesson can take a while on the free tier.
export const maxDuration = 60;

function providers(sources: ReturnType<typeof sourcesForTopic>): LlmProvider[] {
  // LLM_PROVIDER=fake streams a canned lesson and fact-check: for testing without an API key.
  if (process.env.LLM_PROVIDER === "fake") {
    const body = fakeLessonBody(sources);
    return [
      new FakeProvider(
        (options) =>
          JSON.stringify(options.system.includes("fact-checker") ? fakeVerification(body) : body),
        150,
      ),
    ];
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

        send({ type: "stage", stage: "sources", message: "Reading trusted sources…" });
        const sources = await groundSources(sourcesForTopic(request.subject.id, request.topic.id), {
          signal: req.signal,
        });
        const chain = providers(sources);
        const generate = (options: GenerateOptions) => generateJsonWithFallback(chain, options);

        const draft = await generateLesson(request, {
          generate,
          emit: send,
          sources,
          visualRules: visualPromptRules(request.topic.id),
          signal: req.signal,
        });

        send({ type: "stage", stage: "checking", message: "Fact-checking against the sources…" });
        const { lesson } = await verifyLesson(draft, sources, generate, req.signal);
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
