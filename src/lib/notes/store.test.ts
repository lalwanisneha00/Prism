import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  addNote,
  deleteNote,
  findRelevantPassages,
  listLocalNotes,
  listRemoteOnlyNotes,
} from "@/lib/notes/store";
import { extractTxt } from "@/lib/extract/plainText";
import { finishDoc } from "@/lib/extract/types";
import { getDb, resetDbForTests } from "@/lib/storage/db";
import { getAllRecords, listOutbox, putRecord } from "@/lib/storage/records";

beforeEach(() => {
  // A brand-new, empty database for every test.
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

const pages = finishDoc(
  "Unit 2.pdf",
  "pdf",
  [
    "Unit 2 covers electrostatics. Coulomb's law gives the force between two point charges.",
    "Gauss's law: the electric flux through a closed Gaussian surface equals the enclosed charge divided by epsilon nought. Use symmetry to choose the surface.",
  ].map((text, i) => ({
    kind: "page" as const,
    index: i + 1,
    label: `page ${i + 1}`,
    blocks: [{ kind: "paragraph" as const, text }],
    images: 0,
    thin: false,
  })),
);

describe("notes store", () => {
  it("keeps the text local and syncs only a short summary", async () => {
    const note = await addNote({ name: "Unit 2.pdf", size: 1234 }, pages, 1000);
    expect((await listLocalNotes()).map((n) => n.id)).toEqual([note.id]);

    const [summary] = await getAllRecords("noteSummaries");
    expect(summary).toMatchObject({ name: "Unit 2.pdf", pages: 2, deleted: false });
    expect(summary).not.toHaveProperty("chunks");
    expect((await listOutbox()).map((e) => e.collection)).toEqual(["noteSummaries"]);
  });

  it("finds the passages that match a topic", async () => {
    await addNote({ name: "Unit 2.pdf", size: 1234 }, pages);
    const found = await findRelevantPassages("Gauss's law electric flux");
    expect(found[0]).toMatchObject({ noteName: "Unit 2.pdf", page: 2, where: "page 2" });
  });

  it("keeps the sections for the preview and labels passages by place", async () => {
    const doc = extractTxt("todo.txt", "Line one about Ampere's law and magnetic fields.");
    const note = await addNote({ name: "todo.txt", size: 50 }, doc);
    expect(note).toMatchObject({ format: "txt", pages: 1 });
    expect(note.sections?.[0].label).toBe("line 1");
    expect(note.chunks[0].where).toBe("line 1");
  });

  it("deletes the text and syncs a tombstone", async () => {
    const note = await addNote({ name: "Unit 2.pdf", size: 1234 }, pages, 1000);
    await deleteNote(note.id, 2000);
    expect(await listLocalNotes()).toEqual([]);
    expect(await (await getDb()).get("notes", note.id)).toBeUndefined();
    const [summary] = await getAllRecords("noteSummaries");
    expect(summary).toMatchObject({ deleted: true, summary: "", updatedAt: 2000 });
  });

  it("lists notes uploaded on another device by name only", async () => {
    await putRecord("noteSummaries", {
      id: "note-other",
      name: "Phone notes.pdf",
      pages: 4,
      summary: "…",
      updatedAt: 5,
      deleted: false,
    });
    expect((await listRemoteOnlyNotes()).map((n) => n.name)).toEqual(["Phone notes.pdf"]);
  });
});
