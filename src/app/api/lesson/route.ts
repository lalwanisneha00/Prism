import { findSampleLesson } from "@/data/sampleLessons";
import { parseEmphasis } from "@/lib/syllabus/emphasis";
import { getAdmin } from "@/lib/firebase/admin";
import { generateLesson } from "@/lib/generateLesson";
import { groundSources } from "@/lib/grounding/groundSources";
import { errorCopy, type LessonEvent } from "@/lib/lessonEvents";
import { validateLessonRequest, type RawLessonRequest } from "@/lib/lessonRequest";
import { findProvider, KEY_HEADERS } from "@/lib/byok/catalogue";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import { fakeLessonBody, fakeVerification } from "@/lib/llm/fakeLesson";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";
import { adminLibraryStore } from "@/lib/library/adminStore";
import {
  libraryKey,
  readFromLibrary,
  writeToLibrary,
  type LibraryStore,
} from "@/lib/library/sharedLibrary";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";
import { searchWikipedia } from "@/lib/grounding/wikipedia";
import { parsePassages, passagesToSources } from "@/lib/notes/notesSources";
import { searchedSources, sourcesForTopic } from "@/lib/sources";
import { verifyLesson } from "@/lib/verify";
import { visualPromptRules } from "@/visuals/visualChecks";

// Writing and checking a lesson can take a while on the free tier.
export const maxDuration = 60;

function providers(sources: ReturnType<typeof sourcesForTopic>, topicId: string): LlmProvider[] {
  // LLM_PROVIDER=fake streams a canned lesson and fact-check: for testing without an API key.
  if (process.env.LLM_PROVIDER === "fake") {
    const body = fakeLessonBody(sources, topicId);
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

/** Who wrote a lesson, from the provider that answered ("Gemini (gemini-flash-latest)"). */
function generatedBy(
  writer: LlmProvider | undefined,
  ownKey: string | undefined,
  ownModel: string,
) {
  const name = writer?.name ?? "AI";
  const open = name.indexOf("(");
  return {
    provider: ownKey ?? (open > 0 ? name.slice(0, open).trim() : name),
    model: ownKey ? ownModel : open > 0 ? name.slice(open + 1).replace(/\)$/, "") : "",
    ownKey: Boolean(ownKey),
  };
}

/** The shared lesson library, or null when Firebase Admin isn't configured (or in fake mode). */
async function sharedLibrary(): Promise<LibraryStore | null> {
  if (process.env.LLM_PROVIDER === "fake") return null;
  const admin = await getAdmin();
  return admin ? adminLibraryStore(admin.db) : null;
}

/**
 * POST { subject, chapter, topic, level, duration, fresh?, notes? } → a stream of LessonEvent lines
 * (application/x-ndjson). The AI key is only ever used here, on the server.
 */
export async function POST(req: Request) {
  const raw: unknown = await req.json().catch(() => null);
  // A student's own subject (V3 · Step 4) travels with the request; it is checked like the rest.
  const custom = CustomSubjectPayloadSchema.safeParse(
    raw && typeof raw === "object" ? (raw as { custom?: unknown }).custom : undefined,
  );
  const result = validateLessonRequest(
    raw && typeof raw === "object" ? (raw as RawLessonRequest) : {},
    custom.success ? [toSubject(custom.data)] : [],
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
  // The student's own key, if they sent one: only the provider's name is kept (never the key).
  const ownModel = req.headers.get(KEY_HEADERS.model) ?? "";
  const ownKey = req.headers.has(KEY_HEADERS.key)
    ? (findProvider(req.headers.get(KEY_HEADERS.provider) ?? "")?.name ?? "your provider")
    : undefined;
  // "Write a fresh version" skips the shared library copy.
  const body =
    raw && typeof raw === "object"
      ? (raw as { fresh?: unknown; notes?: unknown; emphasis?: unknown })
      : {};
  // The student's course outcomes (checked): they shape the lesson, so it is personal too.
  const emphasis = parseEmphasis(body.emphasis);
  const fresh = Boolean(body.fresh);
  // Passages from the student's own notes: such lessons are personal, never shared.
  const notes = passagesToSources(parsePassages(body.notes));
  // Lessons from the student's notes or own subject are personal, never shared.
  const personal = notes.length > 0 || custom.success || emphasis !== null;
  const key = libraryKey({
    subject: request.subject.id,
    topic: request.topic.id,
    level: request.level.slug,
    durationMin: request.duration,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: LessonEvent) => {
        if (req.signal.aborted) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const sample = personal ? null : findSampleLesson(request.topic.id, request.level.slug);
        if (sample) {
          send({
            type: "lesson",
            lesson: { ...sample, meta: { ...sample.meta, durationMin: request.duration } },
            cached: true,
          });
          return;
        }

        // The shared library first: an instant, consistent answer that uses no AI quota.
        const library = personal ? null : await sharedLibrary();
        if (library && !fresh) {
          const stored = await readFromLibrary(library, key).catch((err: unknown) => {
            console.warn("[api/lesson] library read failed:", String(err));
            return null;
          });
          if (stored) {
            send({ type: "lesson", lesson: stored, cached: true, libraryKey: key });
            return;
          }
        }

        send({ type: "stage", stage: "sources", message: "Reading trusted sources…" });
        // Curated sources first. A topic with none (most of PDEU's new topics until sources are added
        // by hand) gets the best-matching free Wikipedia articles instead, like a student's own subject.
        const curated = custom.success ? [] : sourcesForTopic(request.subject.id, request.topic.id);
        const sources = [
          ...notes,
          ...(await groundSources(
            curated.length > 0
              ? curated
              : await searchedSources(
                  request.topic.name.slice(0, 120),
                  request.subject.name,
                  (q, limit) => searchWikipedia(q, limit, { signal: req.signal }),
                ),
            { signal: req.signal },
          )),
        ];
        const chain = chainFor(req, () => providers(sources, request.topic.id));
        // Which provider wrote the lesson is recorded on it (and shown as "Using: …").
        let writer: LlmProvider | undefined;
        const generate = (options: GenerateOptions) =>
          generateJsonWithFallback(chain, options, undefined, undefined, (p) => {
            writer = p;
          });

        const draft = await generateLesson(request, {
          generate,
          emit: send,
          sources,
          emphasis,
          visualRules: visualPromptRules(request.topic.id, {
            field: request.subject.field,
            level: request.level.slug,
          }),
          signal: req.signal,
        });

        send({ type: "stage", stage: "checking", message: "Fact-checking against the sources…" });
        const verified = await verifyLesson(draft, sources, generate, req.signal);
        const { checked } = verified;
        const lesson = {
          ...verified.lesson,
          meta: { ...verified.lesson.meta, generatedBy: generatedBy(writer, ownKey, ownModel) },
        };

        // Only lessons that went through the fact-check are shared with other students.
        let stored = false;
        if (library && checked) {
          stored = await writeToLibrary(library, lesson).catch((err: unknown) => {
            console.warn("[api/lesson] library write failed:", String(err));
            return false;
          });
        }
        send({ type: "lesson", lesson, cached: false, libraryKey: stored ? key : undefined });
      } catch (err) {
        if (req.signal.aborted) return;
        const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
        console.error(`[api/lesson] ${request.topic.id}/${request.level.slug}:`, error.message);
        send({
          type: "error",
          kind: error.kind,
          message: errorCopy[error.kind].message,
          ...(ownKey ? { usedUserKey: ownKey } : {}),
        });
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
