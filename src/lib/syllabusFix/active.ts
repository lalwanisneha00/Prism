/*
 * Retired chapters and topics (syllabus fix: soft delete) stay in the data so saved progress and
 * lookups by id keep working, but lists, maps, search, plans and mock tests skip them. Small and
 * dependency-free on purpose: browser code uses it without loading the whole catalogue.
 */

type Node = { status?: "active" | "retired" };
type ChapterLike = Node & { topics: readonly Node[] };

/** The chapters still taught, each with only its topics still taught (empty chapters dropped). */
export function activeChapters<C extends ChapterLike>(subject: { chapters: readonly C[] }): C[] {
  const out: C[] = [];
  for (const c of subject.chapters) {
    if (c.status === "retired") continue;
    const retiredTopics = c.topics.some((t) => t.status === "retired");
    const chapter = retiredTopics
      ? { ...c, topics: c.topics.filter((t) => t.status !== "retired") }
      : c;
    if (chapter.topics.length > 0) out.push(chapter);
  }
  return out;
}
