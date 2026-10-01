/*
 * Audio lessons are read aloud one sentence at a time. Knowing every sentence's
 * (estimated) start time lets the player highlight text, skip ±15 s and resume.
 */

export const WORDS_PER_MINUTE = 140;

export type AudioChapter = { id: string; title: string; text: string; sectionId?: string };

export type TimelineItem = {
  chapter: number;
  text: string;
  /** Estimated seconds at 1× speed. */
  start: number;
  duration: number;
};

/** Removes anything a voice would read badly: markdown, LaTeX, stray symbols. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\$\$?[^$]*\$\$?/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[*_#`>|{}[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits narration into sentences, keeping abbreviations like "e.g." and decimals intact. */
export function splitSentences(text: string): string[] {
  const clean = cleanForSpeech(text);
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)|[^.!?]*\d\.\d[^.!?]*[.!?]?/g) ?? [clean];
  // Re-join pieces that were split after very short fragments ("e.g.", "Fig.") or numbers.
  const sentences: string[] = [];
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    const prev = sentences[sentences.length - 1];
    if (
      prev &&
      (prev.split(" ").length < 3 || /\b(e\.g|i\.e|etc|vs|Dr|Mr|Ms|Fig)\.$/i.test(prev))
    ) {
      sentences[sentences.length - 1] = `${prev} ${raw}`;
    } else {
      sentences.push(raw);
    }
  }
  return sentences;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function estimateSeconds(text: string, rate = 1): number {
  return ((wordCount(text) / WORDS_PER_MINUTE) * 60) / rate;
}

export function buildTimeline(chapters: AudioChapter[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let t = 0;
  chapters.forEach((ch, chapter) => {
    for (const text of splitSentences(ch.text)) {
      const duration = estimateSeconds(text);
      items.push({ chapter, text, start: t, duration });
      t += duration;
    }
  });
  return items;
}

export function totalSeconds(timeline: TimelineItem[]): number {
  const last = timeline[timeline.length - 1];
  return last ? last.start + last.duration : 0;
}

/**
 * The sentence index reached by jumping `delta` seconds from the start of sentence `index`.
 * Playback moves a whole sentence at a time, so a forward skip always advances at least one
 * sentence (otherwise skipping inside a long sentence would appear to do nothing).
 */
export function skip(timeline: TimelineItem[], index: number, delta: number): number {
  if (timeline.length === 0) return 0;
  const last = timeline.length - 1;
  const target = (timeline[index]?.start ?? 0) + delta;
  if (target <= 0) return 0;
  const found = timeline.findIndex((item) => item.start + item.duration > target);
  const landed = found === -1 ? last : found;
  return delta > 0 && landed <= index ? Math.min(index + 1, last) : landed;
}

/** Index of the first sentence of a chapter. */
export function chapterStart(timeline: TimelineItem[], chapter: number): number {
  const i = timeline.findIndex((item) => item.chapter === chapter);
  return i === -1 ? 0 : i;
}

/** "4:05" style time. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
