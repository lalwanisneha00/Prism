import { describe, expect, it } from "vitest";
import { chaptersFromDraft, toSubject } from "@/lib/custom/customSubject";
import { validateLessonRequest } from "@/lib/lessonRequest";
import { buildLessonPrompt, subjectKindRule } from "@/lib/prompts/lessonPrompt";

const source = {
  id: "s1",
  title: "A source",
  publisher: "Wikipedia",
  kind: "encyclopedia" as const,
};

function custom(teaching: "theory" | "skill") {
  return toSubject({
    id: "custom-test",
    name: teaching === "skill" ? "English Communication" : "Universal Human Values",
    teaching,
    hasMaterial: false,
    chapters: chaptersFromDraft([
      { name: "Unit one", topics: ["Self-exploration", "Letter writing"] },
    ]),
  });
}

function prompt(subject: ReturnType<typeof custom> | null, level: string) {
  const raw = subject
    ? { subject: subject.id, chapter: "unit-one", topic: "self-exploration", level, duration: "10" }
    : { subject: "em", chapter: "electrostatics", topic: "gauss-law", level, duration: "10" };
  const r = validateLessonRequest(raw, subject ? [subject] : []);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return buildLessonPrompt(r.request, [source]).prompt;
}

describe("lesson prompt for theory and skill subjects", () => {
  it("leaves built-in subjects' prompts unchanged", () => {
    const p = prompt(null, "exam-prep");
    expect(p).not.toContain("THEORY SUBJECT");
    expect(p).not.toContain("SKILL SUBJECT");
  });

  it("asks theory subjects for organising visuals, and answer-writing help in Exam Prep", () => {
    expect(prompt(custom("theory"), "first-encounter")).toContain("THEORY SUBJECT");
    expect(prompt(custom("theory"), "first-encounter")).not.toContain("ANSWER-WRITING HELP");
    expect(prompt(custom("theory"), "exam-prep")).toContain("ANSWER-WRITING HELP");
  });

  it("asks skill subjects for practice activities", () => {
    expect(prompt(custom("skill"), "first-encounter")).toContain("SKILL SUBJECT");
  });

  it("checks a custom subject's chapter and topic like any other", () => {
    const s = custom("theory");
    expect(
      validateLessonRequest(
        { subject: s.id, chapter: "unit-one", topic: "nope", level: "exam-prep", duration: "10" },
        [s],
      ).ok,
    ).toBe(false);
    expect(
      validateLessonRequest({
        subject: s.id,
        chapter: "unit-one",
        topic: "self-exploration",
        level: "exam-prep",
        duration: "10",
      }).ok,
    ).toBe(false);
  });
});

describe("programming and numerical subjects (V3 · Step 5)", () => {
  it("asks programming subjects for runnable code with exact output blocks", () => {
    const rule = subjectKindRule("computing");
    expect(rule).toContain("PROGRAMMING SUBJECT");
    expect(rule).toContain("```output");
  });
  it("asks numerical engineering subjects for checked SI units", () => {
    expect(subjectKindRule("circuits")).toContain('"unit"');
    expect(subjectKindRule("mechanics")).toContain("NUMERICAL SUBJECT");
  });
  it("adds nothing for physics and maths, so measured prompts stay the same", () => {
    expect(subjectKindRule("physics")).toBe("");
    expect(subjectKindRule("maths")).toBe("");
    expect(subjectKindRule(undefined)).toBe("");
    const p = prompt(null, "first-encounter");
    expect(p).not.toContain("PROGRAMMING SUBJECT");
    expect(p).not.toContain("NUMERICAL SUBJECT");
  });
});

describe("syllabus context (on-point lessons)", () => {
  it("tells the lesson the unit, the neighbouring topics and to keep the meaning of this course", () => {
    const r = validateLessonRequest({
      subject: "pdeu-mathematics-i-ce-ece-civil",
      chapter: "differential-calculus-and-its-applications",
      topic: "eulers-theorem-homogeneous",
      level: "exam-prep",
      duration: "10",
    });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const p = buildLessonPrompt(r.request, [source]).prompt;
    expect(p).toContain("SYLLABUS CONTEXT");
    expect(p).toContain("Pandit Deendayal Energy University");
    expect(p).toContain('unit "Differential Calculus and its Applications"');
    expect(p).toContain("Jacobians");
    expect(p).toContain("do not teach that other meaning");
  });
});
