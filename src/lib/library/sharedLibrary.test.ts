import { PROMPT_VERSION } from "@/lib/prompts/lessonPrompt";
import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { gunzipJson, gzipJson } from "@/lib/compress";
import {
  libraryKey,
  libraryUsage,
  readFromLibrary,
  writeToLibrary,
  type LibraryDoc,
  type LibraryStore,
} from "@/lib/library/sharedLibrary";

function memoryStore(): LibraryStore & { docs: Map<string, LibraryDoc> } {
  const docs = new Map<string, LibraryDoc>();
  return {
    docs,
    get: async (key) => docs.get(key) ?? null,
    set: async (key, doc) => void docs.set(key, doc),
  };
}

const lesson = sampleLessons[0];

describe("compression", () => {
  it("round-trips JSON and makes lessons much smaller", async () => {
    const gz = await gzipJson(lesson);
    expect(await gunzipJson(gz)).toEqual(lesson);
    expect(gz.byteLength).toBeLessThan(JSON.stringify(lesson).length / 2.5);
  });
});

describe("shared library", () => {
  it("keys lessons by subject, topic, level and duration", () => {
    expect(libraryKey(lesson.meta)).toBe("em_gauss-law_first-encounter_10");
  });

  it("stores a lesson once and reads it back intact", async () => {
    const store = memoryStore();
    expect(await writeToLibrary(store, lesson)).toBe(true);
    const doc = store.docs.get("em_gauss-law_first-encounter_10")!;
    expect(doc).toMatchObject({ topic: "gauss-law", level: "first-encounter", durationMin: 10 });
    expect(await readFromLibrary(store, "em_gauss-law_first-encounter_10")).toEqual(lesson);
  });

  it("records tier, sources and prompt version, and treats older prompts as stale", async () => {
    const store = memoryStore();
    await writeToLibrary(store, lesson);
    const key = libraryKey(lesson.meta);
    const doc = store.docs.get(key)!;
    expect(doc.promptVersion).toBe(PROMPT_VERSION);
    expect(doc.sourceIds).toEqual(lesson.meta.sources.map((s) => s.id));
    store.docs.set(key, { ...doc, promptVersion: "2025-01-01.1" });
    expect(await readFromLibrary(store, key)).toBeNull();
  });

  it("returns null for a missing or broken entry", async () => {
    const store = memoryStore();
    expect(await readFromLibrary(store, "nope")).toBeNull();
    store.docs.set("bad", { ...({} as LibraryDoc), lessonGz: await gzipJson({ not: "a lesson" }) });
    expect(await readFromLibrary(store, "bad")).toBeNull();
  });

  it("counts reads and writes for the usage page", async () => {
    const before = { ...libraryUsage };
    const store = memoryStore();
    await writeToLibrary(store, lesson);
    await readFromLibrary(store, libraryKey(lesson.meta));
    expect(libraryUsage.writes).toBe(before.writes + 1);
    expect(libraryUsage.reads).toBe(before.reads + 1);
  });
});
