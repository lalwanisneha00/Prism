import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  addNote,
  getNoteFile,
  setSectionIncluded,
  setSectionOcr,
  updateNoteMeta,
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

  it("re-tags a file, leaves parts out, stores read pictures and keeps the original", async () => {
    const original = { bytes: new Uint8Array([1, 2, 3]).buffer, mime: "application/pdf" };
    const note = await addNote({ name: "Unit 2.pdf", size: 3 }, pages, 1000, {}, original);
    expect((await getNoteFile(note.id))?.mime).toBe("application/pdf");

    const tagged = await updateNoteMeta(
      note.id,
      { kind: "pyq", subject: "em", chapter: "electrostatics" },
      2000,
    );
    expect(tagged).toMatchObject({ kind: "pyq", subject: "em", chapter: "electrostatics" });
    const summary = (await getAllRecords("noteSummaries")).find((s) => s.id === note.id);
    expect(summary).toMatchObject({ kind: "pyq", subject: "em", chapter: "electrostatics" });
    // Changing the subject drops a chapter that belonged to the old subject.
    expect((await updateNoteMeta(note.id, { subject: "engg-math" }))?.chapter).toBeUndefined();

    const without = await setSectionIncluded(note.id, 2, false);
    expect(without?.excluded).toEqual([2]);
    expect(without?.chunks.every((c) => c.page !== 2)).toBe(true);
    expect(await findRelevantPassages("Gauss flux")).toEqual([]);
    await setSectionIncluded(note.id, 2, true);

    const read = await setSectionOcr(note.id, 1, "Ampere's circuital law from the board", "device");
    expect(read?.sections?.[0]).toMatchObject({ ocr: "device", ocrText: expect.any(String) });
    expect((await findRelevantPassages("Ampere circuital"))[0]).toMatchObject({ page: 1 });

    await deleteNote(note.id);
    expect(await getNoteFile(note.id)).toBeUndefined();
  });

  it("uses only the matching subject's notes (and untagged ones) for a lesson", async () => {
    await addNote({ name: "maths.pdf", size: 1 }, pages, 1, { subject: "engg-math" });
    expect(await findRelevantPassages("Gauss flux", 8, "em")).toEqual([]);
    await addNote({ name: "any.pdf", size: 1 }, pages, 2);
    expect((await findRelevantPassages("Gauss flux", 8, "em"))[0].noteName).toBe("any.pdf");
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
