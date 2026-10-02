import { z } from "zod";
import type { LevelSlug } from "@/data/levels";
import {
  cleanForSpeech,
  WORDS_PER_MINUTE,
  wordCount,
  type AudioChapter,
} from "@/lib/audio/timeline";
import { parseJsonReply } from "@/lib/jsonReply";
import type { GenerateOptions } from "@/lib/llm/types";
import { levelGuides } from "@/lib/prompts/levelGuides";
import type { Lesson } from "@/lib/schema";

/*
 * Audio narration in chunks (SPEC §7): an outline first, then each chapter in its own AI call.
 * A 90-minute lesson is ~12,600 words; one call per ~700-word chapter keeps every request
 * well inside the free tier's limits and lets playback start after the first chapter.
 */

export const WORDS_PER_CHAPTER = 700;
export const MAX_CHAPTERS = 20;

export const ChapterPlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  brief: z.string().min(1),
  sectionId: z.string().optional(),
});
export type ChapterPlan = z.infer<typeof ChapterPlanSchema>;

const OutlineReplySchema = z.object({ chapters: z.array(ChapterPlanSchema).min(1) });
const NarrationReplySchema = z.object({ text: z.string().min(1) });

type Generate = (options: GenerateOptions) => Promise<string>;

/** How many chapters a narration of this length needs. */
export function chapterCount(durationMin: number, outlineLength: number): number {
  const needed = Math.ceil((durationMin * WORDS_PER_MINUTE) / WORDS_PER_CHAPTER);
  return Math.min(MAX_CHAPTERS, Math.max(outlineLength, needed));
}

/** Words for each chapter so the whole narration fills the student's time budget. */
export function wordsPerChapter(durationMin: number, chapters: number): number {
  return Math.round((durationMin * WORDS_PER_MINUTE) / Math.max(1, chapters));
}

/** The lesson's own short audio outline, used as-is for short lessons. */
export function planFromLesson(lesson: Lesson): ChapterPlan[] {
  return lesson.audioScript.map((c) => ({
    id: c.id,
    title: c.title,
    brief: c.text,
    sectionId: c.sectionId,
  }));
}

/** Step 1: plan the chapters. Short lessons reuse the lesson's outline (no AI call). */
export async function generateOutline(lesson: Lesson, generate: Generate, signal?: AbortSignal) {
  const base = planFromLesson(lesson);
  const count = chapterCount(lesson.meta.durationMin, base.length);
  if (count <= base.length) return base;

  const sectionIds = lesson.sections.map((s) => s.id);
  const system = `You plan long audio lessons for college students. Reply with JSON only:
{"chapters": [{"id": "kebab-case", "title": "...", "brief": "2-3 sentences on what this chapter covers", "sectionId": "optional, one of the given section ids"}]}
Rules: exactly ${count} chapters, in teaching order, covering the whole lesson without repeating itself. Chapter 1 introduces, the last one recaps. Middle chapters may go deeper into one section each, work through examples aloud, discuss common mistakes, or quiz the listener orally.`;
  const prompt = `LESSON: ${lesson.meta.title} (level ${lesson.meta.level}, ${lesson.meta.durationMin} minutes)
SECTION IDS: ${sectionIds.join(", ")}
SECTIONS:
${lesson.sections.map((s) => `- ${s.id}: ${s.title}`).join("\n")}
WORKED EXAMPLES: ${lesson.workedExamples.length} · MISCONCEPTIONS: ${lesson.misconceptions.length}
SHORT OUTLINE TO EXPAND:
${base.map((c, i) => `${i + 1}. ${c.title}: ${c.brief}`).join("\n")}`;

  try {
    const reply = await generate({ system, prompt, signal, temperature: 0.4 });
    const parsed = parseJsonReply(reply);
    // Accept {"chapters": [...]} or a bare list of chapters.
    const chapters = OutlineReplySchema.parse(
      Array.isArray(parsed) ? { chapters: parsed } : parsed,
    ).chapters;
    if (chapters.length < base.length) return base;
    const valid = new Set(sectionIds);
    return chapters.slice(0, MAX_CHAPTERS).map((c, i) => ({
      ...c,
      id: `${i + 1}-${c.id}`.slice(0, 60),
      sectionId: c.sectionId && valid.has(c.sectionId) ? c.sectionId : undefined,
    }));
  } catch (err) {
    if (signal?.aborted) throw err;
    return base; // a shorter narration is better than none
  }
}

export function buildChapterPrompt(
  lesson: Lesson,
  plan: ChapterPlan[],
  index: number,
  previousEnding: string,
) {
  const chapter = plan[index];
  const section = lesson.sections.find((s) => s.id === chapter.sectionId);
  const target = wordsPerChapter(lesson.meta.durationMin, plan.length);
  const style = levelGuides[lesson.meta.level as LevelSlug].audioStyle;
  const isFirst = index === 0;
  const isLast = index === plan.length - 1;

  const system = `You write narration for an audio lesson that a text-to-speech voice reads aloud to a college student.
Style: ${style}.
Rules:
- Plain spoken English only. No symbols, no LaTeX, no markdown, no bullet points, no headings.
- Say equations in words, e.g. "E equals Q over four pi epsilon nought r squared".
- Short, clear sentences. Use only facts from the lesson content you are given.
- ${isFirst ? "This is the opening chapter: greet the listener briefly and say what they will learn." : "Do not greet the listener again; continue naturally from the previous chapter."}
- ${isLast ? "This is the final chapter: end with a short recap and an encouraging sign-off." : "Do not say goodbye; another chapter follows."}
- Reply with JSON only: {"text": "<the narration>"}.`;

  const examples = lesson.workedExamples
    .map((w) => `Problem: ${w.problem} Answer: ${w.answer}`)
    .join("\n");
  const prompt = `LESSON: ${lesson.meta.title} (level: ${lesson.meta.level})
CHAPTER ${index + 1} OF ${plan.length}: ${chapter.title}
WHAT THIS CHAPTER COVERS: ${chapter.brief}
${section ? `LESSON CONTENT FOR THIS CHAPTER:\n${section.title}\n${section.body}\n` : `KEY POINTS OF THE LESSON:\n${lesson.revisionSheet.keyPoints.join("\n")}\n`}${plan.length > 6 ? `WORKED EXAMPLES YOU MAY TALK THROUGH:\n${examples}\n` : ""}${previousEnding ? `THE PREVIOUS CHAPTER ENDED WITH: "${previousEnding}"\n` : ""}
LENGTH: about ${target} words (chapter ${index + 1} of a ${lesson.meta.durationMin}-minute lesson).`;

  return { system, prompt, target };
}

/** Step 2: write one chapter. Falls back to the chapter's brief if the AI reply is unusable. */
export async function generateChapter(
  lesson: Lesson,
  plan: ChapterPlan[],
  index: number,
  previousEnding: string,
  generate: Generate,
  signal?: AbortSignal,
): Promise<AudioChapter> {
  const { system, prompt, target } = buildChapterPrompt(lesson, plan, index, previousEnding);
  let text = "";
  for (let attempt = 0; attempt < 2 && !text; attempt++) {
    const reply = await generate({ system, prompt, signal, temperature: 0.6 });
    try {
      const clean = cleanForSpeech(NarrationReplySchema.parse(parseJsonReply(reply)).text);
      // Far too short means the model ignored the brief; try once more.
      if (wordCount(clean) >= target * 0.4 || attempt === 1) text = clean;
    } catch {
      // Unusable reply: retry once, then fall back to the brief below.
    }
  }
  const chapter = plan[index];
  return {
    id: chapter.id,
    title: chapter.title,
    text: text || cleanForSpeech(chapter.brief),
    sectionId: chapter.sectionId,
  };
}
