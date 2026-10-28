import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryDoc, LibraryStore } from "@/lib/library/sharedLibrary";
import type { PracticalEvent } from "@/lib/labs/practicalEvents";
import { memorySimulationStore, practicalKey } from "@/lib/labs/practicalLibrary";
import { setPracticalStoresForTests } from "@/lib/labs/practicalStores";
import { PRACTICAL_DURATION, PRACTICAL_LEVEL } from "@/lib/labs/practicalSchema";
import { labSubjects } from "@/lib/subjects";
import { lessonFlagRecord, memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import { staleTopics } from "@/lib/syllabusFix/stale";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/practical/route");

// A real PDEU lab experiment on the magnetic field of a coil (Phase 8: test the coil simulation).
const coilLab = labSubjects
  .flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => ({ s, t }))))
  .find(({ t }) => /axis of (a|the) (circular )?coil/i.test(t.name) && t.status !== "retired")!;

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/practical", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
const events = async (res: Response) =>
  (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PracticalEvent);
const lessonOf = (list: PracticalEvent[]) =>
  list.find((e): e is Extract<PracticalEvent, { type: "lesson" }> => e.type === "lesson");

function memoryLibrary(): LibraryStore & { docs: Map<string, LibraryDoc> } {
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

let previous: string | undefined;
beforeAll(() => {
  previous = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "fake";
});
afterAll(() => {
  process.env.LLM_PROVIDER = previous;
});
beforeEach(() => {
  // Wikipedia is mocked: grounding must not depend on the network.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ query: { search: [], pages: [] } })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  setPracticalStoresForTests(undefined);
});

describe("/api/practical", () => {
  it("finds a coil experiment to test with", () => expect(coilLab).toBeTruthy());

  it("rejects an unknown experiment", async () => {
    const res = await post({ subject: coilLab.s.id, topic: "no-such-experiment" });
    expect(res.status).toBe(404);
  });

  it("writes a lesson with the coil simulation, then serves the stored copy", async () => {
    const library = memoryLibrary();
    const simulations = memorySimulationStore();
    setPracticalStoresForTests({
      library,
      flags: memoryLessonFlagStore(),
      simulations,
      stale: async () => staleTopics,
    });
    const first = lessonOf(
      await events(await post({ subject: coilLab.s.id, topic: coilLab.t.id })),
    )!;
    expect(first.cached).toBe(false);
    expect(first.lesson.simulation).toMatchObject({ type: "widget", widget: "coil-field" });
    expect(first.lesson.meta.virtualLab?.url).toContain("vlabs.ac.in");
    expect(library.docs.has(practicalKey(coilLab.s.id, coilLab.t.id))).toBe(true);
    expect(simulations.saved.size).toBe(1);

    const second = lessonOf(
      await events(await post({ subject: coilLab.s.id, topic: coilLab.t.id })),
    )!;
    expect(second.cached).toBe(true);
    expect(second.lesson.simulation).toEqual(first.lesson.simulation);
  });

  it("rebuilds once after 4 students flag it, then sends a re-flagged lesson to review", async () => {
    const flags = memoryLessonFlagStore();
    setPracticalStoresForTests({
      library: memoryLibrary(),
      flags,
      simulations: memorySimulationStore(),
      stale: async () => staleTopics,
    });
    const ids = { subject: coilLab.s.id, topic: coilLab.t.id };
    await events(await post(ids));
    const flagAll = async (version: number) => {
      for (const uid of ["a", "b", "c", "d"])
        await flags.submit(
          lessonFlagRecord(
            {
              ...ids,
              level: PRACTICAL_LEVEL,
              durationMin: PRACTICAL_DURATION,
              version,
              type: "simulation-wrong",
              note: "the coil does not move",
            },
            uid,
            {},
            new Date().toISOString(),
          ),
        );
    };
    await flagAll(1);
    const rebuilt = lessonOf(await events(await post(ids)))!;
    expect(rebuilt.rebuiltFromFlags).toBe(true);
    expect(flags.archived).toEqual([`${practicalKey(ids.subject, ids.topic)}__v1`]);

    await flagAll(2);
    const reviewed = lessonOf(await events(await post(ids)))!;
    expect(reviewed.cached).toBe(true);
    expect(reviewed.underReview).toBe(true);
    expect(flags.archived).toHaveLength(1);
  });

  it("works with no shared storage (each open writes a new lesson)", async () => {
    setPracticalStoresForTests(null);
    const list = await events(await post({ subject: coilLab.s.id, topic: coilLab.t.id }));
    expect(list.map((e) => e.type)).toContain("stage");
    expect(lessonOf(list)?.cached).toBe(false);
  });
});
