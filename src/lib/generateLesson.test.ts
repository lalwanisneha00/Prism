import { describe, expect, it } from "vitest";
import { generateLesson, stripCitationTags, wrapBareMath } from "@/lib/generateLesson";
import type { LessonEvent } from "@/lib/lessonEvents";
import { validateLessonRequest } from "@/lib/lessonRequest";
import { FakeProvider, type FakeResponder } from "@/lib/llm/fake";
import { fakeLessonBody } from "@/lib/llm/fakeLesson";
import { LlmError } from "@/lib/llm/types";
import { sourcesForTopic } from "@/lib/sources";

const result = validateLessonRequest({
  subject: "em",
  chapter: "induction",
  topic: "faradays-law",
  level: "second-chance",
  duration: "15",
});
if (!result.ok) throw new Error("test request should be valid");
const request = result.request;
const sources = sourcesForTopic("em", "faradays-law");
const goodReply = JSON.stringify(fakeLessonBody(sources, "faradays-law"));

async function run(respond: FakeResponder) {
  const provider = new FakeProvider(respond);
  const events: LessonEvent[] = [];
  const prompts: string[] = [];
  const lesson = await generateLesson(request, {
    generate: (opts) => {
      prompts.push(opts.prompt);
      return provider.generateJson(opts);
    },
    emit: (e) => events.push(e),
    sources,
    now: () => new Date("2026-10-02T10:00:00Z"),
  });
  return { lesson, events, prompts };
}

describe("generateLesson", () => {
  it("returns a valid lesson and streams its sections first", async () => {
    const { lesson, events } = await run(() => goodReply);
    expect(lesson.sections).toHaveLength(5);
    const streamed = events.filter((e) => e.type === "section");
    expect(streamed).toHaveLength(5);
  });

  it("sets meta itself, whatever the AI claims", async () => {
    const lying = JSON.stringify({ ...JSON.parse(goodReply), meta: { topic: "something-else" } });
    const { lesson } = await run(() => lying);
    expect(lesson.meta.topic).toBe("faradays-law");
    expect(lesson.meta.level).toBe("second-chance");
    expect(lesson.meta.durationMin).toBe(15);
    expect(lesson.meta.createdAt).toBe("2026-10-02T10:00:00.000Z");
    expect(lesson.meta.sources.map((s) => s.id)).toEqual(sources.map((s) => s.id));
  });

  it("replaces any links the AI writes with curated ones", async () => {
    const withLinks = JSON.stringify({
      ...JSON.parse(goodReply),
      furtherLearning: {
        videos: [{ title: "x", url: "https://made-up.example", publisher: "?" }],
        papers: [],
        readings: [],
      },
    });
    const { lesson } = await run(() => withLinks);
    expect(lesson.furtherLearning.videos.some((v) => v.url.includes("made-up"))).toBe(false);
    expect(lesson.furtherLearning.readings.length).toBeGreaterThan(0);
  });

  it("sends validation problems back to the AI and accepts the fix", async () => {
    const broken = JSON.parse(goodReply);
    broken.quiz[0].answer = "Not an option";
    const { lesson, prompts, events } = await run((_, call) =>
      call === 0 ? JSON.stringify(broken) : goodReply,
    );
    expect(lesson.quiz[0].answer).toBe("Zero");
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("quiz.0.answer: the answer must be one of the options");
    expect(events.some((e) => e.type === "stage" && e.stage === "fixing")).toBe(true);
  });

  it("recovers from a reply that is not JSON", async () => {
    const { prompts } = await run((_, call) =>
      call === 0 ? "Sorry, here you go: oops" : goodReply,
    );
    expect(prompts[1]).toContain("not valid JSON");
  });

  it("rejects citations of sources it was not given", async () => {
    const bad = JSON.parse(goodReply);
    bad.sections[0].sourceIds = ["wikipedia-made-up"];
    const { prompts } = await run((_, call) => (call === 0 ? JSON.stringify(bad) : goodReply));
    expect(prompts[1]).toContain('unknown source "wikipedia-made-up"');
  });

  it("gives up with a clear error after three bad replies", async () => {
    await expect(run(() => "{}")).rejects.toSatisfy(
      (err) => err instanceof LlmError && err.kind === "bad-response",
    );
  });

  it("drops a visual that never becomes valid instead of failing the whole lesson", async () => {
    const body = JSON.parse(goodReply) as { sections: Record<string, unknown>[] };
    body.sections[0] = {
      ...body.sections[0],
      visual: { type: "compare", style: "venn", sets: [], caption: "Broken Venn" },
    };
    const broken = JSON.stringify(body);
    const { lesson, prompts } = await run(() => broken);
    expect(prompts).toHaveLength(3);
    expect(lesson.sections).toHaveLength(5);
    expect(lesson.sections[0].visual).toBeUndefined();
  });

  it("builds a prompt that lists only the topic's sources and the level's approach", async () => {
    const { prompts } = await run(() => goodReply);
    for (const s of sources) expect(prompts[0]).toContain(`id: ${s.id}`);
    expect(prompts[0]).toContain("TOPIC: Faraday's law of induction");
    expect(prompts[0]).toContain("TIME BUDGET: 15 minutes");
  });
});

describe("stripCitationTags", () => {
  it("removes citation tags from text but keeps the sourceIds list", () => {
    expect(
      stripCitationTags({
        body: "A power series [sourceIds: wikipedia-taylor-series]. Next (source: openstax-6-3).",
        steps: ["Use the rule [Sources: a, b]"],
        sourceIds: ["wikipedia-taylor-series"],
        note: "Keep [1] and [a, b] intervals.",
      }),
    ).toEqual({
      body: "A power series. Next.",
      steps: ["Use the rule"],
      sourceIds: ["wikipedia-taylor-series"],
      note: "Keep [1] and [a, b] intervals.",
    });
  });
});

describe("wrapBareMath", () => {
  it("wraps short bare-LaTeX answers and leaves everything else alone", () => {
    expect(wrapBareMath(String.raw`\frac{1}{2}`)).toBe(String.raw`$\frac{1}{2}$`);
    expect(wrapBareMath(String.raw`$\frac{1}{2}$`)).toBe(String.raw`$\frac{1}{2}$`);
    expect(wrapBareMath("It doubles.")).toBe("It doubles.");
    expect(wrapBareMath(String.raw`Mixed $x$ and \pi`)).toBe(String.raw`Mixed $x$ and \pi`);
  });
});
