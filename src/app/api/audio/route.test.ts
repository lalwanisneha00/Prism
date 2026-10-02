import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import type { AudioResponse } from "@/lib/audio/audioEvents";
import type { ChapterPlan } from "@/lib/audio/generateNarration";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/audio/route");

const post = async (body: unknown) => {
  const res = await POST(
    new Request("http://localhost/api/audio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: (await res.json()) as AudioResponse };
};

const lesson60 = {
  ...sampleLessons[0],
  meta: { ...sampleLessons[0].meta, durationMin: 60 },
};

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/audio", () => {
  it("refuses a lesson that fails validation", async () => {
    const { status } = await post({ step: "outline", lesson: { meta: {} } });
    expect(status).toBe(400);
  });

  it("plans a long outline, then writes chapters one request at a time", async () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    const outline = await post({ step: "outline", lesson: lesson60 });
    expect(outline.body.ok && "plan" in outline.body).toBe(true);
    const plan = (outline.body as { plan: ChapterPlan[] }).plan;
    expect(plan.length).toBe(12); // 60 min × 140 words ÷ 700 per chapter

    const chapter = await post({
      step: "chapter",
      lesson: lesson60,
      plan,
      index: 3,
      previousEnding: "",
    });
    expect(chapter.body.ok && "chapter" in chapter.body && chapter.body.chapter.id).toBe(
      plan[3].id,
    );
  });

  it("rejects a chapter number outside the plan", async () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    const plan: ChapterPlan[] = [{ id: "a", title: "A", brief: "b" }];
    const { status } = await post({
      step: "chapter",
      lesson: sampleLessons[0],
      plan,
      index: 5,
      previousEnding: "",
    });
    expect(status).toBe(400);
  });

  it("reports a missing AI key", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const plan: ChapterPlan[] = [{ id: "a", title: "A", brief: "b" }];
    const { body } = await post({
      step: "chapter",
      lesson: sampleLessons[0],
      plan,
      index: 0,
      previousEnding: "",
    });
    expect(body).toMatchObject({ ok: false, kind: "not-configured" });
  });
});
