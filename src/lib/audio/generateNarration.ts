import { z } from "zod";
import {
  cleanForSpeech,
  splitSentences,
  WORDS_PER_MINUTE,
  wordCount,
  type AudioChapter,
} from "@/lib/audio/timeline";
import { parseJsonReply } from "@/lib/jsonReply";
import { levelGuides } from "@/lib/prompts/levelGuides";
import type { GenerateOptions } from "@/lib/llm/types";
import type { Lesson } from "@/lib/schema";
import type { LevelSlug } from "@/data/levels";

const NarrationReplySchema = z.object({ text: z.string().min(1) });

/** Words for each chapter so the whole narration fills the student's time budget. */
export function wordsPerChapter(durationMin: number, chapters: number): number {
  return Math.round((durationMin * WORDS_PER_MINUTE) / Math.max(1, chapters));
}

export function buildNarrationPrompt(lesson: Lesson, index: number, previousEnding: string) {
  const outline = lesson.audioScript;
  const chapter = outline[index];
  const section = lesson.sections.find((s) => s.id === chapter.sectionId);
  const target = wordsPerChapter(lesson.meta.durationMin, outline.length);
  const style = levelGuides[lesson.meta.level as LevelSlug].audioStyle;
  const isFirst = index === 0;
  const isLast = index === outline.length - 1;

  const system = `You write narration for an audio lesson that a text-to-speech voice reads aloud to a college student.
Style: ${style}.
Rules:
- Plain spoken English only. No symbols, no LaTeX, no markdown, no bullet points, no headings.
- Say equations in words, e.g. "E equals Q over four pi epsilon nought r squared".
- Short, clear sentences. Use only facts from the lesson content you are given.
- ${isFirst ? "This is the opening chapter: greet the listener briefly and say what they will learn." : "Do not greet the listener again; continue naturally from the previous chapter."}
- ${isLast ? "This is the final chapter: end with a short recap and an encouraging sign-off." : "Do not say goodbye; another chapter follows."}
- Reply with JSON only: {"text": "<the narration>"}.`;

  const prompt = `LESSON: ${lesson.meta.title} (level: ${lesson.meta.level})
CHAPTER ${index + 1} OF ${outline.length}: ${chapter.title}
OUTLINE FOR THIS CHAPTER: ${chapter.text}
${section ? `LESSON CONTENT FOR THIS CHAPTER:\n${section.title}\n${section.body}\n` : `KEY POINTS OF THE LESSON:\n${lesson.revisionSheet.keyPoints.join("\n")}\n`}${previousEnding ? `THE PREVIOUS CHAPTER ENDED WITH: "${previousEnding}"\n` : ""}
LENGTH: about ${target} words (the student chose a ${lesson.meta.durationMin}-minute lesson).`;

  return { system, prompt, target };
}

/**
 * Writes the full narration chapter by chapter (SPEC §7: outline first, then each chapter
 * separately), calling `onChapter` as each one is ready so playback can start early.
 */
export async function generateNarration(
  lesson: Lesson,
  generate: (options: GenerateOptions) => Promise<string>,
  onChapter: (index: number, chapter: AudioChapter) => void,
  signal?: AbortSignal,
): Promise<AudioChapter[]> {
  const chapters: AudioChapter[] = [];
  let previousEnding = "";

  for (let i = 0; i < lesson.audioScript.length; i++) {
    const outline = lesson.audioScript[i];
    const { system, prompt, target } = buildNarrationPrompt(lesson, i, previousEnding);

    let text = "";
    for (let attempt = 0; attempt < 2 && !text; attempt++) {
      const reply = await generate({ system, prompt, signal, temperature: 0.6 });
      try {
        const parsed = NarrationReplySchema.parse(parseJsonReply(reply));
        const clean = cleanForSpeech(parsed.text);
        // Far too short means the model ignored the brief; try once more.
        if (wordCount(clean) >= target * 0.4 || attempt === 1) text = clean;
      } catch {
        // Unusable reply: retry once, then fall back to the outline below.
      }
    }

    const chapter: AudioChapter = {
      id: outline.id,
      title: outline.title,
      text: text || cleanForSpeech(outline.text),
      sectionId: outline.sectionId,
    };
    chapters.push(chapter);
    onChapter(i, chapter);
    previousEnding = splitSentences(chapter.text).slice(-2).join(" ");
  }
  return chapters;
}
