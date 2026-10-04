import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "@/lib/storage/db";
import {
  deleteSlideFile,
  fileName,
  getSlideFile,
  listSlideFiles,
  saveSlideFile,
} from "@/lib/slides/store";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("slide file store", () => {
  it("saves, lists newest first without the contents, reads back and deletes", async () => {
    const a = await saveSlideFile(
      {
        title: "Gauss's law",
        subject: "em",
        purpose: "teach",
        format: "pptx",
        theme: "paper",
        slides: 12,
        blob: new Blob(["aaa"]),
      },
      1000,
    );
    await saveSlideFile(
      {
        title: "Faraday",
        subject: "em",
        purpose: "revise",
        format: "pdf",
        theme: "chalk",
        slides: 6,
        blob: new Blob(["bb"]),
      },
      2000,
    );
    const list = await listSlideFiles();
    expect(list.map((f) => f.title)).toEqual(["Faraday", "Gauss's law"]);
    expect("blob" in list[0]).toBe(false);
    expect((await getSlideFile(a.id))?.bytes).toBe(3);
    await deleteSlideFile(a.id);
    expect(await getSlideFile(a.id)).toBeUndefined();
  });
  it("makes a safe file name", () => {
    expect(fileName({ title: "Gauss's law: ∮E·dA", format: "pdf", purpose: "study" })).toBe(
      "Gausss-law-EdA-study.pdf",
    );
  });
});
