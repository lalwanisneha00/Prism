import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  chapterStart,
  cleanForSpeech,
  estimateSeconds,
  formatClock,
  skip,
  splitSentences,
  totalSeconds,
} from "@/lib/audio/timeline";

describe("cleanForSpeech", () => {
  it("removes markdown and LaTeX that a voice would read out", () => {
    expect(cleanForSpeech("**Flux** is $\\Phi = EA$ and `code`.")).toBe("Flux is and code.");
    expect(cleanForSpeech("# Title\n> quote")).toBe("Title quote");
  });
});

describe("splitSentences", () => {
  it("splits on full stops, questions and exclamations", () => {
    expect(splitSentences("Hello there friend. How are you today? Great news!")).toEqual([
      "Hello there friend.",
      "How are you today?",
      "Great news!",
    ]);
  });

  it("keeps decimals and abbreviations inside one sentence", () => {
    expect(
      splitSentences(
        "Epsilon nought is about 8.85 times ten to the minus twelve. Next sentence here.",
      ),
    ).toEqual([
      "Epsilon nought is about 8.85 times ten to the minus twelve.",
      "Next sentence here.",
    ]);
    expect(
      splitSentences("Use a shape, e.g. a sphere around the charge. Then compute."),
    ).toHaveLength(2);
  });

  it("handles text without a final full stop", () => {
    expect(splitSentences("No ending punctuation here")).toEqual(["No ending punctuation here"]);
    expect(splitSentences("")).toEqual([]);
  });
});

describe("timeline", () => {
  const chapters = [
    {
      id: "a",
      title: "A",
      text: "One two three four five six seven. Eight nine ten eleven twelve thirteen fourteen.",
    },
    { id: "b", title: "B", text: "Fifteen sixteen seventeen eighteen nineteen twenty twentyone." },
  ];
  const timeline = buildTimeline(chapters);

  it("estimates 140 words per minute", () => {
    expect(estimateSeconds("word ".repeat(140))).toBe(60);
    expect(estimateSeconds("word ".repeat(140), 2)).toBe(30);
  });

  it("lays sentences end to end", () => {
    expect(timeline).toHaveLength(3);
    expect(timeline[1].start).toBeCloseTo(timeline[0].duration, 10);
    expect(totalSeconds(timeline)).toBeCloseTo((21 / 140) * 60, 10);
    expect(timeline[2].chapter).toBe(1);
  });

  it("skips forwards and backwards by time, clamped to the ends", () => {
    expect(skip(timeline, 0, 3.5)).toBe(1);
    expect(skip(timeline, 2, -100)).toBe(0);
    expect(skip(timeline, 0, 1000)).toBe(2);
    expect(skip([], 0, 15)).toBe(0);
    // A skip shorter than the current sentence still moves on to the next one.
    expect(skip(timeline, 0, 0.5)).toBe(1);
    expect(skip(timeline, 2, 0.5)).toBe(2); // already at the end
  });

  it("finds where each chapter starts", () => {
    expect(chapterStart(timeline, 1)).toBe(2);
    expect(chapterStart(timeline, 9)).toBe(0);
  });

  it("formats clock times", () => {
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(0)).toBe("0:00");
  });
});
