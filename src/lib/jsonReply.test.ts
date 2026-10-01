import { describe, expect, it } from "vitest";
import { extractCompleteArrayItems, parseJsonReply } from "@/lib/jsonReply";

describe("parseJsonReply", () => {
  it("parses plain JSON", () => {
    expect(parseJsonReply('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores code fences and chatter", () => {
    expect(parseJsonReply('Sure!\n```json\n{"a":[1,2]}\n```\nHope that helps')).toEqual({
      a: [1, 2],
    });
  });

  it("explains when there is no JSON", () => {
    expect(() => parseJsonReply("I can't help with that")).toThrow(/no JSON object/);
  });
});

describe("extractCompleteArrayItems", () => {
  const full = JSON.stringify({
    hook: "x",
    sections: [
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
      { id: "b", body: "second" },
    ],
    quiz: [{ id: "not-a-section" }],
  });

  it("returns every finished item", () => {
    expect(extractCompleteArrayItems(full, "sections")).toEqual([
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
      { id: "b", body: "second" },
    ]);
  });

  it("returns only the items finished so far while streaming", () => {
    const cut = full.indexOf('"second"');
    expect(extractCompleteArrayItems(full.slice(0, cut), "sections")).toEqual([
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
    ]);
  });

  it("returns nothing before the array starts", () => {
    expect(extractCompleteArrayItems('{"hook":"x","secti', "sections")).toEqual([]);
  });
});
