import type { Verdict } from "@/lib/mock/examiner";
import {
  duplicateIssues,
  type Feedback,
  type Paper,
  type PaperQuestion,
  type PlannedSection,
} from "@/lib/mock/paper";
import { batches } from "@/lib/mock/plan";

/*
 * Checking and fixing a written paper (mock quality upgrade). The whole paper goes to the
 * examiner in one call; code adds its own repeat check. Only failed questions are sent back: the
 * writer corrects them with the examiner's notes (up to MAX_RETRIES times), then writes a
 * completely new question instead, and every rewrite is examined again. A question that still
 * fails stops the paper: checks are never relaxed to fill it. Like a paper going back and forth
 * between setter and moderator, only for the questions the moderator marked.
 */

/** Corrections per question before it is replaced by a new one. */
export const MAX_RETRIES = 2;

export type ReviewStage = { stage: "checking" | "fixing"; round: number; failing: number };

export type ReviewDeps = {
  /** One examiner call over `questions`; `accepted` is the rest of the paper (repeat check). */
  examine: (
    questions: readonly PaperQuestion[],
    accepted: readonly PaperQuestion[],
  ) => Promise<Verdict[]>;
  /** Rewrites one batch of a section's slots, using the examiner's feedback. */
  rewrite: (
    batch: PlannedSection,
    feedback: readonly Feedback[],
    accepted: readonly PaperQuestion[],
  ) => Promise<PaperQuestion[]>;
  onProgress?: (stage: ReviewStage) => void;
};

export type ReviewReport = {
  /** Examiner calls made (1 when the first check passes everything). */
  examinerCalls: number;
  /** Questions corrected or replaced before the paper was shown. */
  corrected: number;
};

export class ReviewFailed extends Error {
  constructor(readonly failing: readonly Verdict[]) {
    super(`questions still failing the examiner: ${failing.map((f) => f.id).join(", ")}`);
  }
}

/** The failed question as the writer sees it again. */
function previousText(q: PaperQuestion): string {
  const options = q.options?.map((o, i) => `(${"abcd"[i]}) ${o}`).join(" ");
  return `${q.question}${options ? ` Options: ${options}` : ""} Answer: ${q.answer}`.slice(0, 1500);
}

export async function reviewPaper(
  paper: Paper,
  plan: readonly PlannedSection[],
  deps: ReviewDeps,
): Promise<{ paper: Paper; report: ReviewReport }> {
  const byId = new Map(paper.sections.flatMap((s) => s.questions.map((q) => [q.id, q] as const)));
  const order = [...byId.keys()];
  const get = (id: string) => byId.get(id)!;
  const tries = new Map<string, number>();
  const corrected = new Set<string>();
  let toCheck = order;
  let examinerCalls = 0;

  for (let round = 0; ; round++) {
    deps.onProgress?.({ stage: "checking", round, failing: toCheck.length });
    const checking = new Set(toCheck);
    const verdicts = new Map(
      (await deps.examine(toCheck.map(get), order.filter((id) => !checking.has(id)).map(get))).map(
        (v) => [v.id, v],
      ),
    );
    examinerCalls++;
    const failing: Verdict[] = toCheck
      .map(
        (id) =>
          verdicts.get(id) ?? {
            id,
            pass: false,
            issues: ["the examiner didn't check this question"],
            fix: "",
          },
      )
      .filter((v) => !v.pass)
      .map((v) => ({ ...v, issues: [...v.issues] }));
    // Code's own repeat check over the whole paper (the AI can miss a reworded repeat).
    for (const d of duplicateIssues(order.map(get))) {
      const f = failing.find((v) => v.id === d.id);
      if (f) f.issues.push(d.reason);
      else
        failing.push({
          id: d.id,
          pass: false,
          issues: [d.reason],
          fix: "Test a different idea of the topic.",
        });
    }
    if (failing.length === 0) {
      const sections = paper.sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => get(q.id)),
      }));
      return {
        paper: { ...paper, sections },
        report: { examinerCalls, corrected: corrected.size },
      };
    }
    if (failing.some((f) => (tries.get(f.id) ?? 0) > MAX_RETRIES)) throw new ReviewFailed(failing);

    deps.onProgress?.({ stage: "fixing", round, failing: failing.length });
    const failed = new Map(failing.map((f) => [f.id, f]));
    const accepted = order.filter((id) => !failed.has(id)).map(get);
    for (const section of plan) {
      const slots = section.slots.filter((s) => failed.has(s.id));
      if (slots.length === 0) continue;
      for (const batch of batches({ ...section, slots })) {
        const feedback: Feedback[] = batch.slots.map((slot) => {
          const f = failed.get(slot.id)!;
          // Corrected up to MAX_RETRIES times; after that, a completely new question.
          return (tries.get(slot.id) ?? 0) < MAX_RETRIES
            ? { slot: slot.id, issues: f.issues, fix: f.fix, previous: previousText(get(slot.id)) }
            : { slot: slot.id, issues: f.issues };
        });
        const written = await deps.rewrite(batch, feedback, accepted);
        for (const slot of batch.slots) {
          const q = written.find((w) => w.id === slot.id);
          if (!q) throw new ReviewFailed([failed.get(slot.id)!]);
          byId.set(slot.id, q);
          tries.set(slot.id, (tries.get(slot.id) ?? 0) + 1);
          corrected.add(slot.id);
        }
      }
    }
    toCheck = failing.map((f) => f.id);
  }
}
