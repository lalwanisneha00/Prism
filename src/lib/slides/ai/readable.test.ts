import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { assemblePlan } from "@/lib/slides/ai/deck";
import { lessonDigest } from "@/lib/slides/ai/digest";
import { fakeOutline } from "@/lib/slides/ai/outline";
import { visibleTexts } from "@/lib/slides/ai/split";
import { AiSlideSchema, readableSlide } from "@/lib/slides/ai/write";
import { hasRawMath, readableMath } from "@/lib/slides/text";

describe("no raw LaTeX on slides (the Ohm's law deck)", () => {
  it("turns the screenshot's text into readable maths", () => {
    const text =
      "Imagine an ohmic circuit where both the voltage source and the resistor value are doubled simultaneously ($V_{new} = 2V$ and $R_{new} = 2R$). Without calculating yet, what happens to the resulting current $I_{new}$ compared to the original current $I$?";
    const out = readableMath(text);
    expect(out).toContain("(V_new = 2V and R_new = 2R)");
    expect(out).toContain("current I_new compared to the original current I?");
    expect(hasRawMath(out)).toBe(false);
    expect(
      readableMath("Write down your reasoning using Ohm's law ($V = IR$) before the reveal."),
    ).toBe("Write down your reasoning using Ohm's law (V = IR) before the reveal.");
    expect(readableMath("$$I_{new} = \\frac{2V}{2R} = I$$ Doubling both")).toBe(
      "I_new = 2V/2R = I Doubling both",
    );
  });

  it("cleans LaTeX written without dollar signs, but keeps money and C escapes", () => {
    expect(readableMath("R = \\rho \\frac{L}{A} with 10\\,\\Omega")).toBe("R = ρ L/A with 10 Ω");
    expect(readableMath("It costs $5 to build.")).toBe("It costs $5 to build.");
    expect(readableMath('printf ends with "\\n" to start a new line')).toBe(
      'printf ends with "\\n" to start a new line',
    );
    expect(readableMath("**Key idea:** current halves")).toBe("Key idea: current halves");
  });

  it("cleans every text of a written slide and its notes, never the code", () => {
    const code = 'double i = v / r; // I = V/R\nprintf("I = %f $\\n", i);';
    const slide = AiSlideSchema.parse({
      layout: "concept",
      title: "Ohm's law, $V = IR$",
      points: ["Current is $I = \\frac{V}{R}$ for an ohmic conductor.", "Doubling $R$ halves $I$."],
      example: { label: "In code", text: "Compute $I$ in C:", code },
      takeaway: "$I \\propto V$ when $R$ is fixed.",
      notes: { say: "Write $V = IR$ on the board.", ask: "", doubts: [] },
    });
    const clean = readableSlide(slide);
    if (clean.layout !== "concept") throw new Error("layout changed");
    expect(clean.example?.code).toBe(code);
    expect(clean.points[0]).toBe("Current is I = V/R for an ohmic conductor.");
    for (const t of visibleTexts(clean)) expect(hasRawMath(t), t).toBe(false);
  });

  it("a finished deck built from LaTeX-heavy slides has no raw LaTeX anywhere", () => {
    const lesson = sampleLessons[0];
    const brief = {
      purpose: "teach" as const,
      title: "Ohm's law",
      course: "Basic Electrical, B.Tech",
      level: "Building Blocks",
      slides: 4,
      topics: [{ name: "Ohm's law", digest: lessonDigest(lesson) }],
      visuals: [],
      material: [],
      pyqs: [],
      weights: [],
    };
    const notes = {
      say: "Ask them to predict first, then show that $I_{new} = I$ because $\\frac{2V}{2R} = \\frac{V}{R}$.",
      ask: "",
      doubts: [],
    };
    const slides = AiSlideSchema.array().parse([
      {
        layout: "activity",
        title: "Predict-Reveal Resistance Trap",
        format: "predict-reveal",
        minutes: 4,
        group: "Pairs",
        prompt:
          "Imagine an ohmic circuit where both the voltage source and the resistor value are doubled simultaneously ($V_{new} = 2V$ and $R_{new} = 2R$). What happens to $I_{new}$?",
        steps: ["Write down your reasoning using Ohm's law ($V = IR$) before the reveal."],
        facilitation: {
          answer:
            "The current stays the same: $I_{new} = \\frac{2V}{2R} = I$, because the ratio is unchanged.",
          hints: ["Write $I = V/R$.", "Substitute $2V$ and $2R$."],
          wrongAnswers: [{ answer: "It doubles.", why: "Students only look at $V$." }],
          debrief: "Ratios govern circuits: $I = \\frac{V}{R}$.",
        },
        notes,
      },
      {
        layout: "statement",
        label: "Reveal",
        text: "$I_{new} = \\frac{2V}{2R} = \\frac{V}{R} = I$: the current is unchanged.",
        notes,
      },
    ]);
    const outline = fakeOutline(brief);
    const { plan, checks } = assemblePlan({
      brief,
      outline: { ...outline, slides: outline.slides.slice(0, 2) },
      slides,
      lessons: [lesson],
      subjectName: "Basic Electrical",
      levelName: "Building Blocks",
      teacherNotes: true,
    });
    expect(checks.filter((c) => /raw LaTeX/.test(c))).toEqual([]);
    for (const s of plan.slides)
      for (const t of visibleTexts(s)) expect(hasRawMath(t), t).toBe(false);
  });
});
