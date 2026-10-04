import { skillLabel } from "@/data/skills";
import { PREDICTION } from "@/lib/priority/config";
import type { QuestionType, Weakness } from "@/lib/priority/weakness";

/*
 * Topics that may need extra time — SPEC §12.9 part 2.2. Like a weather forecast built from
 * the clouds you can already see: a topic that builds on one you found hard, uses the same
 * skill, or is full of the kind of question you usually miss. Only from real evidence (enough
 * answered questions), worded kindly, and gone as soon as the student improves.
 */

export type TopicNode = {
  /** "subject/topic": unique across the catalogue. */
  key: string;
  subject: string;
  topicId: string;
  name: string;
  /** Prerequisite topic ids within the same subject. */
  requires: readonly string[];
  skills: readonly string[];
  numericalHeavy: boolean;
};

export type Confidence = "low" | "medium" | "high";

export type Prediction = {
  key: string;
  confidence: Confidence;
  /** Plain words: "builds on Gauss's Law, where you scored 40%". */
  reasons: string[];
  /** Revise this first (the weak prerequisite), when there is one. */
  fix?: { key: string; name: string; minutes: number };
};

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const pct = (x: number) => `${Math.round(x * 100)}%`;

function weakDetail(w: Weakness): string {
  return w.latestAccuracy !== undefined ? `, where you scored ${pct(w.latestAccuracy)}` : "";
}

/** Weak topics with enough evidence to predict from (never one wrong answer). */
export function predictableWeak(weak: ReadonlyMap<string, Weakness>): Map<string, Weakness> {
  return new Map([...weak].filter(([, w]) => w.weak && w.questions >= PREDICTION.minQuestions));
}

export function predictTough(input: {
  topics: readonly TopicNode[];
  weak: ReadonlyMap<string, Weakness>;
  /** The kind of question the student usually gets wrong, if clear (see mistakeProfile). */
  mistakeType?: QuestionType;
  /** Topics the student has already done well in: no prediction for these. */
  doneWell?: ReadonlySet<string>;
}): Prediction[] {
  const sources = predictableWeak(input.weak);
  const byKey = new Map(input.topics.map((t) => [t.key, t]));
  const out = new Map<string, Prediction>();
  const add = (key: string, confidence: Confidence, reason: string, fix?: Prediction["fix"]) => {
    if (input.weak.get(key)?.weak || input.doneWell?.has(key)) return;
    const p = out.get(key) ?? { key, confidence, reasons: [] };
    if (RANK[confidence] > RANK[p.confidence]) p.confidence = confidence;
    if (!p.reasons.includes(reason)) p.reasons.push(reason);
    if (fix && !p.fix) p.fix = fix;
    out.set(key, p);
  };

  for (const [weakKey, w] of sources) {
    const source = byKey.get(weakKey);
    if (!source) continue;
    const fix = { key: weakKey, name: source.name, minutes: PREDICTION.reviseMinutes };

    // 1. Builds on the weak topic, directly (high) or further back (medium).
    for (const t of input.topics) {
      if (t.subject !== source.subject || t.key === weakKey) continue;
      const depth = prerequisiteDistance(t, source.topicId, byKey);
      if (depth === 1) add(t.key, "high", `builds on ${source.name}${weakDetail(w)}`, fix);
      else if (depth > 1)
        add(t.key, "medium", `builds on ${source.name} (further back)${weakDetail(w)}`, fix);
    }

    // 2 & 4. Shares an underlying skill, in any subject.
    for (const skill of source.skills) {
      for (const t of input.topics) {
        if (t.key === weakKey || !t.skills.includes(skill)) continue;
        const across = t.subject !== source.subject;
        add(
          t.key,
          across ? "low" : "medium",
          `uses ${skillLabel(skill)}, like ${source.name}${across ? " in another subject" : ""}`,
          fix,
        );
      }
    }
  }

  // 3. The kind of mistake the student usually makes, within the subjects they're studying.
  if (input.mistakeType) {
    const studied = new Set([...sources.keys()].map((k) => byKey.get(k)?.subject));
    const kind = input.mistakeType;
    for (const t of input.topics) {
      if (!studied.has(t.subject)) continue;
      if (kind === "numerical" ? t.numericalHeavy : !t.numericalHeavy) {
        add(
          t.key,
          out.has(t.key) ? "medium" : "low",
          `has many ${kind} questions, the kind you most often get wrong`,
        );
      }
    }
  }

  return [...out.values()].sort((a, b) => RANK[b.confidence] - RANK[a.confidence]);
}

/** How many prerequisite steps from `topic` back to `targetId` (0 = not a prerequisite). */
function prerequisiteDistance(
  topic: TopicNode,
  targetId: string,
  byKey: ReadonlyMap<string, TopicNode>,
): number {
  const seen = new Set<string>();
  let frontier = [...topic.requires];
  for (let depth = 1; frontier.length > 0 && depth <= 8; depth++) {
    if (frontier.includes(targetId)) return depth;
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      next.push(...(byKey.get(`${topic.subject}/${id}`)?.requires ?? []));
    }
    frontier = next;
  }
  return 0;
}

/** "May need extra time: builds on Gauss's Law, where you scored 40%". */
export function predictionNote(p: Prediction): string {
  return `May need extra time: ${p.reasons[0]}`;
}
