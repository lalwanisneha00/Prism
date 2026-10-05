import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/storage/db";
import { getSettings, updateSettings } from "@/lib/storage/progress";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("updateSettings", () => {
  it("keeps every change when several are made at once", async () => {
    await Promise.all([
      updateSettings({ semester: 3 }),
      updateSettings({ mySubjects: { "3": ["applied-physics"] } }),
      updateSettings({ branch: "me" }),
      updateSettings({ universityName: "Test University" }),
    ]);
    const s = await getSettings();
    expect(s?.semester).toBe(3);
    expect(s?.mySubjects).toEqual({ "3": ["applied-physics"] });
    expect(s?.branch).toBe("me");
    expect(s?.universityName).toBe("Test University");
  });

  it("applies later changes on top of earlier ones, in order", async () => {
    await Promise.all([
      updateSettings({ mySubjects: { "1": ["a"] } }),
      updateSettings({ mySubjects: { "1": ["a", "b"] } }),
    ]);
    expect((await getSettings())?.mySubjects).toEqual({ "1": ["a", "b"] });
  });
});
