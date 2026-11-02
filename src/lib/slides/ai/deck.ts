import type { Lesson } from "@/lib/schema";
import { lessonVisuals, type LessonVisual } from "@/lib/slides/ai/digest";
import type { DeckBrief, Outline } from "@/lib/slides/ai/outline";
import {
  REVIEWED,
  reviewDeck,
  type DeckReviewReport,
  type SlideVerdict,
} from "@/lib/slides/ai/review";
import { deckChecks, splitOverflow } from "@/lib/slides/ai/split";
import {
  BATCH,
  batchesOf,
  slideText,
  toSlides,
  type AiSlide,
  type WriteFeedback,
} from "@/lib/slides/ai/write";
import { planProblems, type Slide, type SlidePlan, type VisualRequest } from "@/lib/slides/plan";
import { clip } from "@/lib/slides/text";

/*
 * The deck pipeline in the browser (deck quality overhaul): outline → slides (a few per request)
 * → review and fixes (teaching, self-study, practice) → the slide plan the renderers draw, with
 * overflowing slides split and cheap code checks. The network call is passed in, so the whole
 * flow is tested without a server.
 */

export type Post = (url: string, body: unknown) => Promise<Record<string, unknown>>;

export type DeckStage =
  | { stage: "outline" }
  | { stage: "writing"; done: number; total: number }
  | { stage: "reviewing" | "fixing"; flagged: number };

export type DeckReport = {
  review?: DeckReviewReport;
  /** Code-check findings left in the finished deck (shown to the student, never hidden). */
  checks: string[];
};

/** Earlier slides as one line each (what the writer continues from). */
const earlierText = (slides: readonly AiSlide[]) => slides.map((s) => clip(slideText(s), 300));

const formatsIn = (slides: readonly AiSlide[]) =>
  slides.flatMap((s) => (s.layout === "activity" ? [s.format] : []));

/** Steps 1-3: the outline, the slides, and (for some purposes) the review with its fixes. */
export async function writeDeck(
  brief: DeckBrief,
  post: Post,
  onStage: (s: DeckStage) => void,
): Promise<{ outline: Outline; slides: AiSlide[]; review?: DeckReviewReport }> {
  onStage({ stage: "outline" });
  const outline = (await post("/api/slides/outline", brief)).outline as Outline;
  const slides: AiSlide[] = [];
  const batches = batchesOf(outline, brief.purpose);
  for (const [n, b] of batches.entries()) {
    onStage({ stage: "writing", done: n, total: batches.length });
    const reply = await post("/api/slides/write", {
      brief,
      outline,
      indices: b.items.map((_, i) => b.from + i),
      earlier: earlierText(slides).slice(-40),
      formatsUsed: formatsIn(slides),
    });
    slides.push(...(reply.slides as AiSlide[]));
  }
  onStage({ stage: "writing", done: batches.length, total: batches.length });
  if (!REVIEWED.has(brief.purpose)) return { outline, slides };

  const { slides: reviewed, report } = await reviewDeck(slides, {
    review: async (some, others) => {
      const results: SlideVerdict[] = [];
      for (let i = 0; i < some.length; i += 20) {
        const reply = await post("/api/slides/review", {
          brief,
          slides: some.slice(i, i + 20),
          others: others.slice(0, 60),
        });
        results.push(...(reply.results as SlideVerdict[]));
      }
      return results;
    },
    rewrite: async (feedback: readonly WriteFeedback[]) => {
      const out = new Map<number, AiSlide>();
      const size = BATCH[brief.purpose];
      for (let i = 0; i < feedback.length; i += size) {
        const chunk = feedback.slice(i, i + size);
        const skip = new Set(chunk.map((f) => f.index));
        const others = slides.filter((_, k) => !skip.has(k));
        const reply = await post("/api/slides/write", {
          brief,
          outline,
          indices: chunk.map((f) => f.index),
          earlier: earlierText(others).slice(-40),
          formatsUsed: formatsIn(others),
          feedback: chunk,
        });
        (reply.slides as AiSlide[]).forEach((s, k) => out.set(chunk[k].index, s));
      }
      return out;
    },
    onProgress: ({ stage, flagged }) => onStage({ stage, flagged }),
  });
  return { outline, slides: reviewed, review: report };
}

export type AssembleOptions = {
  brief: DeckBrief;
  outline: Outline;
  slides: readonly AiSlide[];
  lessons: readonly Lesson[];
  subjectName: string;
  levelName: string;
  teacherNotes: boolean;
};

const TAGS = {
  teach: "Lesson",
  study: "Study notes",
  revise: "Revision",
  practice: "Practice sheet",
  summary: "Summary",
} as const;

/** Step 4: the slide plan (title, the written slides, sources), split where it would overflow. */
export function assemblePlan(o: AssembleOptions): { plan: SlidePlan; checks: string[] } {
  let s = 0;
  let v = 0;
  const ids = { slide: () => `s${++s}`, visual: () => `v${++v}` };
  const visuals: Record<string, VisualRequest> = {};
  const credits = [
    ...new Set(
      o.lessons.flatMap((l) =>
        l.meta.sources.map(
          (x) => `${x.title}, ${x.publisher}${x.license ? ` (${x.license})` : ""}`,
        ),
      ),
    ),
  ];
  const visualsList: LessonVisual[] = lessonVisuals(o.lessons);
  const body = toSlides(o.slides, o.brief.purpose, visualsList, ids, visuals);
  const summary = o.brief.purpose === "summary";
  const goals = o.outline.goals.join(" ");
  const slides: Slide[] = summary
    ? body
    : [
        {
          id: ids.slide(),
          layout: "title",
          title: clip(o.brief.title, 100, false),
          subtitle: clip(`${o.subjectName} · ${o.levelName}`, 160, false),
          tag: TAGS[o.brief.purpose],
          notes:
            o.brief.purpose === "teach"
              ? `SAY: Welcome the class and tell them what they will be able to do by the end: ${goals}`.slice(
                  0,
                  4000,
                )
              : "",
        },
        ...body,
        {
          id: ids.slide(),
          layout: "sources",
          title: "Sources and credits",
          items: (credits.length
            ? credits
            : ["Prism lessons are built from the sources listed in each lesson."]
          )
            .slice(0, 10)
            .map((c) => ({ label: clip(c, 120), detail: "" })),
          notes: "",
        },
      ];
  const minutes = o.slides.reduce(
    (m, x) => m + (x.layout === "activity" ? x.minutes : (x.notes.minutes ?? 0)),
    0,
  );
  const raw: SlidePlan = {
    title: o.brief.title,
    subject: o.subjectName,
    purpose: o.brief.purpose,
    level: o.levelName,
    topics: o.brief.topics.map((t) => t.name),
    ...(o.brief.purpose === "teach" && minutes > 0
      ? { minutes: Math.min(600, Math.max(1, Math.round(minutes))) }
      : {}),
    ...(o.brief.purpose === "teach" ? { teacherNotes: o.teacherNotes } : {}),
    slides,
    visuals,
    credits: credits.slice(0, 40),
  };
  const invalid = planProblems(raw);
  if (invalid.length) throw new Error(`Slide plan is invalid: ${invalid.slice(0, 3).join("; ")}`);
  const plan = splitOverflow(raw);
  return {
    plan,
    // Splitting adds "continued" slides on purpose: the count check compares what was written.
    checks: deckChecks(plan, o.brief.slides, o.slides.length),
  };
}
