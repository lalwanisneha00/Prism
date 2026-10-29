import { describe, expect, it } from "vitest";
import { gzipJson } from "@/lib/compress";
import type { LibraryDoc, LibraryStore } from "@/lib/library/sharedLibrary";
import { ARCHETYPES } from "@/lib/labs/archetypes";
import { fakeLabSections } from "@/lib/labs/fakeLab";
import type { LabLesson } from "@/lib/labs/labLesson";
import { PRACTICAL_PROMPT_VERSION } from "@/lib/labs/practicalPrompt";
import {
  keptSimulation,
  practicalKey,
  readPractical,
  writePractical,
} from "@/lib/labs/practicalLibrary";

function memory(): LibraryStore & { docs: Map<string, LibraryDoc> } {
  const docs = new Map<string, LibraryDoc>();
  return {
    docs,
    async get(key) {
      return docs.get(key) ?? null;
    },
    async set(key, doc) {
      docs.set(key, doc);
    },
  };
}

const programming = ARCHETYPES.archetypes.find((a) => a.id === "programming")!;
const v2: LabLesson = {
  version: 2,
  archetype: "programming",
  sections: fakeLabSections(programming),
  meta: {
    kind: "practical",
    archetype: "programming",
    subject: "lab-x",
    chapter: "experiments",
    topic: "exp-1",
    title: "Loops",
    createdAt: new Date().toISOString(),
    sources: [],
  },
};

describe("lab lessons in the shared library", () => {
  it("stores and reads back a Phase 7C lesson", async () => {
    const store = memory();
    expect(await writePractical(store, v2)).toBe(true);
    const back = await readPractical(store, practicalKey("lab-x", "exp-1"), {
      version: 1,
      topics: {},
    });
    expect(back).toMatchObject({ version: 2, archetype: "programming" });
  });

  it("opens a Phase 7B lesson only while the switch is on (off = stale, rewritten on open)", async () => {
    const store = memory();
    const old = {
      aim: "To verify Ohm's law.",
      theory: { body: "$V = IR$", formulas: [] },
      apparatus: {
        items: ["Supply", "Resistor"],
        parts: [
          { id: "supply", label: "Supply" },
          { id: "resistor", label: "Resistor" },
        ],
        links: [{ from: "supply", to: "resistor" }],
      },
      procedure: [
        { text: "Connect.", parts: ["supply"] },
        { text: "Read.", parts: [] },
        { text: "Repeat.", parts: [] },
      ],
      observations: {
        columns: ["V (V)", "I (A)"],
        blankRows: 3,
        sampleRows: [
          ["1", "0.1"],
          ["2", "0.2"],
        ],
      },
      calculations: { steps: ["R = 10 Ω"] },
      result: { statement: "R = 10 Ω", typicalRange: "9 to 11 Ω" },
      precautions: ["Keep current low.", "Tap meters."],
      errors: ["Zero error."],
      viva: Array.from({ length: 5 }, (_, i) => ({ question: `Q${i}`, answer: "A" })),
      simulation: null,
      meta: { ...v2.meta, topic: "exp-2", archetype: undefined },
    };
    const key = practicalKey("lab-x", "exp-2");
    await store.set(key, {
      lessonGz: await gzipJson(old),
      subject: "lab-x",
      topic: "exp-2",
      level: "practical",
      durationMin: 1,
      title: "Old",
      createdAt: new Date().toISOString(),
      schemaVersion: 1,
      promptVersion: PRACTICAL_PROMPT_VERSION,
      tier: "sourced",
      sourceIds: [],
    });
    const none = { version: 1 as const, topics: {} };
    expect(await readPractical(store, key, none, undefined, true)).toMatchObject({
      aim: "To verify Ohm's law.",
    });
    // Off: treated as missing, so the route writes it again in its new format.
    expect(await readPractical(store, key, none, undefined, false)).toBeNull();
  });
});

describe("a saved simulation choice", () => {
  it("is kept, except a saved 'none fits' once a template matches", () => {
    const sim = { type: "phet" as const, sim: "x", caption: "c" };
    expect(keptSimulation(sim, 3)).toBe(sim);
    expect(keptSimulation(null, 0)).toBeNull();
    expect(keptSimulation(null, 2)).toBeUndefined();
    expect(keptSimulation(undefined, 2)).toBeUndefined();
  });
});
