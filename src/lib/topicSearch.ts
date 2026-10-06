import { chaptersOf, type Chapter, type Subject, type Topic } from "@/lib/subjects";

/** `owner` is the subject a chapter belongs to (different from the searched one for linked chapters). */
export type TopicMatch = { chapter: Chapter; topic: Topic; owner?: Subject };

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

/** Edit distance between two short words (insert, delete, replace, swap of neighbours). */
export function editDistance(a: string, b: string): number {
  const prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, (prev2[j - 2] ?? 99) + 1);
      }
      row[j] = v;
    }
    prev2.splice(0, prev2.length, ...prev);
    prev = row;
  }
  return prev[b.length];
}

/** How many slips a word of this length may have: none for short words, one, then two. */
function tolerance(word: string): number {
  return word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0;
}

/** True when the word is (nearly) the start of, or the same as, any word of the text: "capaciter" ~ "capacitor". */
export function looselyMatches(word: string, text: string): boolean {
  const tol = tolerance(word);
  if (tol === 0) return false;
  return text.split(" ").some((tw) => {
    if (tw.length < 3) return false;
    return (
      editDistance(word, tw) <= tol ||
      (tw.length > word.length && editDistance(word, tw.slice(0, word.length)) <= tol)
    );
  });
}

/**
 * 3: starts with the query · 2: every word starts a word · 1: every word appears ·
 * 0.5: every word appears or is a close spelling · 0: no match.
 */
export function matchScore(query: string, words: string[], name: string, context = ""): number {
  const both = `${name} ${context}`;
  if (words.every((w) => both.includes(w))) {
    if (name.startsWith(query)) return 3;
    const nameWords = name.split(" ");
    if (words.every((w) => nameWords.some((n) => n.startsWith(w)))) return 2;
    return 1;
  }
  return words.every((w) => both.includes(w) || looselyMatches(w, both)) ? 0.5 : 0;
}

/**
 * Finds topics whose name (or chapter name) contains every word typed, forgiving capital letters
 * and small spelling slips, and including chapters linked in from other subjects.
 * Results keep syllabus order within the same score.
 */
export function searchTopics(subject: Subject, rawQuery: string, limit = 8): TopicMatch[] {
  const query = normalize(rawQuery);
  if (!query) return [];
  const words = query.split(" ");

  return chaptersOf(subject)
    .flatMap(({ chapter, owner }) =>
      chapter.topics.map((topic) => ({
        chapter,
        topic,
        owner,
        score: matchScore(query, words, normalize(topic.name), normalize(chapter.name)),
      })),
    )
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ chapter, topic, owner }) => ({ chapter, topic, owner }));
}
