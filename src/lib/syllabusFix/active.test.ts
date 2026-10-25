import { describe, expect, it } from "vitest";
import { activeChapters } from "./active";

describe("activeChapters", () => {
  it("leaves out retired chapters and topics, and chapters left empty", () => {
    type T = { id: string; status?: "active" | "retired" };
    type C = T & { topics: T[] };
    const subject: { chapters: C[] } = {
      chapters: [
        { id: "a", topics: [{ id: "1" }, { id: "2", status: "retired" }] },
        { id: "b", status: "retired", topics: [{ id: "3" }] },
        { id: "c", topics: [{ id: "4", status: "retired" }] },
      ],
    };
    expect(activeChapters(subject).map((c) => [c.id, c.topics.map((t) => t.id)])).toEqual([
      ["a", ["1"]],
    ]);
    // The data itself is untouched (lookups by id still find retired topics).
    expect(subject.chapters[0].topics).toHaveLength(2);
  });
});
