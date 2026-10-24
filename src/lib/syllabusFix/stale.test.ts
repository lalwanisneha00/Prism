import { describe, expect, it } from "vitest";
import { isLessonStale, markStale, staleTopics, type StaleTopics } from "@/lib/syllabusFix/stale";

const empty: StaleTopics = { version: 1, topics: {} };

describe("stale topics", () => {
  it("the shipped map is valid", () => {
    expect(staleTopics.version).toBe(1);
  });

  it("a topic that never changed is never stale", () => {
    expect(isLessonStale(empty, "s", "t", "2026-01-01T00:00:00.000Z")).toBe(false);
    expect(isLessonStale(empty, "s", "t", undefined)).toBe(false);
  });

  it("a lesson made before the change is stale, one made after is not", () => {
    const map = markStale(empty, [{ subject: "s", topic: "t" }], "2026-10-25T00:00:00.000Z");
    expect(isLessonStale(map, "s", "t", "2026-10-24T23:59:59.000Z")).toBe(true);
    expect(isLessonStale(map, "s", "t", "2026-10-25T00:00:01.000Z")).toBe(false);
    expect(isLessonStale(map, "s", "other", "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("an unknown or unreadable creation time counts as stale once the topic changed", () => {
    const map = markStale(empty, [{ subject: "s", topic: "t" }]);
    expect(isLessonStale(map, "s", "t", undefined)).toBe(true);
    expect(isLessonStale(map, "s", "t", "yesterday")).toBe(true);
  });

  it("markStale does not change the map it was given", () => {
    markStale(empty, [{ subject: "s", topic: "t" }]);
    expect(empty.topics).toEqual({});
  });
});
