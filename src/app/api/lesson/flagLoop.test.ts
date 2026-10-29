import { describe, expect, it, vi } from "vitest";
import gauss from "@/data/sample-lessons/gauss-law.first-encounter.json";
import type { LibraryDoc, LibraryStore } from "@/lib/library/sharedLibrary";
import type { LessonEvent } from "@/lib/lessonEvents";
import { LessonSchema } from "@/lib/schema";
import { lessonFlagRecord, memoryLessonFlagStore } from "@/lib/syllabusFix/lessonFlagStore";
import { memoryProposalStore } from "@/lib/syllabusFix/proposalStore";

/*
 * Syllabus fix, Phase 8: the lesson flag loop through /api/lesson. Four students flag a theory
 * lesson → the next open rewrites it once, with their reports in the AI's instructions, and keeps
 * the old version → a second round of flags sends it to the admin instead of rewriting again.
 * The AI writer and fact-check are stand-ins; the route, stores and rules are the real ones.
 */

vi.mock("server-only", () => ({}));
vi.stubEnv("LLM_PROVIDER", "");
vi.stubEnv("GEMINI_API_KEY", "test-key");

const docs = new Map<string, LibraryDoc>();
const library: LibraryStore = {
  get: async (key) => docs.get(key) ?? null,
  set: async (key, doc) => void docs.set(key, doc),
};
const flags = memoryLessonFlagStore();
const proposals = memoryProposalStore();

const ids = { subject: "em", chapter: "induction", topic: "faradays-law" };
const lesson = LessonSchema.parse({
  ...gauss,
  meta: { ...gauss.meta, ...ids, title: "Faraday's law", durationMin: 10 },
});
/** What the AI writer was asked each time (the stand-in records it). */
const calls: { knownProblems?: string }[] = [];
const writer = async (_request: unknown, options: { knownProblems?: string }) => {
  calls.push({ knownProblems: options.knownProblems });
  return lesson;
};

vi.mock("@/lib/firebase/admin", () => ({ getAdmin: async () => ({ db: {} }) }));
vi.mock("@/lib/library/adminStore", () => ({ adminLibraryStore: () => library }));
vi.mock("@/lib/syllabusFix/lessonFlagStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/lessonFlagStore")>()),
  adminLessonFlagStore: () => flags,
}));
vi.mock("@/lib/syllabusFix/proposalStore", async (original) => ({
  ...(await original<typeof import("@/lib/syllabusFix/proposalStore")>()),
  adminProposalStore: () => proposals,
}));
vi.mock("@/lib/grounding/groundSources", () => ({ groundSources: async () => [] }));
vi.mock("@/lib/generateLesson", () => ({ generateLesson: writer }));
vi.mock("@/lib/verify", () => ({
  verifyLesson: async (l: unknown) => ({ lesson: l, checked: true }),
}));

const { POST } = await import("@/app/api/lesson/route");

async function open(): Promise<Extract<LessonEvent, { type: "lesson" }>> {
  const res = await POST(
    new Request("http://localhost/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...ids, level: "first-encounter", duration: "10" }),
    }),
  );
  const events = (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LessonEvent);
  const found = events.find((e) => e.type === "lesson");
  if (!found || found.type !== "lesson") throw new Error(JSON.stringify(events.at(-1)));
  return found;
}

async function flagAll(version: number, note: string) {
  for (const uid of ["a", "b", "c", "d"])
    await flags.submit(
      lessonFlagRecord(
        {
          subject: ids.subject,
          topic: ids.topic,
          level: "first-encounter",
          durationMin: 10,
          version,
          type: "wrong-fact",
          excerpt: "Flux is measured in tesla.",
          note,
        },
        uid,
        {},
        new Date().toISOString(),
      ),
    );
}

const KEY = "em_faradays-law_first-encounter_10";

describe("lesson flags: four students → one rewrite with their feedback → then the admin", () => {
  it("writes the lesson once, then serves the shared copy", async () => {
    expect((await open()).cached).toBeFalsy();
    expect((await open()).cached).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("rewrites it after 4 flags, quoting the students' reports to the AI as data", async () => {
    await flagAll(1, "Magnetic flux is in webers, not tesla.");
    expect((await flags.status(KEY))?.state).toBe("needs_regeneration");
    const rebuilt = await open();
    expect(rebuilt.rebuiltFromFlags).toBe(true);
    expect(calls[0].knownProblems).toBeUndefined();
    expect(calls).toHaveLength(2);
    const told = calls[1].knownProblems ?? "";
    expect(told).toMatch(/webers, not tesla/);
    expect(told).toMatch(/wrong/i);
    // The flagged version is kept, and the lesson is now version 2.
    expect(flags.archived).toEqual([`${KEY}__v1`]);
    expect((await flags.status(KEY))?.version).toBe(2);
  });

  it("sends a re-flagged lesson to the admin instead of rewriting it again", async () => {
    await flagAll(2, "Still wrong units.");
    const served = await open();
    expect(served.cached).toBe(true);
    expect(served.underReview).toBe(true);
    expect(calls).toHaveLength(2);
    expect((await flags.status(KEY))?.state).toBe("review");
  });
});
