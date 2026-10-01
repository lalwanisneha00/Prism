import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { applyCorrections, buildVerifyPrompt, markSections, verifyLesson } from "@/lib/verify";

const lesson = sampleLessons[0];
const sources = lesson.meta.sources.map((s) => ({ ...s, excerpt: `Text of ${s.title}` }));
const allSupported = lesson.sections.map((s) => ({ id: s.id, status: "supported" as const }));

const replying = (reply: unknown) => async () => JSON.stringify(reply);

describe("buildVerifyPrompt", () => {
  it("includes source excerpts and the lesson content, but not the audio outline", () => {
    const { prompt } = buildVerifyPrompt(lesson, sources);
    expect(prompt).toContain("EXCERPT: Text of Gauss's law");
    expect(prompt).toContain(lesson.sections[0].title);
    expect(prompt).not.toContain(lesson.audioScript[0].text);
  });
});

describe("applyCorrections", () => {
  it("replaces exact text at a path", () => {
    const { draft, applied } = applyCorrections(lesson, [
      { path: "workedExamples.0.answer", find: "2.26", replace: "9.99" },
    ]);
    expect(applied).toBe(1);
    expect(draft.workedExamples[0].answer).toContain("9.99");
    expect(lesson.workedExamples[0].answer).toContain("2.26"); // original untouched
  });

  it("ignores corrections whose text is not found or that target protected fields", () => {
    const { applied } = applyCorrections(lesson, [
      { path: "sections.0.body", find: "text that is not there", replace: "x" },
      { path: "meta.title", find: "Gauss", replace: "Hacked" },
      { path: "sections.0.sourceIds.0", find: "openstax", replace: "fake" },
      { path: "nowhere.9.thing", find: "a", replace: "b" },
    ]);
    expect(applied).toBe(0);
  });
});

describe("markSections", () => {
  it("turns verdicts into badges", () => {
    const marked = markSections(lesson, [
      { id: lesson.sections[0].id, status: "supported" },
      { id: lesson.sections[1].id, status: "unsupported", note: "Wrong angle convention" },
    ]);
    expect(marked.sections[0].check?.status).toBe("sourced");
    expect(marked.sections[1].check).toEqual({ status: "verify", note: "Wrong angle convention" });
    expect(marked.sections[2].check?.status).toBe("verify"); // not covered
  });
});

describe("verifyLesson", () => {
  it("applies valid corrections and marks sections", async () => {
    const result = await verifyLesson(
      lesson,
      sources,
      replying({
        sections: allSupported,
        corrections: [{ path: "hook", find: "three lines", replace: "a few lines" }],
      }),
    );
    expect(result.checked).toBe(true);
    expect(result.applied).toBe(1);
    expect(result.lesson.hook).toContain("a few lines");
    expect(result.lesson.sections.every((s) => s.check?.status === "sourced")).toBe(true);
  });

  it("throws away corrections that would break the lesson", async () => {
    const result = await verifyLesson(
      lesson,
      sources,
      replying({
        sections: allSupported,
        corrections: [{ path: "quiz.0.answer", find: "Zero", replace: "Not an option" }],
      }),
    );
    expect(result.applied).toBe(0);
    expect(result.lesson.quiz[0].answer).toBe("Zero");
  });

  it("throws away corrections that break the maths", async () => {
    const result = await verifyLesson(
      lesson,
      sources,
      replying({
        sections: allSupported,
        corrections: [{ path: "workedExamples.0.answer", find: "\\times", replace: "\\timez" }],
      }),
    );
    expect(result.applied).toBe(0);
  });

  it("marks everything Verify ⚠ when the fact-check cannot run", async () => {
    const result = await verifyLesson(lesson, sources, async () => {
      throw new Error("quota");
    });
    expect(result.checked).toBe(false);
    expect(result.lesson.sections.every((s) => s.check?.status === "verify")).toBe(true);
  });

  it("treats an unusable reply like a failed check", async () => {
    const result = await verifyLesson(lesson, sources, async () => "not json");
    expect(result.checked).toBe(false);
  });
});
