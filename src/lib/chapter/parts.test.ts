import { describe, expect, it } from "vitest";
import {
  ChapterPartsSchema,
  chapterPrompt,
  CHAPTER_PROMPT_VERSION,
  fakeParts,
  orderedBridges,
  partsKey,
  readParts,
  topicDuration,
  writeParts,
} from "@/lib/chapter/parts";
import { findLevel } from "@/data/levels";
import type { LibraryDoc, LibraryStore } from "@/lib/library/sharedLibrary";
import { findSubject } from "@/lib/subjects";

const em = findSubject("em")!;
const chapter = em.chapters.find((c) => c.id === "electrostatics")!;
const order = chapter.topics.slice(0, 3);

function memoryStore(): LibraryStore & { docs: Map<string, LibraryDoc> } {
  const docs = new Map<string, LibraryDoc>();
  return {
    docs,
    get: async (k) => docs.get(k) ?? null,
    set: async (k, d) => void docs.set(k, d),
  };
}

describe("chapter lesson parts", () => {
  it("rounds a topic's minutes to the nearest lesson length", () => {
    expect([3, 7, 8, 12, 20, 40, 75].map(topicDuration)).toEqual([5, 5, 10, 10, 15, 45, 60]);
  });

  it("keys the library by chapter, level, minutes and topic list", () => {
    const a = partsKey({
      subject: "em",
      chapter: "c",
      level: "l",
      minutes: 45,
      topics: ["a", "b"],
    });
    const b = partsKey({
      subject: "em",
      chapter: "c",
      level: "l",
      minutes: 45,
      topics: ["b", "a"],
    });
    expect(a).toMatch(/^chapter_em_c_l_45_/);
    expect(a).not.toBe(b);
  });

  it("fills missing bridges with a plain sentence, in lesson order", () => {
    const parts = fakeParts(chapter, order);
    parts.bridges = [parts.bridges[1]];
    const bridges = orderedBridges(parts, order);
    expect(bridges.map((b) => `${b.from}>${b.to}`)).toEqual([
      `${order[0].id}>${order[1].id}`,
      `${order[1].id}>${order[2].id}`,
    ]);
    expect(bridges[0].text).toContain(order[1].name);
    expect(bridges[1].text).toContain("test bridge");
  });

  it("tells the AI not to add facts and lists the topics with ids", () => {
    const { system, prompt } = chapterPrompt({
      subject: em,
      chapter,
      level: findLevel("first-encounter")!,
      topics: order.map((topic) => ({ topic, minutes: 10 })),
    });
    expect(system).toContain("Do NOT teach new facts");
    expect(prompt).toContain(`(id: ${order[0].id}, 10 min)`);
    expect(ChapterPartsSchema.safeParse(fakeParts(chapter, order)).success).toBe(true);
  });

  it("caches parts in the shared library and ignores ones from an older prompt", async () => {
    const store = memoryStore();
    const parts = fakeParts(chapter, order);
    const meta = {
      subject: "em",
      chapter: chapter.id,
      level: "exam-prep",
      minutes: 30,
      title: "x",
    };
    await writeParts(store, "k", parts, meta);
    expect(await readParts(store, "k")).toEqual(parts);
    expect(store.docs.get("k")?.promptVersion).toBe(CHAPTER_PROMPT_VERSION);
    store.docs.set("k", { ...store.docs.get("k")!, promptVersion: "old" });
    expect(await readParts(store, "k")).toBeNull();
  });
});
