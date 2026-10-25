import { describe, expect, it } from "vitest";
import {
  aliases,
  canonicalChapter,
  canonicalSubject,
  canonicalTopic,
  type Aliases,
} from "@/lib/syllabusFix/alias";
import { findSubject } from "@/lib/subjects";
import { topicKey } from "@/lib/priority/model";

const map: Aliases = {
  version: 1,
  subjects: { "iks-petro": "iks" },
  chapters: { "iks-petro/intro": "iks/introduction" },
  topics: { "iks-petro/vedas": "iks/vedas", "iks-petro/calendar": "iks/indian-calendar" },
};

describe("course aliases", () => {
  it("sends a retired copy to its main copy and leaves other ids alone", () => {
    expect(canonicalSubject("iks-petro", map)).toBe("iks");
    expect(canonicalSubject("iks", map)).toBe("iks");
    expect(canonicalSubject("maths", map)).toBe("maths");
  });

  it("moves topics and chapters, even when the main copy names them differently", () => {
    expect(canonicalTopic("iks-petro", "calendar", map)).toEqual({
      subject: "iks",
      topic: "indian-calendar",
    });
    expect(canonicalChapter("iks-petro", "intro", map)).toEqual({
      subject: "iks",
      chapter: "introduction",
    });
  });

  it("keeps a topic with no counterpart where it was (it still resolves in the retired copy)", () => {
    expect(canonicalTopic("iks-petro", "only-here", map)).toEqual({
      subject: "iks-petro",
      topic: "only-here",
    });
  });

  it("every shipped alias points at an active course and an existing topic", () => {
    for (const [from, to] of Object.entries(aliases.subjects)) {
      expect(findSubject(from)?.status, from).toBe("retired");
      expect(findSubject(to)?.status ?? "active", to).toBe("active");
    }
    for (const to of Object.values(aliases.topics)) {
      const [s, t] = to.split("/");
      const topics = findSubject(s)?.chapters.flatMap((c) => c.topics) ?? [];
      expect(
        topics.some((x) => x.id === t),
        to,
      ).toBe(true);
    }
  });

  it("weak topics and mock results join through the alias", () => {
    const [from, to] = Object.entries(aliases.topics)[0] ?? [];
    if (!from || !to) return;
    const [s, t] = from.split("/");
    expect(topicKey(s, t)).toBe(to);
  });
});
