import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PaperQuestionSchema } from "@/lib/mock/paper";
import { findSubject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/mock-test/route");
const pattern = await import("@/app/api/mock-test/pattern/route");

const subject = findSubject("pdeu-discrete-mathematics")!;
const [unit] = activeChapters(subject);
const scope = unit.topics.slice(0, 3).map((t) => t.id);

const post = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(
    new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const section = (topic = scope[0]) => ({
  id: "s1",
  name: "Section A",
  slots: [
    { id: "s1q1", type: "mcq", marks: 1, topic },
    { id: "s1q2", type: "short", marks: 3, topic: scope[1] },
    { id: "s1q3", type: "numerical", marks: 4, topic: scope[2] },
  ],
});

let saved: string | undefined;
beforeAll(() => {
  saved = process.env.LLM_PROVIDER;
  process.env.LLM_PROVIDER = "fake";
});
afterAll(() => {
  process.env.LLM_PROVIDER = saved;
});

describe("POST /api/mock-test (one batch of questions)", () => {
  it("returns checked questions for every slot, with the slot's marks", async () => {
    const res = await post(POST, { subject: subject.id, section: section(), scope });
    const body = (await res.json()) as { ok: boolean; questions: unknown[] };
    expect(body.ok).toBe(true);
    const questions = body.questions.map((q) => PaperQuestionSchema.parse(q));
    expect(questions.map((q) => q.marks)).toEqual([1, 3, 4]);
    expect(questions.every((q) => scope.includes(q.topic))).toBe(true);
  });

  it("refuses a slot whose topic is outside the chosen scope", async () => {
    const res = await post(POST, { subject: subject.id, section: section("not-a-topic"), scope });
    expect(res.status).toBe(400);
  });

  it("refuses a scope topic that isn't in the subject", async () => {
    const res = await post(POST, {
      subject: subject.id,
      section: section(),
      scope: [...scope, "made-up"],
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/mock-test/pattern", () => {
  it("reads a paper's pattern", async () => {
    const text =
      "Section A\n1. Define a set. (2)\n2. Define a relation. (2)\nSection B Answer any 1\n1. Prove that A is countable. (10)\n2. Explain lattices. (10)";
    const body = (await (await post(pattern.POST, { text })).json()) as {
      ok: boolean;
      pattern: { totalMarks: number };
    };
    expect(body.ok).toBe(true);
    expect(body.pattern.totalMarks).toBe(14);
  });

  it("rejects an empty paper", async () => {
    expect((await post(pattern.POST, { text: "" })).status).toBe(400);
  });
});
