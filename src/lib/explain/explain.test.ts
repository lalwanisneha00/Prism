import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import {
  buildExplainPrompt,
  contextFor,
  explain,
  ExplainInputSchema,
  MAX_SELECTION,
} from "@/lib/explain/explain";

const lesson = sampleLessons[0];
const firstSection = lesson.sections[0];

describe("ExplainInputSchema", () => {
  it("needs a section for simpler/analogy and a selection for explain/define", () => {
    expect(ExplainInputSchema.safeParse({ action: "simpler", sectionId: "x" }).success).toBe(true);
    expect(ExplainInputSchema.safeParse({ action: "simpler" }).success).toBe(false);
    expect(ExplainInputSchema.safeParse({ action: "define", selection: "flux" }).success).toBe(
      true,
    );
    expect(ExplainInputSchema.safeParse({ action: "define" }).success).toBe(false);
    expect(
      ExplainInputSchema.safeParse({ action: "explain", selection: "x".repeat(MAX_SELECTION + 1) })
        .success,
    ).toBe(false);
  });
});

describe("explain prompts", () => {
  it("uses the section the request is about, or the one containing the selection", () => {
    expect(contextFor(lesson, { action: "simpler", sectionId: firstSection.id })).toContain(
      firstSection.title,
    );
    const quote = lesson.sections[1].body.slice(0, 30);
    expect(contextFor(lesson, { action: "explain", selection: quote })).toContain(
      lesson.sections[1].title,
    );
    expect(contextFor(lesson, { action: "define", selection: "zzz not in lesson" })).toContain(
      "KEY POINTS",
    );
  });

  it("asks for a different analogy than the ones already shown", () => {
    const { prompt } = buildExplainPrompt(lesson, {
      action: "analogy",
      sectionId: firstSection.id,
      avoid: ["Water through a net"],
    });
    expect(prompt).toContain("ANALOGIES ALREADY SHOWN");
    expect(prompt).toContain("Water through a net");
  });
});

describe("explain", () => {
  it("returns checked text, retrying once when the maths is broken", async () => {
    const replies = [
      JSON.stringify({ text: String.raw`Bad $\frac{1}{$ maths` }),
      JSON.stringify({ text: String.raw`Flux is $\Phi = EA$ for a flat surface.` }),
    ];
    const prompts: string[] = [];
    const text = await explain(lesson, { action: "define", selection: "flux" }, async (o) => {
      prompts.push(o.prompt);
      return replies[prompts.length - 1];
    });
    expect(text).toContain(String.raw`\Phi = EA`);
    expect(prompts[1]).toContain("PREVIOUS REPLY HAD THESE PROBLEMS");
  });

  it("gives up after two unusable replies", async () => {
    await expect(
      explain(lesson, { action: "simpler", sectionId: firstSection.id }, async () => "nope"),
    ).rejects.toThrow(/explain failed checks/);
  });
});
