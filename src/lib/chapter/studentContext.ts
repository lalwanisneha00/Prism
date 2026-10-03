import { paperStats, type LoadInput } from "@/lib/chapter/estimate";
import { confusedTopics, listAllAnnotations } from "@/lib/annotations/store";
import { sectionText } from "@/lib/extract/types";
import { findRelevantPassages, listLocalNotes } from "@/lib/notes/store";
import { listQuizAttempts, weakTopics } from "@/lib/storage/progress";
import type { Subject, Topic } from "@/lib/subjects";

/*
 * What this student's own data says about a chapter (all read on this device): topics they
 * already did well in, weak topics, their uploaded previous-year papers and how much of
 * their material covers it. Missing data simply means that factor isn't used.
 */
export async function studentContext(
  subject: Subject,
  topics: readonly Topic[],
): Promise<Pick<LoadInput, "completed" | "weak" | "papers" | "materialPassages">> {
  const ids = new Set(topics.map((t) => t.id));
  const [attempts, annotations, notes] = await Promise.all([
    listQuizAttempts().catch(() => []),
    listAllAnnotations().catch(() => []),
    listLocalNotes().catch(() => []),
  ]);
  const mine = attempts.filter((a) => a.subject === subject.id && ids.has(a.topic));

  const weak = new Set([
    ...weakTopics(mine).map((a) => a.topic),
    ...confusedTopics(annotations)
      .map((c) => c.topic)
      .filter((t) => ids.has(t)),
  ]);
  const completed = new Set(
    mine
      .filter((a) => a.total > 0 && a.score / a.total >= 0.6 && !weak.has(a.topic))
      .map((a) => a.topic),
  );

  const papers = notes.filter(
    (n) => n.kind === "pyq" && (!n.subject || n.subject === subject.id) && n.sections?.length,
  );
  const excludedText = (n: (typeof papers)[number]) => {
    const out = new Set(n.excluded ?? []);
    return (n.sections ?? [])
      .filter((s) => !out.has(s.index))
      .map(sectionText)
      .join("\n");
  };
  const query = topics.map((t) => t.name).join(" ");
  const passages = await findRelevantPassages(query, 40, subject.id).catch(() => []);

  return {
    completed,
    weak,
    ...(papers.length > 0
      ? { papers: paperStats(papers.map(excludedText), topics, subject.chapters) }
      : {}),
    materialPassages: passages.length,
  };
}
