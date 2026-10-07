import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { findSubject } from "@/lib/subjects";
import { loadGoldenSets } from "./golden";
import { lessonText, normalizeForMatch, quotedShare, tierForScore } from "./score";

const sets = loadGoldenSets();
// Golden sets for the PDEU catalogue are written later (the old ones are in eval/archive-pre-pdeu).
describe("golden sets", () => {
  it("only use real topics, with patterns that compile", () => {
    for (const set of sets) {
      const subject = findSubject(set.subject);
      expect(subject, set.subject).toBeDefined();
      const topics = new Map(subject!.chapters.flatMap((c) => c.topics.map((t) => [t.id, c.id])));
      for (const t of set.topics) {
        expect(topics.get(t.topic), `${set.subject}/${t.topic}`).toBe(t.chapter);
        const ids = t.facts.map((f) => f.id);
        expect(new Set(ids).size, `${set.subject}/${t.topic} fact ids`).toBe(ids.length);
        for (const f of t.facts) expect(() => new RegExp(f.pattern, "i")).not.toThrow();
      }
    }
  });

  it("give every fact a source quote", () => {
    for (const set of sets) {
      const share = quotedShare(set);
      expect(share.quoted, set.subject).toBe(share.total);
      expect(tierForScore(90, { topics: set.topics.length, ...share }), set.subject).toBeDefined();
    }
  });

  it("don't count facts that an unrelated lesson (Gauss's law) would already 'state'", () => {
    const text = normalizeForMatch(lessonText(sampleLessons[0]));
    const loose: string[] = [];
    for (const set of sets) {
      for (const t of set.topics) {
        for (const f of t.facts)
          if (new RegExp(f.pattern, "i").test(text))
            loose.push(`${set.subject}/${t.topic}/${f.id}`);
      }
    }
    expect(loose).toEqual([]);
  });
});
