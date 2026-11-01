import {
  defaultPattern,
  describePattern,
  EXAM_STYLES,
  examStyleLabel,
  mergePatterns,
  scalePattern,
  suggestMinutes,
  type ExamStyle,
  type PaperKind,
  type PaperPattern,
} from "@/lib/mock/pattern";
import { assignTopics, topicWeights, type PlannedSection } from "@/lib/mock/paper";
import { interleaveByUnit, type ScopeTopic } from "@/lib/mock/scope";
import type { MockSettings } from "@/lib/storage/db";

/*
 * Planning a mock (mock test overhaul): which pattern to copy, the settings to start from, and the
 * paper's skeleton (sections → slots → topics) before the AI writes a word. Pure.
 */

/** An uploaded paper as the Mock Tests page sees it (from this device or another one). */
export type PaperInfo = {
  id: string;
  name: string;
  subject?: string;
  kind: PaperKind;
  year?: number;
  pattern?: PaperPattern;
  /** Its text is on this device (so its pattern can be read, and its questions used for style). */
  local: boolean;
};

/** Papers of one subject (untagged old "previous-year paper" uploads count as end-sem). */
export function papersFor(papers: readonly PaperInfo[], subjectId: string): PaperInfo[] {
  return papers.filter((p) => p.subject === subjectId);
}

/** The exam styles the student has papers for, in a fixed order. */
export function stylesFor(papers: readonly PaperInfo[]): ExamStyle[] {
  return EXAM_STYLES.filter((s) => papers.some((p) => p.kind === s));
}

/** The pattern to copy for a style: from the student's papers when read, otherwise the default. */
export function patternForStyle(
  papers: readonly PaperInfo[],
  style: ExamStyle | "default",
): { pattern: PaperPattern; fromPapers: boolean } {
  if (style !== "default") {
    const merged = mergePatterns(
      papers.filter((p) => p.kind === style && p.pattern).map((p) => p.pattern!),
    );
    if (merged) return { pattern: merged, fromPapers: true };
    return { pattern: defaultPattern(style), fromPapers: false };
  }
  return { pattern: defaultPattern("end-sem"), fromPapers: false };
}

export const MARK_PRESETS = [20, 30, 50, 100] as const;
export const MINUTE_PRESETS = [30, 45, 60, 90, 180] as const;

/** Starting settings: the last ones used for this subject, else 30 marks in the best style known. */
export function startingSettings(
  saved: MockSettings | undefined,
  styles: readonly ExamStyle[],
): MockSettings {
  if (saved) {
    // A style whose papers were deleted falls back to the default pattern.
    const style =
      saved.style === "default" || styles.includes(saved.style) ? saved.style : "default";
    return { ...saved, style };
  }
  const style: ExamStyle | "default" = styles.includes("mid-sem")
    ? "mid-sem"
    : (styles[0] ?? "default");
  return {
    marks: 30,
    minutes: suggestMinutes(30, undefined, examOf(style)),
    style,
    difficulty: "mixed",
    pyqRepeat: false,
  };
}

/** The exam a style's default pattern follows. */
export const examOf = (style: ExamStyle | "default"): ExamStyle =>
  style === "default" ? "end-sem" : style;

/** The suggested time for a total in a style (the papers' own pace when known). */
export function minutesFor(
  marks: number,
  papers: readonly PaperInfo[],
  style: ExamStyle | "default",
): number {
  const { pattern, fromPapers } = patternForStyle(papers, style);
  return suggestMinutes(marks, fromPapers ? pattern : undefined, examOf(style));
}

/** A line for the AI on the style to copy. */
export function styleNote(style: ExamStyle | "default", fromPapers: boolean): string {
  if (style === "default" || !fromPapers)
    return "Follow a standard Indian university exam style (clear, exam-like wording).";
  return `${examStyleLabel[style]} paper: copy the wording, depth and difficulty of the PAST QUESTIONS.`;
}

/** The paper's skeleton: the pattern scaled to the marks, each question given a topic. */
export function planPaper(
  pattern: PaperPattern,
  marks: number,
  topics: readonly ScopeTopic[],
): PlannedSection[] {
  const ordered = interleaveByUnit(topics);
  return assignTopics(
    scalePattern(pattern, marks),
    ordered.map((t) => t.id),
    topicWeights(ordered, pattern.samples),
  );
}

/** One line describing the plan ("Section A: 3 multiple choice × 1 · …"). */
export const describePlan = (plan: readonly PlannedSection[]) => describePattern(plan);

/** Questions asked for in one request: small enough to come back well inside the time limit. */
export const BATCH_SIZE = 6;

/** A section's slots in request-sized batches. */
export function batches(section: PlannedSection, size = BATCH_SIZE): PlannedSection[] {
  const out: PlannedSection[] = [];
  for (let i = 0; i < section.slots.length; i += size)
    out.push({ ...section, slots: section.slots.slice(i, i + size) });
  return out;
}
