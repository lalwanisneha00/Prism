import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { makeAnchor } from "@/lib/annotations/anchor";
import {
  addBlockNote,
  addHighlight,
  confusedTopics,
  listAllAnnotations,
  listForLesson,
  saveAnnotation,
} from "@/lib/annotations/store";
import { resetDbForTests } from "@/lib/storage/db";
import { lessonId } from "@/lib/storage/library";
import { listOutbox } from "@/lib/storage/records";
import { exportBackup, importBackup } from "@/lib/storage/backup";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

const lesson = sampleLessons[0];
const text = "Gauss's law relates the flux through a closed surface to the enclosed charge.";
const block = { block: "section:intro", sectionId: "intro", text };
const at = (word: string) => {
  const start = text.indexOf(word);
  return makeAnchor(text, start, start + word.length);
};

describe("annotation store", () => {
  it("saves highlights per lesson, synced through the outbox", async () => {
    await addHighlight(lesson, { ...block, anchor: at("closed surface") }, "important", [], 1);
    const mine = await listForLesson(lessonId(lesson.meta));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      color: "important",
      anchor: { quote: "closed surface" },
      topic: "gauss-law",
    });
    expect((await listOutbox()).map((e) => e.collection)).toEqual(["annotations"]);
  });

  it("merges same-colour overlaps and keeps their comments", async () => {
    const first = await addHighlight(
      lesson,
      { ...block, anchor: at("flux through") },
      "exam",
      [],
      1,
    );
    await saveAnnotation({ ...first, comment: "asked in 2024" }, 2);
    const merged = await addHighlight(
      lesson,
      { ...block, anchor: at("through a closed") },
      "exam",
      await listAllAnnotations(),
      3,
    );
    expect(merged.anchor?.quote).toBe("flux through a closed");
    expect(merged.comment).toBe("asked in 2024");
    expect(await listAllAnnotations()).toHaveLength(1);
  });

  it("splits a highlight when another colour lands in the middle", async () => {
    await addHighlight(
      lesson,
      { ...block, anchor: at("the flux through a closed surface") },
      "important",
      [],
      1,
    );
    await addHighlight(
      lesson,
      { ...block, anchor: at("through") },
      "confused",
      await listAllAnnotations(),
      2,
    );
    const quotes = (await listAllAnnotations()).map((a) => `${a.color}:${a.anchor?.quote}`).sort();
    expect(quotes).toEqual([
      "confused:through",
      "important: a closed surface",
      "important:the flux ",
    ]);
  });

  it("block notes, the weak-topic feed and backups", async () => {
    await addBlockNote(lesson, "example:0", undefined, "Redo this one", 1);
    await addHighlight(
      lesson,
      { ...block, anchor: at("enclosed charge") },
      "confused",
      await listAllAnnotations(),
      2,
    );
    expect(confusedTopics(await listAllAnnotations())).toMatchObject([
      { topic: "gauss-law", count: 1 },
    ]);
    const backup = await exportBackup();
    expect(backup.collections.annotations).toHaveLength(2);
    globalThis.indexedDB = new IDBFactory();
    resetDbForTests();
    expect((await importBackup(backup)).added).toBe(2);
    expect(await listAllAnnotations()).toHaveLength(2);
  });
});
