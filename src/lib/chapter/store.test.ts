import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  chapterLessonId,
  getChapterLesson,
  listChapterLessons,
  openChapterLesson,
  saveChapterParts,
  saveChapterProgress,
  saveTopicLesson,
} from "@/lib/chapter/store";
import { findSampleLesson } from "@/data/sampleLessons";
import { resetDbForTests } from "@/lib/storage/db";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

const key = {
  subject: "em",
  chapter: "electrostatics",
  level: "first-encounter",
  minutes: 30,
  order: [
    { id: "electric-flux", minutes: 12 },
    { id: "gauss-law", minutes: 18 },
  ],
  notes: false,
};

describe("chapter lesson store", () => {
  it("gives a different id when the plan or notes change", () => {
    const a = chapterLessonId(key);
    expect(chapterLessonId({ ...key, order: [...key.order].reverse() })).not.toBe(a);
    expect(chapterLessonId({ ...key, notes: true })).toBe(`${a}:notes`);
  });

  it("keeps parts, finished topics and the reading position across visits", async () => {
    const lesson = findSampleLesson("gauss-law", "first-encounter");
    if (!lesson) throw new Error("sample lesson missing");
    const first = await openChapterLesson(key, 1);
    expect(first.lessons).toEqual({});
    await saveChapterParts(first.id, { intro: "x" }, 2);
    await saveTopicLesson(first.id, "gauss-law", lesson, "lib-key", 3);
    await saveChapterProgress(first.id, { position: "gauss-law", done: "electric-flux" }, 4);
    await saveChapterProgress(first.id, { done: "electric-flux" }, 5);

    const again = await openChapterLesson(key, 9);
    expect(again).toMatchObject({
      parts: { intro: "x" },
      position: "gauss-law",
      done: ["electric-flux"],
      updatedAt: 5,
      createdAt: 1,
    });
    expect(again.lessons["gauss-law"].libraryKey).toBe("lib-key");
    expect((await listChapterLessons()).map((r) => r.id)).toEqual([first.id]);
    expect(await getChapterLesson("missing")).toBeUndefined();
  });
});
