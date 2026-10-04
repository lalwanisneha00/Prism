import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  chaptersFromDraft,
  CustomSubjectPayloadSchema,
  guessTeaching,
  slugify,
  toSubject,
} from "@/lib/custom/customSubject";
import {
  createCustomSubject,
  deleteCustomSubject,
  duplicateCustomSubject,
  getCustomSubject,
  listCustomSubjects,
  loadCustomSubject,
  updateCustomSubject,
} from "@/lib/custom/store";
import { addNote } from "@/lib/notes/store";
import { extractTxt } from "@/lib/extract/plainText";
import { resetDbForTests } from "@/lib/storage/db";
import { listOutbox } from "@/lib/storage/records";
import { recordSchemas } from "@/lib/storage/recordSchemas";
import { catalogueProblems, subjects } from "@/lib/subjects";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

const chapters = chaptersFromDraft([
  { name: "Vedic literature", topics: ["The four Vedas", "Upanishads"] },
  { name: "Indian mathematics", topics: ["Zero and the decimal system", "Upanishads"] },
]);
const input = {
  name: "Indian Knowledge System",
  teaching: "theory" as const,
  chapters,
  details: { examKind: "end-sem" as const, marksPattern: "2, 5 and 10 marks" },
  outlineFrom: "typed" as const,
};

describe("custom subjects", () => {
  it("makes unique, stable ids from names", () => {
    const taken = new Set<string>();
    expect([
      slugify("Upanishads", taken),
      slugify("Upanishads", taken),
      slugify("  ", taken),
    ]).toEqual(["upanishads", "upanishads-2", "item"]);
    expect(chapters[1].topics[1].id).toBe("upanishads-2");
  });

  it("spots skill subjects by name", () => {
    expect(guessTeaching("English Communication")).toBe("skill");
    expect(guessTeaching("Universal Human Values")).toBe("theory");
  });

  it("becomes an ordinary subject: limited without material, sourced with it", () => {
    const payload = CustomSubjectPayloadSchema.parse({
      id: "custom-x",
      name: "IKS",
      teaching: "theory",
      hasMaterial: false,
      chapters,
    });
    const subject = toSubject(payload);
    expect(subject.tier).toBe("limited");
    expect(toSubject({ ...payload, hasMaterial: true }).tier).toBe("sourced");
    expect(catalogueProblems([...subjects, subject])).toEqual([]);
  });

  it("is saved, synced, edited, duplicated and deleted", async () => {
    const made = await createCustomSubject(input, 1000);
    expect(made.id).toMatch(/^custom-/);
    expect(recordSchemas.customSubjects.safeParse(made).success).toBe(true);
    expect((await listOutbox()).map((e) => e.collection)).toEqual(["customSubjects"]);

    await updateCustomSubject(made.id, { name: "IKS" }, 2000);
    expect((await getCustomSubject(made.id))?.name).toBe("IKS");

    const copy = await duplicateCustomSubject(made.id, 3000);
    expect(copy?.name).toBe("IKS (copy)");
    expect((await listCustomSubjects()).map((s) => s.name)).toEqual(["IKS (copy)", "IKS"]);

    await deleteCustomSubject(made.id, 4000);
    expect(await getCustomSubject(made.id)).toBeUndefined();
    expect(await listCustomSubjects()).toHaveLength(1);
  });

  it("loads as a subject whose tier reflects the student's material", async () => {
    const made = await createCustomSubject(input);
    expect((await loadCustomSubject(made.id))?.subject.tier).toBe("limited");
    await addNote(
      { name: "IKS notes.txt", size: 10 },
      extractTxt("n.txt", "The four Vedas are…"),
      1,
      {
        subject: made.id,
      },
    );
    const loaded = await loadCustomSubject(made.id);
    expect(loaded?.subject.tier).toBe("sourced");
    expect(loaded?.payload.hasMaterial).toBe(true);
  });
});
