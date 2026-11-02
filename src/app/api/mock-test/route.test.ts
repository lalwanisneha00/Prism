import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PaperQuestionSchema } from "@/lib/mock/paper";
import { findSubject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";

vi.mock("server-only", () => ({}));
const { POST } = await import("@/app/api/mock-test/route");
const pattern = await import("@/app/api/mock-test/pattern/route");
const examiner = await import("@/app/api/mock-test/verify/route");

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

describe("POST /api/mock-test with the examiner's feedback (a rewrite)", () => {
  it("rewrites the rejected slots and keeps their metadata", async () => {
    const res = await post(POST, {
      subject: subject.id,
      section: section(),
      scope,
      feedback: [{ slot: "s1q2", issues: ["off-syllabus"], fix: "Ask about the topic itself" }],
      prereqMarks: 2,
      syllabus: "Unit 1: sets, relations, functions.",
    });
    const body = (await res.json()) as { ok: boolean; questions: unknown[] };
    expect(body.ok).toBe(true);
    const q = PaperQuestionSchema.parse(body.questions[1]);
    expect(q.relevance).toBe("A");
    expect(q.learningOutcome).toBeTruthy();
  });
});

describe("POST /api/mock-test/verify (one examiner call for the paper)", () => {
  const written = async () => {
    const res = await post(POST, { subject: subject.id, section: section(), scope });
    return ((await res.json()) as { questions: unknown[] }).questions;
  };

  it("returns one verdict per question", async () => {
    const questions = await written();
    const res = await post(examiner.POST, { subject: subject.id, scope, questions });
    const body = (await res.json()) as {
      ok: boolean;
      results: { id: string; pass: boolean; issues: string[] }[];
    };
    expect(body.ok).toBe(true);
    expect(body.results.map((r) => [r.id, r.pass])).toEqual([
      ["s1q1", true],
      ["s1q2", true],
      ["s1q3", true],
    ]);
  });

  it("refuses an unknown subject or a scope topic outside it", async () => {
    const questions = await written();
    expect((await post(examiner.POST, { subject: "nope", scope, questions })).status).toBe(400);
    expect(
      (await post(examiner.POST, { subject: subject.id, scope: ["made-up"], questions })).status,
    ).toBe(400);
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
