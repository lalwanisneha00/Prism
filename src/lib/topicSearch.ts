import type { Chapter, Subject, Topic } from "@/lib/subjects";

export type TopicMatch = { chapter: Chapter; topic: Topic };

/** Lowercase, drop accents and apostrophes, and turn dashes and punctuation into spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Higher is better: the topic name starts with the query, then a word starts with it, then anywhere. */
function score(query: string, words: string[], topicName: string, chapterName: string): number {
  if (!words.every((w) => topicName.includes(w) || chapterName.includes(w))) return 0;
  if (topicName.startsWith(query)) return 3;
  const topicWords = topicName.split(" ");
  if (words.every((w) => topicWords.some((tw) => tw.startsWith(w)))) return 2;
  return 1;
}

/**
 * Finds topics whose name (or chapter name) contains every word typed.
 * Results keep syllabus order within the same score.
 */
export function searchTopics(subject: Subject, rawQuery: string, limit = 8): TopicMatch[] {
  const query = normalize(rawQuery);
  if (!query) return [];
  const words = query.split(" ");

  return subject.chapters
    .flatMap((chapter) =>
      chapter.topics.map((topic) => ({
        chapter,
        topic,
        score: score(query, words, normalize(topic.name), normalize(chapter.name)),
      })),
    )
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chapter, topic }) => ({ chapter, topic }));
}
