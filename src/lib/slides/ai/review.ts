import { z } from "zod";
import type { DeckBrief } from "@/lib/slides/ai/outline";
import { slideText, type AiSlide, type WriteFeedback } from "@/lib/slides/ai/write";
import type { Purpose } from "@/lib/slides/plan";

/*
 * Step 3 of a deck (deck quality overhaul): one review pass over the whole deck before export,
 * for teaching, self-study and practice decks only (revision decks and one-page summaries skip it
 * to stay fast). A separate AI call reads every slide like a strict colleague: accuracy (formulas,
 * units, facts, code), the depth rule, and every activity against the reject list. Flagged slides
 * are rewritten with its notes and checked again; at most MAX_ROUNDS rounds.
 */

/** Purposes that get the AI review (the others get code checks only). */
export const REVIEWED: ReadonlySet<Purpose> = new Set(["teach", "study", "practice"]);
/** Review → fix rounds before the deck is exported as it stands. */
export const MAX_ROUNDS = 2;

export const DeckReviewSchema = z.object({
  results: z
    .array(
      z.object({
        index: z.int().min(1),
        pass: z.boolean(),
        issues: z.array(z.string().trim().max(400)).max(8).default([]),
        fix: z.string().trim().max(800).default(""),
      }),
    )
    .max(80),
});
export type SlideVerdict = { index: number; pass: boolean; issues: string[]; fix: string };

/** A slide as the reviewer reads it (activities with their facilitation guide). */
export function reviewText(s: AiSlide): string {
  const base = `[${s.layout}] ${slideText(s)}`;
  if (s.layout !== "activity") return base;
  const f = s.facilitation;
  return `${base} | format ${s.format}, ${s.minutes} min, ${s.group} | expected answer: ${f.answer} | hints: ${f.hints.join(" / ")} | wrong answers: ${f.wrongAnswers.map((w) => w.answer).join(" / ")}`;
}

export function reviewPrompt(
  brief: DeckBrief,
  slides: readonly { index: number; slide: AiSlide }[],
  others: readonly string[],
): { system: string; prompt: string } {
  const system = `You are a strict senior teacher reviewing a ${brief.purpose === "teach" ? "teaching" : brief.purpose === "study" ? "self-study" : "practice"} deck for ${brief.course} (${brief.level} level) before it is used. Your job is to FIND PROBLEMS, not to approve.
For every slide check:
1. Accuracy: every formula, unit, number, definition, fact and line of code is correct (re-derive numbers, trace code). Implementation-defined behaviour must not be stated as universal.
2. Depth: the slide genuinely explains (what it is, why it works, a concrete example, a takeaway for concept slides). Fail thin slides (a few vague words) and walls of text.
3. Activities: fail any that has a one-word or one-definition answer, is answered word for word on an earlier slide, could be solved with one Google search, is "discuss X" with no specific question or twist, or is a plain recall MCQ. An activity must make college students reason.
4. No slide repeats another slide's content.
"pass": true only if you found nothing wrong. "issues": each problem in one precise sentence. "fix": what to change, concretely.
Reply with JSON only: {"results":[{"index":3,"pass":false,"issues":["..."],"fix":"..."},{"index":4,"pass":true,"issues":[],"fix":""}]}`;
  const prompt = `Deck: ${brief.title}

SLIDES TO REVIEW:
${slides.map((s) => `${s.index}. ${reviewText(s.slide)}`).join("\n\n")}${others.length ? `\n\nOTHER SLIDES OF THE DECK (context only):\n${others.map((t) => `- ${t}`).join("\n")}` : ""}`;
  return { system, prompt };
}

export type DeckReviewDeps = {
  /** One review call over these slides (1-based deck positions); `others` for context. */
  review: (
    slides: readonly { index: number; slide: AiSlide }[],
    others: readonly string[],
  ) => Promise<SlideVerdict[]>;
  /** Rewrites the slides at these 0-based positions with the reviewer's feedback. */
  rewrite: (feedback: readonly WriteFeedback[]) => Promise<Map<number, AiSlide>>;
  onProgress?: (stage: { stage: "reviewing" | "fixing"; round: number; flagged: number }) => void;
};

export type DeckReviewReport = { rounds: number; fixed: number; stillFlagged: number };

/**
 * Reviews the deck, rewrites flagged slides, and re-reviews only those, up to MAX_ROUNDS times.
 * Slides still flagged after that are kept (the deck is never left with holes) and counted in the
 * report, so the student is told honestly.
 */
export async function reviewDeck(
  slides: readonly AiSlide[],
  deps: DeckReviewDeps,
): Promise<{ slides: AiSlide[]; report: DeckReviewReport }> {
  const current = [...slides];
  let toCheck = current.map((_, i) => i);
  const fixed = new Set<number>();
  let rounds = 0;
  for (let round = 0; round < MAX_ROUNDS + 1; round++) {
    deps.onProgress?.({ stage: "reviewing", round, flagged: toCheck.length });
    const checking = new Set(toCheck);
    const verdicts = await deps.review(
      toCheck.map((i) => ({ index: i + 1, slide: current[i] })),
      current.flatMap((s, i) =>
        checking.has(i)
          ? []
          : [
              `${i + 1}. ${s.layout}: ${s.layout === "statement" ? s.text : "title" in s ? s.title : ""}`,
            ],
      ),
    );
    rounds++;
    const byIndex = new Map(verdicts.map((v) => [v.index - 1, v]));
    // A slide the reviewer skipped is not called checked: it is reviewed again next round.
    const flagged = toCheck.filter((i) => byIndex.get(i)?.pass !== true);
    if (flagged.length === 0 || round === MAX_ROUNDS) {
      return {
        slides: current,
        report: { rounds, fixed: fixed.size, stillFlagged: flagged.length },
      };
    }
    deps.onProgress?.({ stage: "fixing", round, flagged: flagged.length });
    const feedback: WriteFeedback[] = flagged.map((i) => {
      const v = byIndex.get(i);
      return {
        index: i,
        issues: v?.issues.length
          ? v.issues
          : ["the reviewer didn't check this slide; make sure it is correct and deep enough"],
        ...(v?.fix ? { fix: v.fix } : {}),
        previous: reviewText(current[i]).slice(0, 1500),
      };
    });
    const rewritten = await deps.rewrite(feedback);
    for (const [i, s] of rewritten) {
      current[i] = s;
      fixed.add(i);
    }
    toCheck = flagged;
  }
  return { slides: current, report: { rounds, fixed: fixed.size, stillFlagged: 0 } };
}

/** The test AI's reviewer: passes every slide. */
export function fakeReview(slides: readonly { index: number }[]): z.input<typeof DeckReviewSchema> {
  return { results: slides.map((s) => ({ index: s.index, pass: true, issues: [], fix: "" })) };
}
