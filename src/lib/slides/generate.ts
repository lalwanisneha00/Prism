import { findLevel, type LevelSlug } from "@/data/levels";
import { fetchTopicLesson } from "@/lib/chapter/fetchTopic";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import type { Lesson } from "@/lib/schema";
import { buildPlan } from "@/lib/slides/build";
import { finalizePlan } from "@/lib/slides/finalize";
import { renderPdf, type PdfFonts } from "@/lib/slides/pdf";
import type { Format, Purpose } from "@/lib/slides/plan";
import { renderPptx } from "@/lib/slides/pptx";
import { renderImages } from "@/lib/slides/render/browser";
import { saveSlideFile, MIME } from "@/lib/slides/store";
import { findTheme } from "@/lib/slides/themes";
import { nearestDuration } from "@/lib/priority/length";
import { getSavedLesson, lessonId } from "@/lib/storage/library";
import type { StoredSlideFile } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

/*
 * Makes a deck or PDF from the same grounded, verified lessons the lesson page shows: each topic's
 * lesson comes from the saved library or the normal lesson pipeline (sources, fact-check, code
 * checks, shared library), then the plan, the pictures and the file are built in the browser.
 */

export type GenerateRequest = {
  subject: Subject;
  chapterId: string;
  topicIds: string[];
  level: LevelSlug;
  purpose: Purpose;
  format: Format;
  slides: number;
  themeId: string;
  title: string;
};

export type Progress = { phase: string; done: number; total: number };

export class GenerateError extends Error {
  constructor(
    readonly kind: LessonErrorKind | "empty",
    message: string,
  ) {
    super(message);
  }
}

/** How long each topic's lesson should be, so the deck has enough to say. */
export function lessonMinutesFor(slides: number, topics: number): number {
  return nearestDuration(
    Math.min(60, Math.max(10, Math.round((slides * 2.4) / Math.max(1, topics)))),
  );
}

async function loadFonts(): Promise<PdfFonts> {
  const get = async (name: string) => {
    const res = await fetch(`/fonts/${name}`);
    if (!res.ok) throw new Error(`Couldn't load the font ${name}.`);
    return new Uint8Array(await res.arrayBuffer());
  };
  const [sans, sansBold, serif, serifBold] = await Promise.all([
    get("NotoSans_400Regular.ttf"),
    get("NotoSans_700Bold.ttf"),
    get("NotoSerif_400Regular.ttf"),
    get("NotoSerif_700Bold.ttf"),
  ]);
  return { sans, sansBold, serif, serifBold };
}

export async function generateFile(
  req: GenerateRequest,
  onProgress: (p: Progress) => void,
  signal: AbortSignal,
): Promise<StoredSlideFile> {
  const chapter = req.subject.chapters.find((c) => c.id === req.chapterId);
  const topics = chapter?.topics.filter((t) => req.topicIds.includes(t.id)) ?? [];
  if (!chapter || topics.length === 0)
    throw new GenerateError("empty", "Choose at least one topic.");
  const minutes = lessonMinutesFor(req.slides, topics.length);

  const lessons: Lesson[] = [];
  for (const [i, topic] of topics.entries()) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress({ phase: `Reading and checking “${topic.name}”`, done: i, total: topics.length });
    const saved = await getSavedLesson(
      lessonId({
        subject: req.subject.id,
        topic: topic.id,
        level: req.level,
        durationMin: minutes,
        fromNotes: false,
      }),
    ).catch(() => undefined);
    if (saved) {
      lessons.push(saved.lesson);
      continue;
    }
    const result = await fetchTopicLesson(
      {
        subject: req.subject.id,
        chapter: chapter.id,
        topic: topic.id,
        level: req.level,
        duration: minutes,
      },
      (message) => onProgress({ phase: message, done: i, total: topics.length }),
      signal,
    );
    if (!result.ok) throw new GenerateError(result.kind, "The lesson couldn't be made.");
    lessons.push(result.lesson);
  }

  onProgress({ phase: "Planning the slides", done: 0, total: 1 });
  const plan = buildPlan(lessons, {
    purpose: req.purpose,
    targetSlides: req.slides,
    subjectName: req.subject.name,
    levelName: findLevel(req.level)?.name ?? req.level,
    title: req.title,
  });

  const total = Object.keys(plan.visuals).length;
  const { images } = await renderImages(
    plan,
    (p) => onProgress({ phase: p.label, done: p.done, total: Math.max(1, total) }),
    signal,
  );
  const { plan: finished } = finalizePlan(plan, images);

  onProgress({
    phase: req.format === "pdf" ? "Laying out the PDF" : "Building the PowerPoint",
    done: 0,
    total: 1,
  });
  const theme = findTheme(req.themeId);
  const bytes =
    req.format === "pdf"
      ? await renderPdf(finished, theme, images, await loadFonts())
      : await renderPptx(finished, theme, images);
  const blob = new Blob([bytes as BlobPart], { type: MIME[req.format] });
  return saveSlideFile({
    title: req.title,
    subject: req.subject.name,
    purpose: req.purpose,
    format: req.format,
    theme: theme.id,
    slides: finished.slides.length,
    blob,
  });
}
