import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { sampleLessons } from "@/data/sampleLessons";
import { getDb, resetDbForTests } from "@/lib/storage/db";
import {
  clearRecent,
  getSavedLesson,
  lessonId,
  listRecent,
  listSavedLessons,
  recordRecent,
  saveLesson,
  unsaveLesson,
} from "@/lib/storage/library";

const lesson = sampleLessons[0];
const other = {
  ...lesson,
  meta: { ...lesson.meta, level: "last-minute" as const, durationMin: 5 },
};

beforeEach(() => {
  // A brand-new, empty database for every test.
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("saved lessons", () => {
  it("saves, finds and lists lessons, newest first", async () => {
    await saveLesson(lesson, 1000);
    await saveLesson(other, 2000);
    expect((await getSavedLesson(lessonId(lesson.meta)))?.lesson.meta.title).toBe("Gauss's law");
    expect((await listSavedLessons()).map((r) => r.lesson.meta.level)).toEqual([
      "last-minute",
      "first-encounter",
    ]);
  });

  it("keeps one copy per topic, level and duration", async () => {
    await saveLesson(lesson, 1000);
    await saveLesson(lesson, 3000);
    expect(await listSavedLessons()).toHaveLength(1);
    expect(lessonId(lesson.meta)).toBe("em:gauss-law:first-encounter:10");
  });

  it("removes by tombstone, so the deletion can sync later", async () => {
    await saveLesson(lesson, 1000);
    await unsaveLesson(lessonId(lesson.meta), 5000);
    expect(await getSavedLesson(lessonId(lesson.meta))).toBeUndefined();
    expect(await listSavedLessons()).toEqual([]);
    const raw = await (await getDb()).get("savedLessons", lessonId(lesson.meta));
    expect(raw).toMatchObject({ deleted: true, updatedAt: 5000 });
  });

  it("can save again after removing", async () => {
    await saveLesson(lesson, 1000);
    await unsaveLesson(lessonId(lesson.meta), 2000);
    await saveLesson(lesson, 3000);
    expect(await getSavedLesson(lessonId(lesson.meta))).toBeDefined();
  });
});

describe("recent topics", () => {
  const entry = (topic: string) => ({
    subject: "em",
    chapter: "electrostatics",
    topic,
    level: "first-encounter",
    duration: 10,
    title: topic,
    chapterName: "Electrostatics",
  });

  it("lists the most recent first, without duplicates", async () => {
    await recordRecent(entry("gauss-law"), 1);
    await recordRecent(entry("electric-flux"), 2);
    await recordRecent(entry("gauss-law"), 3);
    expect((await listRecent()).map((r) => r.topic)).toEqual(["gauss-law", "electric-flux"]);
  });

  it("limits the list and can be cleared", async () => {
    for (let i = 0; i < 8; i++) await recordRecent(entry(`t${i}`), i);
    expect(await listRecent(6)).toHaveLength(6);
    await clearRecent(100);
    expect(await listRecent()).toEqual([]);
  });

  it("stores every record with sync-ready fields", async () => {
    await recordRecent(entry("gauss-law"), 42);
    const [r] = await listRecent();
    expect(r).toMatchObject({ id: "em:gauss-law", updatedAt: 42, deleted: false });
  });
});
