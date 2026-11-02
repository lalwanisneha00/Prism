import { describe, expect, it } from "vitest";
import { activitiesFor, countAdvice } from "@/lib/slides/ai/count";
import {
  contentSlides,
  fakeOutline,
  fitOutline,
  outlineProblems,
  type DeckBrief,
  type Outline,
} from "@/lib/slides/ai/outline";
import {
  activityProblems,
  AiSlideSchema,
  notesText,
  slideProblems,
  toSlides,
  type AiSlide,
} from "@/lib/slides/ai/write";
import { PURPOSES, type VisualRequest } from "@/lib/slides/plan";

const brief = (purpose: DeckBrief["purpose"], slides = 15): DeckBrief => ({
  purpose,
  title: "Recursion",
  course: "Computer Programming - I, PDEU B.Tech, semester 1",
  level: "Building Blocks",
  slides,
  topics: [{ name: "Recursion", digest: "TOPIC: Recursion" }],
  visuals: [],
  material: [],
  pyqs: [],
  weights: [],
});

const notes = {
  say: "Walk through the call stack one frame at a time, drawing each call on the board so students see the stack grow and then unwind.",
  ask: "What happens to the stack when n is 0?",
  doubts: [],
  minutes: 4,
};

const good: Extract<AiSlide, { layout: "activity" }> = {
  layout: "activity",
  title: "The countdown that never ends",
  format: "spot-the-flaw",
  minutes: 4,
  group: "Pairs",
  prompt:
    "Here's a recursive function meant to count down from n and stop. It runs forever for one specific type of input. In pairs, find which input breaks it and fix it with the smallest change.",
  material:
    'void countdown(int n) {\n  if (n == 0) return;\n  printf("%d ", n);\n  countdown(n - 1);\n}',
  steps: ["Trace it for n = 3.", "Try other kinds of input.", "Agree on the smallest fix."],
  facilitation: {
    answer:
      "Any negative n never reaches the base case n == 0, so the calls never stop; changing the test to n <= 0 fixes it.",
    hints: ["Which inputs did you not try?", "Does every input reach n == 0?"],
    wrongAnswers: [{ answer: "Large n breaks it.", why: "Slow is confused with never stopping." }],
    debrief: "A base case must be reachable from every input, not just the expected ones.",
  },
  notes,
};

describe("activities: the reject list", () => {
  const none = { formats: [], texts: [] };

  it("accepts a real challenge (the recursion example from the brief)", () => {
    expect(activityProblems(good, none)).toEqual([]);
  });

  it("rejects recall, MCQs, 'just discuss' and one-line answers", () => {
    expect(
      activityProblems({ ...good, prompt: `What is recursion? ${good.prompt}` }, none).join(),
    ).toMatch(/recall/);
    expect(
      activityProblems(
        { ...good, prompt: `${good.prompt} Which of the following is true? (a) yes (b) no` },
        none,
      ).join(),
    ).toMatch(/multiple-choice/);
    expect(
      activityProblems(
        {
          ...good,
          prompt:
            "Discuss recursion and its uses in programming with your group and the trade-offs involved overall today.",
        },
        none,
      ).join(),
    ).toMatch(/discuss/);
    expect(
      activityProblems(
        { ...good, facilitation: { ...good.facilitation, answer: "A base case." } },
        none,
      ).join(),
    ).toMatch(/one word or one definition/);
  });

  it("rejects a repeated format and an activity answered on an earlier slide", () => {
    expect(activityProblems(good, { formats: ["spot-the-flaw"], texts: [] }).join()).toMatch(
      /already used/,
    );
    expect(activityProblems(good, { formats: [], texts: [good.prompt] }).join()).toMatch(
      /earlier slide/,
    );
  });
});

describe("depth rules", () => {
  const concept: Extract<AiSlide, { layout: "concept" }> = {
    layout: "concept",
    title: "The base case",
    analogy: "Like the bottom step of a staircase: you stop climbing down when you reach it.",
    points: [
      "The base case is the input the function answers directly, without calling itself.",
      "Every recursive call must move the input closer to the base case, or the calls never end.",
    ],
    example: { label: "Example", text: "factorial(0) returns 1 directly.", code: "" },
    takeaway: "No reachable base case, no answer.",
    notes,
  };

  it("needs an example and meaningful points on a concept slide", () => {
    expect(slideProblems(concept, "teach", { formats: [], texts: [] })).toEqual([]);
    expect(
      slideProblems({ ...concept, example: undefined }, "study", { formats: [], texts: [] }).join(),
    ).toMatch(/example/);
    expect(
      slideProblems({ ...concept, points: ["Base case.", "Stops it.", "Important."] }, "study", {
        formats: [],
        texts: [],
      }).join(),
    ).toMatch(/vague/);
  });

  it("teaching slides need real speaker notes", () => {
    expect(
      slideProblems({ ...concept, notes: { ...notes, say: "Explain it." } }, "teach", {
        formats: [],
        texts: [],
      }).join(),
    ).toMatch(/teaching notes/);
    expect(
      slideProblems({ ...concept, notes: { ...notes, say: "" } }, "revise", {
        formats: [],
        texts: [],
      }),
    ).toEqual([]);
  });

  it("notes carry what to say, the question, the activity's answer, hints, wrong answers and debrief", () => {
    const text = notesText(good, "teach");
    for (const part of [
      "SAY:",
      "ASK THE CLASS:",
      "EXPECTED ANSWER:",
      "HINTS",
      "COMMON WRONG ANSWERS:",
      "DEBRIEF (1 min):",
      "TIME: about 4 min",
    ])
      expect(text).toContain(part);
  });
});

describe("converting written slides", () => {
  it("turns visuals into pictures the browser draws and keeps code and activity details", () => {
    const visuals: Record<string, VisualRequest> = {};
    let s = 0;
    let v = 0;
    const ids = { slide: () => `s${++s}`, visual: () => `v${++v}` };
    const written = AiSlideSchema.array().parse([
      {
        layout: "concept",
        title: "Compile stages",
        points: [
          "The preprocessor expands #include and #define before compiling.",
          "The linker joins object files and libraries into one program.",
        ],
        example: {
          label: "Example",
          text: "",
          code: "#include <stdio.h>\nint main(void) { return 0; }",
        },
        takeaway: "Four stages, four tools.",
        visual: {
          type: "mermaid",
          code: "flowchart LR\n A[.c] --> B[Preprocessor]",
          caption: "The stages",
        },
        notes,
      },
      good,
    ]);
    const [c, a] = toSlides(written, "teach", [], ids, visuals);
    expect(c.layout === "concept" && c.picture?.key).toBe("v1");
    expect(visuals.v1).toEqual({
      kind: "mermaid",
      code: "flowchart LR\n A[.c] --> B[Preprocessor]",
    });
    expect(c.layout === "concept" && c.example?.code).toContain("#include");
    expect(a).toMatchObject({
      layout: "activity",
      format: "spot-the-flaw",
      group: "Pairs",
      minutes: 4,
    });
    expect(a.notes).toContain("EXPECTED ANSWER:");
  });
});

describe("the outline", () => {
  const plan = (kinds: string[], formats: (string | undefined)[] = []): Outline => ({
    goals: ["Trace a recursive function."],
    prerequisites: [],
    misconceptions: [],
    assumptions: "",
    slides: kinds.map((kind, i) => ({
      kind: kind as Outline["slides"][number]["kind"],
      title: `Slide ${i + 1}`,
      focus: "Focus",
      topic: "Recursion",
      visual: "",
      ...(formats[i] ? { activity: formats[i] as "debate" } : {}),
    })),
  });

  it("needs exactly the asked content slides, and 2+ distinct activities after concepts in a 15-slide teaching deck", () => {
    expect(activitiesFor(15)).toBe(2);
    expect(activitiesFor(10)).toBe(1);
    const kinds = Array.from({ length: 13 }, () => "concept");
    expect(outlineProblems(plan(kinds), "teach", 15).join()).toMatch(/at least 2 activities/);
    kinds[4] = "activity";
    kinds[9] = "activity";
    const same = plan(kinds, Object.assign([], { 4: "debate", 9: "debate" }));
    expect(outlineProblems(same, "teach", 15).join()).toMatch(/different format/);
    const ok = plan(kinds, Object.assign([], { 4: "debate", 9: "team-race" }));
    expect(outlineProblems(ok, "teach", 15)).toEqual([]);
    expect(outlineProblems(plan(kinds.slice(1)), "teach", 15).join()).toMatch(/exactly 13/);
  });

  it("puts practice answers after the questions, and trims a slightly long outline", () => {
    expect(
      outlineProblems(plan(["answers", "questions", "questions"]), "practice", 5).join(),
    ).toMatch(/after the last questions/);
    const long = plan(["concept", "concept", "example", "concept", "recap"]);
    const fitted = fitOutline(long, "study", 5);
    expect(fitted.slides).toHaveLength(contentSlides("study", 5));
    expect(fitted.slides.at(-1)?.kind).toBe("recap");
  });

  it("the test AI's outline passes the checks for every purpose", () => {
    for (const purpose of PURPOSES) {
      const total = purpose === "summary" ? 1 : 15;
      expect(outlineProblems(fakeOutline(brief(purpose, total)), purpose, total)).toEqual([]);
    }
  });
});

describe("slide count advice", () => {
  it("warns when a chapter gets too few slides, with a better number", () => {
    const a = countAdvice("teach", 6, 8);
    expect(a.ok).toBe(false);
    if (!a.ok) {
      expect(a.tooFew).toBe(true);
      expect(a.suggested).toBeGreaterThanOrEqual(29);
      expect(a.message).toMatch(/too few for 6 topics/);
    }
    expect(countAdvice("teach", 1, 15).ok).toBe(true);
    expect(countAdvice("revise", 1, 30).ok).toBe(false);
    expect(countAdvice("summary", 9, 1).ok).toBe(true);
  });
});
