import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import type { GenerateOptions } from "@/lib/llm/types";
import { fakeWorksheet } from "@/lib/worksheet/fakeWorksheet";
import { buildWorksheetPrompt, generateWorksheet } from "@/lib/worksheet/generateWorksheet";

const lesson = sampleLessons[0];

describe("generateWorksheet", () => {
  it("asks for the right number of practice questions and returns them", async () => {
    const prompts: string[] = [];
    const sheet = await generateWorksheet(lesson, { mode: "practice", count: 6 }, async (o) => {
      prompts.push(o.prompt);
      return JSON.stringify(fakeWorksheet(o.prompt));
    });
    expect(sheet.questions).toHaveLength(6);
    expect(prompts).toHaveLength(1);
    expect(sheet.questions.map((q) => q.marks)).toEqual([2, 2, 5, 5, 10, 10]);
  });

  it("solves past-paper questions in order", async () => {
    const questions = ["State Gauss's law.", "Find E for a line charge."];
    const { prompt } = buildWorksheetPrompt(lesson, { mode: "pyq", questions });
    expect(prompt).toContain("1. State Gauss's law.\n2. Find E for a line charge.");
    const sheet = await generateWorksheet(lesson, { mode: "pyq", questions }, async (o) =>
      JSON.stringify(fakeWorksheet(o.prompt)),
    );
    expect(sheet.questions.map((q) => q.question)).toEqual(questions);
  });

  it("repairs broken maths and gives up after three tries", async () => {
    const bad = fakeWorksheet("exactly 4 exam questions");
    bad.questions[0].answer = String.raw`$\frac{1}{$`;
    const calls: GenerateOptions[] = [];
    const sheet = await generateWorksheet(lesson, { mode: "practice", count: 4 }, async (o) => {
      calls.push(o);
      return JSON.stringify(calls.length === 1 ? bad : fakeWorksheet(o.prompt));
    });
    expect(calls).toHaveLength(2);
    expect(calls[1].prompt).toContain("PREVIOUS REPLY HAD THESE PROBLEMS");
    expect(sheet.questions[0].answer).not.toContain("frac{1}{$");

    await expect(
      generateWorksheet(lesson, { mode: "practice", count: 4 }, async () => "no json"),
    ).rejects.toThrow(/worksheet failed checks/);
  });
});
