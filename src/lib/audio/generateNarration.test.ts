import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import {
  buildNarrationPrompt,
  generateNarration,
  wordsPerChapter,
} from "@/lib/audio/generateNarration";
import type { GenerateOptions } from "@/lib/llm/types";

const lesson = { ...sampleLessons[0], meta: { ...sampleLessons[0].meta, durationMin: 10 } };

describe("wordsPerChapter", () => {
  it("splits 140 words per minute across the chapters", () => {
    expect(wordsPerChapter(10, 4)).toBe(350);
    expect(wordsPerChapter(5, 0)).toBe(700);
  });
});

describe("buildNarrationPrompt", () => {
  it("gives the chapter its section content, length and position", () => {
    const { prompt, system, target } = buildNarrationPrompt(lesson, 2, "Earlier words.");
    expect(target).toBe(350);
    expect(prompt).toContain("CHAPTER 3 OF 4");
    expect(prompt).toContain(lesson.sections.find((s) => s.id === "gauss-law-statement")!.title);
    expect(prompt).toContain('ENDED WITH: "Earlier words."');
    expect(system).toContain("Do not greet");
    expect(buildNarrationPrompt(lesson, 0, "").system).toContain("greet the listener briefly");
    expect(buildNarrationPrompt(lesson, 3, "").system).toContain("final chapter");
  });
});

describe("generateNarration", () => {
  const longText = (n: number) => `${"Charge makes a field around it. ".repeat(Math.ceil(n / 6))}`;

  it("writes every chapter, in order, and reports each as it is ready", async () => {
    const seen: number[] = [];
    const prompts: string[] = [];
    const chapters = await generateNarration(
      lesson,
      async (o: GenerateOptions) => {
        prompts.push(o.prompt);
        return JSON.stringify({ text: longText(350) });
      },
      (i) => seen.push(i),
    );
    expect(chapters).toHaveLength(4);
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(prompts[1]).toContain("THE PREVIOUS CHAPTER ENDED WITH");
  });

  it("strips symbols the voice would stumble over", async () => {
    const [first] = await generateNarration(
      lesson,
      async () => JSON.stringify({ text: `**Flux** $\\Phi$ matters. ${longText(350)}` }),
      () => {},
    );
    expect(first.text).not.toMatch(/[*$\\]/);
  });

  it("falls back to the outline when the AI reply is unusable", async () => {
    const chapters = await generateNarration(
      lesson,
      async () => "nonsense",
      () => {},
    );
    expect(chapters[0].text).toBe(lesson.audioScript[0].text);
  });
});
