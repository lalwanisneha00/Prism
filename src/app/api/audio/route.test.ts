import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import type { AudioEvent } from "@/lib/audio/audioEvents";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/audio/route");

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

async function events(res: Response): Promise<AudioEvent[]> {
  return (await res.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as AudioEvent);
}

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/audio", () => {
  it("refuses a lesson that fails validation", async () => {
    const res = await post({ lesson: { meta: {} } });
    expect(res.status).toBe(400);
  });

  it("streams one chapter per outline item, then done", async () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    const all = await events(await post({ lesson: sampleLessons[0] }));
    const chapters = all.filter((e) => e.type === "chapter");
    expect(chapters).toHaveLength(sampleLessons[0].audioScript.length);
    expect(chapters.map((e) => e.type === "chapter" && e.index)).toEqual([0, 1, 2, 3]);
    expect(all.at(-1)).toEqual({ type: "done" });
  });

  it("reports a missing AI key as an error event", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const all = await events(await post({ lesson: sampleLessons[0] }));
    expect(all.at(-1)).toMatchObject({ type: "error", kind: "not-configured" });
  });
});
