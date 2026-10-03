import { z } from "zod";
import { durations, type DurationMinutes } from "@/data/durations";
import type { Level } from "@/data/levels";
import { gunzipJson, gzipJson } from "@/lib/compress";
import type { LibraryStore } from "@/lib/library/sharedLibrary";
import type { Chapter, Subject, Topic } from "@/lib/subjects";

/*
 * The "glue" of a chapter lesson (V2.5 · Step 4): an introduction (why the chapter matters
 * and how its topics connect), a short bridge from each topic to the next, and a wrap-up.
 * The teaching itself comes from the topic lessons, which keep their own grounding and
 * fact-check; the glue only links them, so it must not add new facts, numbers or formulas.
 */

/** Bump when the chapter prompt changes: older library copies are then rewritten. */
export const CHAPTER_PROMPT_VERSION = "2026-10-04.1";

const md = z.string().trim().min(1).max(2000);

export const ChapterPartsSchema = z.object({
  intro: z.object({ whyItMatters: md, map: md }),
  bridges: z
    .array(z.object({ from: z.string(), to: z.string(), text: z.string().trim().min(1).max(600) }))
    .max(40),
  wrapUp: z.object({
    summary: md,
    keyIdeas: z.array(z.string().trim().min(1).max(300)).min(1).max(10),
  }),
});
export type ChapterParts = z.infer<typeof ChapterPartsSchema>;

/** The topic-lesson length closest to the minutes a topic gets (lessons come in fixed sizes). */
export function topicDuration(minutes: number): DurationMinutes {
  let best: DurationMinutes = durations[0].minutes;
  for (const d of durations) {
    if (Math.abs(d.minutes - minutes) < Math.abs(best - minutes)) best = d.minutes;
  }
  return best;
}

/** A short, stable fingerprint of the topic list, for library keys. */
export function topicsHash(ids: readonly string[]): string {
  let h = 5381;
  for (const ch of ids.join(",")) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

export function partsKey(r: {
  subject: string;
  chapter: string;
  level: string;
  minutes: number;
  topics: readonly string[];
}): string {
  return `chapter_${r.subject}_${r.chapter}_${r.level}_${r.minutes}_${topicsHash(r.topics)}`;
}

/**
 * Bridges in the lesson's order, one between each pair of neighbouring topics. Missing or
 * mismatched ones from the AI are replaced by a plain sentence, so the lesson never breaks.
 */
export function orderedBridges(
  parts: ChapterParts,
  order: readonly Topic[],
): { from: string; to: string; text: string }[] {
  const byPair = new Map(parts.bridges.map((b) => [`${b.from}>${b.to}`, b.text]));
  return order.slice(0, -1).map((t, i) => {
    const next = order[i + 1];
    return {
      from: t.id,
      to: next.id,
      text: byPair.get(`${t.id}>${next.id}`) ?? `Next: **${next.name}**, which builds on this.`,
    };
  });
}

export function chapterPrompt(input: {
  subject: Subject;
  chapter: Chapter;
  level: Level;
  topics: readonly { topic: Topic; minutes: number }[];
}): { system: string; prompt: string } {
  const system = `You write the connecting text of a chapter lesson for an engineering student. The topics are taught separately by other, fact-checked lessons; your job is only to introduce the chapter, link each topic to the next, and wrap up.
Rules:
- Do NOT teach new facts: no formulas, numbers, constants, definitions or claims beyond naming the topics and how they relate. Say how ideas connect, not what they state.
- Level: ${input.level.name}: ${input.level.style}
- Markdown is allowed (bold, short lists). No HTML, no LaTeX.
- Keep it short: "whyItMatters" 2-4 sentences, "map" 2-5 sentences or a short list, each bridge 1-2 sentences, "summary" 2-4 sentences, 3-6 "keyIdeas" as topic-level takeaways phrased as questions the student should now be able to answer.
Reply with JSON only:
{"intro":{"whyItMatters":"...","map":"..."},"bridges":[{"from":"<topic id>","to":"<next topic id>","text":"..."}],"wrapUp":{"summary":"...","keyIdeas":["..."]}}`;
  const list = input.topics
    .map(({ topic, minutes }, i) => `${i + 1}. ${topic.name} (id: ${topic.id}, ${minutes} min)`)
    .join("\n");
  const prompt = `Subject: ${input.subject.name}
Chapter: ${input.chapter.name}
Topics in lesson order:
${list}
Write one bridge for each pair of neighbouring topics, in this order.`;
  return { system, prompt };
}

/** Parts written by the test AI: predictable text built from the topic names. */
export function fakeParts(chapter: Chapter, order: readonly Topic[]): ChapterParts {
  return {
    intro: {
      whyItMatters: `**${chapter.name}** connects the ideas below into one picture (test text).`,
      map: order.map((t, i) => `${i + 1}. ${t.name}`).join("\n"),
    },
    bridges: order.slice(0, -1).map((t, i) => ({
      from: t.id,
      to: order[i + 1].id,
      text: `With ${t.name} in hand, we move on to **${order[i + 1].name}** (test bridge).`,
    })),
    wrapUp: {
      summary: `You have now met every topic of ${chapter.name} (test summary).`,
      keyIdeas: order.slice(0, 4).map((t) => `Can you explain ${t.name} in your own words?`),
    },
  };
}

/* ---------- Shared library (chapter parts are cached like lessons) ---------- */

export async function readParts(store: LibraryStore, key: string): Promise<ChapterParts | null> {
  const doc = await store.get(key);
  if (!doc?.lessonGz || doc.promptVersion !== CHAPTER_PROMPT_VERSION) return null;
  const parsed = ChapterPartsSchema.safeParse(await gunzipJson(doc.lessonGz));
  return parsed.success ? parsed.data : null;
}

export async function writeParts(
  store: LibraryStore,
  key: string,
  parts: ChapterParts,
  meta: { subject: string; chapter: string; level: string; minutes: number; title: string },
): Promise<void> {
  await store.set(key, {
    lessonGz: await gzipJson(parts),
    subject: meta.subject,
    topic: `chapter:${meta.chapter}`,
    level: meta.level,
    durationMin: meta.minutes,
    title: meta.title,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
    promptVersion: CHAPTER_PROMPT_VERSION,
    tier: "sourced",
    sourceIds: [],
  });
}
