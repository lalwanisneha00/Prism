import { curatedVideos } from "@/data/curatedLinks";
import { findMathErrors } from "@/lib/checks/mathCheck";
import { extractCompleteArrayItems, parseJsonReply } from "@/lib/jsonReply";
import type { LessonEvent } from "@/lib/lessonEvents";
import type { LessonRequest } from "@/lib/lessonRequest";
import { LlmError, type GenerateOptions } from "@/lib/llm/types";
import {
  buildLessonPrompt,
  buildRepairPrompt,
  defaultVisualRules,
  type GroundingSource,
} from "@/lib/prompts/lessonPrompt";
import { parseLesson, SectionSchema, type Lesson, type Link, type Source } from "@/lib/schema";
import { dropBadVisuals, findVisualProblems } from "@/visuals/visualChecks";

export type GenerateFn = (options: GenerateOptions) => Promise<string>;

export type GenerateLessonOptions = {
  generate: GenerateFn;
  emit: (event: LessonEvent) => void;
  sources: GroundingSource[];
  visualRules?: string;
  signal?: AbortSignal;
  maxAttempts?: number;
  now?: () => Date;
};

/** The parts of a lesson the app decides itself, never the AI. */
export function lessonMeta(request: LessonRequest, sources: Source[], now: Date): Lesson["meta"] {
  return {
    subject: request.subject.id,
    chapter: request.chapter.id,
    topic: request.topic.id,
    title: request.topic.name,
    level: request.level.slug,
    durationMin: request.duration,
    createdAt: now.toISOString(),
    sources: sources.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      publisher: s.publisher,
      kind: s.kind,
      license: s.license,
    })),
    ...(sources.some((s) => s.kind === "notes") ? { fromNotes: true } : {}),
  };
}

function curatedFurtherLearning(
  request: LessonRequest,
  sources: Source[],
): Lesson["furtherLearning"] {
  const readings: Link[] = sources.flatMap((s) =>
    s.kind === "textbook" && s.url
      ? [{ title: s.title, url: s.url, publisher: s.publisher, note: "Free textbook section." }]
      : [],
  );
  return { videos: curatedVideos[request.subject.id] ?? [], papers: [], readings };
}

/** Only the fact-check pass may set a section's Sourced/Verify badge, never the writer. */
function withoutSelfAwardedBadge(section: unknown): unknown {
  if (!section || typeof section !== "object") return section;
  const copy = { ...(section as Record<string, unknown>) };
  delete copy.check;
  return copy;
}

/**
 * Writes a lesson with the AI and returns it only once it passes the lesson schema.
 * Invalid replies are sent back with the list of problems, up to `maxAttempts` times.
 */
export async function generateLesson(
  request: LessonRequest,
  {
    generate,
    emit,
    sources,
    visualRules = defaultVisualRules,
    signal,
    maxAttempts = 3,
    now = () => new Date(),
  }: GenerateLessonOptions,
): Promise<Lesson> {
  const { system, prompt } = buildLessonPrompt(request, sources, visualRules);
  const meta = lessonMeta(request, sources, now());
  let currentPrompt = prompt;
  let lastProblems: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    emit(
      attempt === 1
        ? { type: "stage", stage: "writing", message: "Writing your lesson…" }
        : {
            type: "stage",
            stage: "fixing",
            message: `Fixing a few problems (attempt ${attempt})…`,
          },
    );

    // Stream sections to the page as soon as each one is complete (first attempt only).
    let streamed = "";
    let sent = 0;
    const onText =
      attempt === 1
        ? (chunk: string) => {
            streamed += chunk;
            const items = extractCompleteArrayItems(streamed, "sections");
            for (; sent < items.length; sent++) {
              const section = SectionSchema.safeParse(withoutSelfAwardedBadge(items[sent]));
              if (section.success) emit({ type: "section", section: section.data });
            }
          }
        : undefined;

    const reply = await generate({ system, prompt: currentPrompt, onText, signal });

    let body: unknown;
    try {
      body = parseJsonReply(reply);
    } catch (err) {
      lastProblems = [`the reply was not valid JSON (${(err as Error).message})`];
      currentPrompt = buildRepairPrompt(prompt, reply, lastProblems);
      continue;
    }

    const candidate =
      body && typeof body === "object"
        ? {
            ...body,
            sections: Array.isArray((body as { sections?: unknown }).sections)
              ? (body as { sections: unknown[] }).sections.map(withoutSelfAwardedBadge)
              : (body as { sections?: unknown }).sections,
            meta,
            furtherLearning: curatedFurtherLearning(request, meta.sources),
          }
        : body;
    const result = parseLesson(candidate);
    if (result.ok) {
      // Deterministic checks: every formula must typeset and every visual must be drawable.
      // On the last attempt the lesson is still shown: broken formulas render in red and
      // undrawable visuals are removed, rather than showing nothing at all.
      const problems = [...findMathErrors(result.lesson), ...findVisualProblems(result.lesson)];
      if (problems.length === 0) return result.lesson;
      if (attempt === maxAttempts) return dropBadVisuals(result.lesson);
      lastProblems = problems;
      currentPrompt = buildRepairPrompt(prompt, reply, lastProblems);
      continue;
    }

    lastProblems = result.problems;
    currentPrompt = buildRepairPrompt(prompt, reply, lastProblems);
  }

  throw new LlmError(
    "bad-response",
    `The AI's lesson did not pass our checks after ${maxAttempts} tries: ${lastProblems.slice(0, 3).join("; ")}`,
  );
}
