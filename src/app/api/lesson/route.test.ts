import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LessonEvent } from "@/lib/lessonEvents";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/lesson/route");

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function events(res: Response): Promise<LessonEvent[]> {
  return (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LessonEvent);
}

const faraday = {
  subject: "em",
  chapter: "induction",
  topic: "faradays-law",
  level: "first-encounter",
  duration: "10",
};

beforeEach(() => {
  // Wikipedia is mocked: grounding must not depend on the real network in tests.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        query: {
          pages: [{ title: "x", extract: "Faraday found that changing flux induces an EMF." }],
        },
      }),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/lesson", () => {
  it("rejects an invalid request with a 400", async () => {
    const res = await post({ ...faraday, level: "genius" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as LessonEvent).type).toBe("error");
  });

  it("serves the hand-checked sample instantly, with the requested duration", async () => {
    const all = await events(
      await post({ ...faraday, chapter: "electrostatics", topic: "gauss-law", duration: "5" }),
    );
    expect(all).toHaveLength(1);
    const [only] = all;
    expect(only.type === "lesson" && only.cached && only.lesson.meta.durationMin).toBe(5);
  });

  it("explains when no AI key is configured", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const last = (await events(await post(faraday))).at(-1);
    expect(last).toMatchObject({ type: "error", kind: "not-configured" });
  });

  // The fake AI streams slowly on purpose (like a real one), so allow extra time.
  it(
    "runs the full pipeline: sources → writing → drafts → fact-check → lesson",
    { timeout: 20000 },
    async () => {
      vi.stubEnv("LLM_PROVIDER", "fake");
      // A topic no other test uses, so its Wikipedia text is not already cached.
      const all = await events(await post({ ...faraday, topic: "eddy-currents" }));
      const stages = all
        .filter((e) => e.type === "stage")
        .map((e) => e.type === "stage" && e.stage);
      expect(stages).toEqual(["sources", "writing", "checking"]);
      expect(all.filter((e) => e.type === "section").length).toBeGreaterThan(0);

      const final = all.at(-1);
      if (final?.type !== "lesson") throw new Error("expected a lesson");
      expect(final.cached).toBe(false);
      expect(final.lesson.meta.topic).toBe("eddy-currents");
      expect(final.lesson.sections.every((s) => s.check)).toBe(true);
      const fetched = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
      expect(fetched.some((u) => u.includes("wikipedia.org") && u.includes("Eddy"))).toBe(true);
    },
  );
});
