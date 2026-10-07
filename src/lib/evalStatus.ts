import accuracy from "@/data/accuracy.json";
import status from "@/data/evalStatus.json";

/*
 * Where a subject stands with its accuracy test. Shown in the app so nobody mistakes "not tested
 * yet" for "tested and fine": the tests for many subjects are written but their runs are paused
 * (they wait for free AI quota), and those subjects stay at the "sourced" tier until run.
 */

export type EvalStatus = "measured" | "pending" | "no-test-set";

const measured = new Set(Object.keys((accuracy as { subjects: Record<string, unknown> }).subjects));
const golden = new Set<string>(status.goldenSubjects);

export function evalStatusOf(subjectId: string): EvalStatus {
  if (measured.has(subjectId)) return "measured";
  return golden.has(subjectId) ? "pending" : "no-test-set";
}

export const evalStatusCopy: Record<EvalStatus, { short: string; long: string }> = {
  measured: { short: "Tested", long: "Its accuracy test has been run." },
  pending: {
    short: "Test not run yet",
    long: "Its test set of key facts is ready, but the accuracy test hasn't been run yet, so no score is shown. Lessons are still sourced and fact-checked.",
  },
  "no-test-set": {
    short: "No test set yet",
    long: "This subject doesn't have an accuracy test set yet. Lessons are sourced and fact-checked, but their accuracy hasn't been measured.",
  },
};
