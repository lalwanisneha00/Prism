import { curatedVideos } from "@/data/curatedLinks";
import { dropFailedChecks, findAnswerProblems } from "@/lib/checks/answerCheck";
import { effectiveTier } from "@/lib/tiers";
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
import { dropUnsupportedCharts, sourcedNumberProblems } from "@/visuals/generic/sourcedNumbers";

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
export function lessonMeta(
  request: LessonRequest,
  sources: GroundingSource[],
  now: Date,
): Lesson["meta"] {
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
    tier: effectiveTier(request.subject.tier, sources),
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

const CITATION_TAG = /\s*[[(](?:source[ _-]?ids?|sources?|cite)\s*:\s*[a-z0-9 ,_-]*[\])]/gi;

/**
 * Removes citation tags the AI sometimes writes into the text, like
 * "[sourceIds: wikipedia-taylor-series]". Citations live in "sourceIds" and show as badges.
 */
export function stripCitationTags(value: unknown): unknown {
  if (typeof value === "string") return value.replace(CITATION_TAG, "");
  if (Array.isArray(value)) return value.map(stripCitationTags);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, k === "sourceIds" ? v : stripCitationTags(v)]),
    );
  }
  return value;
}

/**
 * A short answer written as bare LaTeX ("\frac{1}{2}") would show as raw text. When the
 * string has no "$" at all, the whole thing is maths: wrap it, saving a repair round.
 */
export function wrapBareMath(text: string): string {
  return text.length <= 160 && !text.includes("$") && /\\[a-zA-Z]{2,}/.test(text)
    ? `$${text.trim()}$`
    : text;
}

/** Applies wrapBareMath to quiz options/answers and worked-example answers (same rule for both, so they still match). */
function wrapShortAnswers(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const copy = { ...(body as Record<string, unknown>) };
  if (Array.isArray(copy.quiz)) {
    copy.quiz = copy.quiz.map((q: unknown) => {
      if (!q || typeof q !== "object") return q;
      const item = { ...(q as Record<string, unknown>) };
      if (typeof item.answer === "string") item.answer = wrapBareMath(item.answer);
      if (Array.isArray(item.options)) {
        item.options = item.options.map((o: unknown) =>
          typeof o === "string" ? wrapBareMath(o) : o,
        );
      }
      return item;
    });
  }
  if (Array.isArray(copy.workedExamples)) {
    copy.workedExamples = copy.workedExamples.map((w: unknown) =>
      w && typeof w === "object" && typeof (w as { answer?: unknown }).answer === "string"
        ? { ...w, answer: wrapBareMath((w as { answer: string }).answer) }
        : w,
    );
  }
  return copy;
}

/** Only the fact-check pass may set a section's Sourced/Verify badge, never the writer. */
/**
 * Last-chance rescue: when the only schema problems left are inside sections' visuals
 * ("sections.2.visual.sets: …"), drop those visuals. A visual is optional, so the lesson is
 * still complete; the student just doesn't get that one picture. Returns null when other
 * problems remain.
 */
export function withoutBrokenVisuals(candidate: unknown, problems: string[]): unknown | null {
  const broken = new Set<number>();
  for (const p of problems) {
    const m = /^sections\.(\d+)\.visual\b/.exec(p);
    if (!m) return null;
    broken.add(Number(m[1]));
  }
  if (broken.size === 0 || !candidate || typeof candidate !== "object") return null;
  const sections = (candidate as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return null;
  return {
    ...candidate,
    sections: sections.map((section, i) => {
      if (!broken.has(i) || !section || typeof section !== "object") return section;
      const copy = { ...(section as Record<string, unknown>) };
      delete copy.visual;
      return copy;
    }),
  };
}

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
  // Source excerpts by id: "sourced" chart numbers must be traceable to them.
  const excerpts = Object.fromEntries(sources.map((s) => [s.id, s.excerpt ?? ""]));

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
              const section = SectionSchema.safeParse(
                withoutSelfAwardedBadge(stripCitationTags(items[sent])),
              );
              if (section.success) emit({ type: "section", section: section.data });
            }
          }
        : undefined;

    const reply = await generate({ system, prompt: currentPrompt, onText, signal });

    let body: unknown;
    try {
      body = wrapShortAnswers(stripCitationTags(parseJsonReply(reply)));
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
      const problems = [
        ...findMathErrors(result.lesson),
        ...findVisualProblems(result.lesson),
        ...sourcedNumberProblems(result.lesson, excerpts),
        ...findAnswerProblems(result.lesson.workedExamples),
      ];
      if (problems.length === 0) return result.lesson;
      if (attempt === maxAttempts) {
        const lesson = dropUnsupportedCharts(dropBadVisuals(result.lesson), excerpts);
        return { ...lesson, workedExamples: dropFailedChecks(lesson.workedExamples) };
      }
      lastProblems = problems;
      currentPrompt = buildRepairPrompt(prompt, reply, lastProblems);
      continue;
    }

    if (attempt === maxAttempts) {
      const rescued = withoutBrokenVisuals(candidate, result.problems);
      const retry = rescued ? parseLesson(rescued) : null;
      if (retry?.ok) {
        const lesson = dropUnsupportedCharts(dropBadVisuals(retry.lesson), excerpts);
        return { ...lesson, workedExamples: dropFailedChecks(lesson.workedExamples) };
      }
    }
    lastProblems = result.problems;
    currentPrompt = buildRepairPrompt(prompt, reply, lastProblems);
  }

  throw new LlmError(
    "bad-response",
    `The AI's lesson did not pass our checks after ${maxAttempts} tries: ${lastProblems.slice(0, 3).join("; ")}`,
  );
}
