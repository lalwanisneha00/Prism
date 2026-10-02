import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { exportBackup, importBackup } from "@/lib/storage/backup";
import { resetDbForTests } from "@/lib/storage/db";
import { listRecent, listSavedLessons, recordRecent, saveLesson } from "@/lib/storage/library";
import { listQuizAttempts, recordQuizAttempt, weakTopics } from "@/lib/storage/progress";
import { clearLocalData, listOutbox } from "@/lib/storage/records";

const recent = {
  subject: "em",
  chapter: "electrostatics",
  topic: "gauss-law",
  level: "first-encounter",
  duration: 10,
  title: "Gauss's law",
  chapterName: "Electrostatics",
};
const quiz = (topic: string, score: number) => ({
  lessonId: `em:${topic}:first-encounter:10`,
  subject: "em",
  chapter: "c",
  topic,
  level: "first-encounter",
  duration: 10,
  title: topic,
  score,
  total: 5,
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("backup", () => {
  it("exports everything and restores it on an empty device", async () => {
    await saveLesson(sampleLessons[0], 1000);
    await recordRecent(recent, 2000);
    await recordQuizAttempt(quiz("gauss-law", 2), 3000);
    const backup = JSON.parse(JSON.stringify(await exportBackup()));

    await clearLocalData();
    expect(await listSavedLessons()).toEqual([]);

    const result = await importBackup(backup);
    expect(result).toEqual({ added: 3, updated: 0, skipped: 0 });
    expect((await listSavedLessons())[0].lesson.meta.title).toBe("Gauss's law");
    expect((await listRecent())[0].title).toBe("Gauss's law");
    expect(await listQuizAttempts()).toHaveLength(1);
    expect((await listOutbox()).length).toBe(3); // queued to sync
  });

  it("keeps newer data on the device", async () => {
    await recordRecent({ ...recent, title: "old" }, 1000);
    const backup = JSON.parse(JSON.stringify(await exportBackup()));
    await recordRecent({ ...recent, title: "new" }, 5000);
    expect(await importBackup(backup)).toMatchObject({ skipped: 1 });
    expect((await listRecent())[0].title).toBe("new");
  });

  it("rejects files that aren't Prism backups and skips broken records", async () => {
    await expect(importBackup({ hello: "world" })).rejects.toThrow(/isn't a Prism backup/);
    const result = await importBackup({
      app: "prism",
      version: 2,
      collections: {
        recentTopics: [{ id: "x" }],
        savedLessons: [
          { id: "y", updatedAt: 1, deleted: false, savedAt: 1, lesson: { nope: true } },
        ],
      },
    });
    expect(result).toEqual({ added: 0, updated: 0, skipped: 2 });
  });
});

describe("weak topics", () => {
  it("uses each topic's latest score and lists the weakest first", async () => {
    await recordQuizAttempt(quiz("gauss-law", 1), 1);
    await recordQuizAttempt(quiz("gauss-law", 5), 2); // improved since
    await recordQuizAttempt(quiz("lenz", 2), 3);
    await recordQuizAttempt(quiz("ohm", 1), 4);
    expect(weakTopics(await listQuizAttempts()).map((a) => a.topic)).toEqual(["ohm", "lenz"]);
  });
});
