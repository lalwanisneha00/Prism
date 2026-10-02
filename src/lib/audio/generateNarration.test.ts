import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import {
  buildChapterPrompt,
  chapterCount,
  generateChapter,
  generateOutline,
  MAX_CHAPTERS,
  planFromLesson,
  wordsPerChapter,
} from "@/lib/audio/generateNarration";
import type { GenerateOptions } from "@/lib/llm/types";

const withDuration = (durationMin: number) => ({
  ...sampleLessons[0],
  meta: { ...sampleLessons[0].meta, durationMin },
});

describe("chapter sizing", () => {
  it("keeps the lesson outline for short lessons and adds chapters for long ones", () => {
    expect(chapterCount(10, 4)).toBe(4); // 1,400 words fit in 4 chapters
    expect(chapterCount(30, 4)).toBe(6); // 4,200 words → 6 × 700
    expect(chapterCount(90, 4)).toBe(18); // 12,600 words → 18 × 700
    expect(chapterCount(200, 4)).toBe(MAX_CHAPTERS); // never more than 20 calls
    expect(wordsPerChapter(90, 18)).toBe(700);
  });
});

describe("generateOutline", () => {
  it("uses the lesson's own outline without an AI call when it is long enough", async () => {
    let calls = 0;
    const plan = await generateOutline(withDuration(10), async () => {
      calls++;
      return "{}";
    });
    expect(calls).toBe(0);
    expect(plan).toEqual(planFromLesson(sampleLessons[0]));
  });

  it("asks for a longer outline for a 60-minute lesson and cleans up section ids", async () => {
    const lesson = withDuration(60);
    const n = chapterCount(60, 4);
    const reply = {
      chapters: Array.from({ length: n }, (_, i) => ({
        id: `ch-${i}`,
        title: `Chapter ${i}`,
        brief: "What it covers.",
        sectionId: i === 0 ? "electric-flux" : "not-a-section",
      })),
    };
    let prompt = "";
    const plan = await generateOutline(lesson, async (o: GenerateOptions) => {
      prompt = o.system;
      return JSON.stringify(reply);
    });
    expect(plan).toHaveLength(n);
    expect(prompt).toContain(`exactly ${n} chapters`);
    expect(plan[0].sectionId).toBe("electric-flux");
    expect(plan[1].sectionId).toBeUndefined();
    expect(new Set(plan.map((c) => c.id)).size).toBe(n);
  });

  it("falls back to the short outline if the AI's outline is unusable", async () => {
    const plan = await generateOutline(withDuration(90), async () => "nonsense");
    expect(plan).toEqual(planFromLesson(sampleLessons[0]));
  });
});

describe("generateChapter", () => {
  const lesson = withDuration(10);
  const plan = planFromLesson(lesson);
  const longText = `${"Charge makes a field around it. ".repeat(80)}`;

  it("sizes, positions and grounds each chapter", () => {
    const { prompt, system, target } = buildChapterPrompt(lesson, plan, 2, "Earlier words.");
    expect(target).toBe(350);
    expect(prompt).toContain("CHAPTER 3 OF 4");
    expect(prompt).toContain('ENDED WITH: "Earlier words."');
    expect(prompt).toContain(lesson.sections.find((s) => s.id === "gauss-law-statement")!.title);
    expect(system).toContain("Do not greet");
    expect(buildChapterPrompt(lesson, plan, 0, "").system).toContain("greet the listener briefly");
    expect(buildChapterPrompt(lesson, plan, 3, "").system).toContain("final chapter");
  });

  it("strips symbols the voice would stumble over", async () => {
    const chapter = await generateChapter(lesson, plan, 0, "", async () =>
      JSON.stringify({ text: `**Flux** $\\Phi$ matters. ${longText}` }),
    );
    expect(chapter.text).not.toMatch(/[*$\\]/);
    expect(chapter.id).toBe(plan[0].id);
  });

  it("falls back to the chapter brief when the AI reply is unusable", async () => {
    const chapter = await generateChapter(lesson, plan, 1, "", async () => "nonsense");
    expect(chapter.text).toBe(plan[1].brief);
  });
});
