import { MockError, postJson } from "@/components/mock/engine";
import { findLevel, type LevelSlug } from "@/data/levels";
import { sectionText } from "@/lib/extract/types";
import { courseLine } from "@/lib/mock/boundary";
import { topicWeights } from "@/lib/mock/paper";
import { listLocalNotes } from "@/lib/notes/store";
import { searchChunks } from "@/lib/notes/retrieval";
import { lessonDigest, lessonVisuals } from "@/lib/slides/ai/digest";
import { assemblePlan, writeDeck, type DeckReport, type DeckStage } from "@/lib/slides/ai/deck";
import type { DeckBrief } from "@/lib/slides/ai/outline";
import { splitPaper } from "@/lib/worksheet/splitPaper";
import { fetchTopicLesson } from "@/lib/chapter/fetchTopic";
import type { LessonErrorKind } from "@/lib/lessonEvents";
import type { Lesson } from "@/lib/schema";
import { buildPlan } from "@/lib/slides/build";
import { finalizePlan } from "@/lib/slides/finalize";
import { renderPdf, type PdfFonts } from "@/lib/slides/pdf";
import type { Format, Purpose, SlidePlan } from "@/lib/slides/plan";
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
 * checks, shared library). Then (deck quality overhaul) the AI plans an outline and writes the
 * slides from those lessons, the student's notes and past papers, a review pass checks teaching,
 * self-study and practice decks, and the pictures and the file are built in the browser. The
 * "basic version" (`basic: true`) skips the AI and cuts the deck straight from the lessons.
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
  /** Teaching PDFs: print the speaker notes as teacher notes (default on). */
  teacherNotes?: boolean;
  /** Build from the lessons without the AI deck writer (when the AI is unavailable). */
  basic?: boolean;
};

export type Progress = { phase: string; done: number; total: number };

export type GenerateResult = { file: StoredSlideFile; report: DeckReport | null };

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

/** Most characters of lesson material sent for the whole deck (split over the topics). */
const BRIEF_CHARS = 26_000;

const noteText = (n: { sections?: Parameters<typeof sectionText>[0][] }) =>
  (n.sections ?? []).map(sectionText).join("\n");

/** What the deck is written from: the lessons, the student's notes, past papers and weightage. */
async function buildBrief(
  req: GenerateRequest,
  lessons: readonly Lesson[],
  levelName: string,
): Promise<DeckBrief> {
  const per = Math.max(1500, Math.min(5000, Math.floor(BRIEF_CHARS / lessons.length)));
  const names = lessons.map((l) => l.meta.title);
  const notes = await listLocalNotes().catch(() => []);
  const mine = notes.filter((n) => n.subject === req.subject.id);
  const chunks = mine
    .filter((n) => n.kind !== "pyq" && !n.paper && n.kind !== "syllabus")
    .flatMap((n) => n.chunks.map((c) => ({ ...c, noteId: n.id, noteName: n.name })));
  const material = searchChunks(chunks, names.join(", "), 6).map((c) => c.text.slice(0, 800));
  const pyqs =
    req.purpose === "revise" || req.purpose === "practice"
      ? [
          ...new Set(
            mine
              .filter((n) => n.kind === "pyq" || n.paper)
              .flatMap((n) => splitPaper(noteText(n)))
              .map((q) => q.slice(0, 500)),
          ),
        ]
      : [];
  const counts = topicWeights(
    lessons.map((l) => ({ id: l.meta.title, name: l.meta.title })),
    pyqs,
  );
  const hits = [...counts.values()].reduce((a, b) => a + b - 1, 0);
  return {
    purpose: req.purpose,
    title: req.title,
    course: courseLine(req.subject),
    level: levelName,
    slides: req.slides,
    topics: lessons.map((l) => ({ name: l.meta.title, digest: lessonDigest(l, per) })),
    visuals: lessonVisuals(lessons).map((v) => ({ key: v.key, caption: v.caption })),
    material,
    pyqs: pyqs.slice(0, 15),
    weights:
      hits > 0
        ? [...counts.entries()].map(([topic, n]) => ({
            topic,
            percent: Math.round((100 * (n - 1)) / hits),
          }))
        : [],
  };
}

const STAGE_TEXT = (s: DeckStage): Progress => {
  switch (s.stage) {
    case "outline":
      return {
        phase: "Planning the deck: goals, concepts, examples, activities",
        done: 0,
        total: 1,
      };
    case "writing":
      return { phase: "Writing the slides", done: s.done, total: Math.max(1, s.total) };
    case "reviewing":
      return { phase: `Reviewing ${s.flagged} slides for accuracy and depth`, done: 0, total: 1 };
    case "fixing":
      return { phase: `Fixing ${s.flagged} slides the review flagged`, done: 0, total: 1 };
  }
};

export async function generateFile(
  req: GenerateRequest,
  onProgress: (p: Progress) => void,
  signal: AbortSignal,
): Promise<GenerateResult> {
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

  const levelName = findLevel(req.level)?.name ?? req.level;
  let plan: SlidePlan;
  let report: DeckReport | null = null;
  if (req.basic) {
    onProgress({ phase: "Planning the slides", done: 0, total: 1 });
    plan = buildPlan(lessons, {
      purpose: req.purpose,
      targetSlides: req.slides,
      subjectName: req.subject.name,
      levelName,
      title: req.title,
    });
  } else {
    const brief = await buildBrief(req, lessons, levelName);
    let stage: Progress = STAGE_TEXT({ stage: "outline" });
    const post = (url: string, body: unknown) =>
      postJson(url, body, {
        signal,
        retryBad: true,
        onWait: (sec) =>
          onProgress({ ...stage, phase: `The free AI is busy; trying again in ${sec} s…` }),
      });
    try {
      const deck = await writeDeck(brief, post, (s) => {
        stage = STAGE_TEXT(s);
        onProgress(stage);
      });
      const built = assemblePlan({
        brief,
        outline: deck.outline,
        slides: deck.slides,
        lessons,
        subjectName: req.subject.name,
        levelName,
        teacherNotes: req.teacherNotes ?? true,
      });
      plan = built.plan;
      report = {
        ...(deck.review ? { review: deck.review } : {}),
        ...(deck.reviewSkipped ? { reviewSkipped: true } : {}),
        checks: built.checks,
      };
      if (built.checks.length) console.warn("[slides] code checks:", built.checks.join(" | "));
    } catch (err) {
      if (err instanceof MockError)
        throw new GenerateError(
          err.kind,
          err.message && err.message !== err.kind ? err.message : "The slides couldn't be written.",
        );
      throw err;
    }
  }

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
  const file = await saveSlideFile({
    title: req.title,
    subject: req.subject.name,
    purpose: req.purpose,
    format: req.format,
    theme: theme.id,
    slides: finished.slides.length,
    blob,
  });
  return { file, report };
}
