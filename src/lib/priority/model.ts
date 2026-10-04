import { DESCRIPTIVE_TOPIC, inferSkills, NUMERICAL_SETS } from "@/data/skills";
import { listAllAnnotations } from "@/lib/annotations/store";
import { paperStats } from "@/lib/chapter/estimate";
import { listChapterLessons } from "@/lib/chapter/store";
import { sectionText } from "@/lib/extract/types";
import { listMockResults } from "@/lib/mock/results";
import { listLocalNotes } from "@/lib/notes/store";
import { PREDICTION } from "@/lib/priority/config";
import {
  dependentCounts,
  topicImportance,
  type Band,
  type Importance,
} from "@/lib/priority/importance";
import { predictTough, type Prediction, type TopicNode } from "@/lib/priority/predict";
import { listSignals } from "@/lib/priority/signals";
import {
  mistakeProfile,
  weakness,
  type LearningSignal,
  type Weakness,
} from "@/lib/priority/weakness";
import { getSettings, listQuizAttempts } from "@/lib/storage/progress";
import type { Subject, Topic } from "@/lib/subjects";

/*
 * What the student's own data says, gathered once for the priority engine (V3 · Step 11).
 * Everything is read on this device; missing data simply means that factor isn't used.
 */

export const topicKey = (subject: string, topic: string) => `${subject}/${topic}`;
export const chapterKey = (subject: string, chapter: string) => `${subject}/chapter:${chapter}`;

export type StudyModel = {
  weakness: Map<string, Weakness>;
  predictions: Map<string, Prediction>;
  /** Topics finished with a good score: shorter refreshers, no predictions. */
  doneWell: Set<string>;
  overrides: Record<string, Band>;
  /** Topics with any quiz or mock result. */
  tried: Set<string>;
};

export const EMPTY_MODEL: StudyModel = {
  weakness: new Map(),
  predictions: new Map(),
  doneWell: new Set(),
  overrides: {},
  tried: new Set(),
};

export function topicNodes(subjects: readonly Subject[]): TopicNode[] {
  return subjects.flatMap((s) =>
    s.chapters.flatMap((c) =>
      c.topics.map((t) => ({
        key: topicKey(s.id, t.id),
        subject: s.id,
        topicId: t.id,
        name: t.name,
        requires: t.requires ?? [],
        skills: t.skills ?? inferSkills(t.name, c.name),
        numericalHeavy: isNumericalHeavy(s, t),
      })),
    ),
  );
}

export function isNumericalHeavy(subject: Subject, topic: Topic): boolean {
  return NUMERICAL_SETS.has(subject.visualSet ?? "") && !DESCRIPTIVE_TOPIC.test(topic.name);
}

/** Gathers every signal per "subject/topic" and works out weakness and predictions. */
export async function loadStudyModel(
  subjects: readonly Subject[],
  now = Date.now(),
): Promise<StudyModel> {
  const [attempts, mocks, annotations, signals, chapterLessons, settings] = await Promise.all([
    listQuizAttempts().catch(() => []),
    listMockResults().catch(() => []),
    listAllAnnotations().catch(() => []),
    listSignals().catch(() => []),
    listChapterLessons().catch(() => []),
    getSettings().catch(() => undefined),
  ]);
  const byKey = new Map<string, LearningSignal[]>();
  const push = (key: string, s: LearningSignal) => byKey.set(key, [...(byKey.get(key) ?? []), s]);

  for (const a of attempts) {
    if (a.total > 0)
      push(topicKey(a.subject, a.topic), {
        kind: "quiz",
        at: a.at,
        score: a.score,
        total: a.total,
      });
  }
  for (const m of mocks) {
    for (const t of m.byTopic) {
      if (t.total > 0)
        push(topicKey(m.subject, t.topic), {
          kind: "mock",
          at: m.at,
          score: t.score,
          total: t.total,
        });
    }
  }
  for (const a of annotations) {
    if (!a.deleted && a.color === "confused")
      push(topicKey(a.subject, a.topic), { kind: "confused", at: a.createdAt });
  }
  for (const s of signals) {
    const key = topicKey(s.subject, s.topic);
    if (s.kind === "simpler") push(key, { kind: "simpler", at: s.at });
    else push(key, { kind: "wrong", at: s.at, question: s.question ?? "", type: s.questionType });
  }
  // A whole-chapter lesson left part-way: its unfinished topics count once, a day later.
  for (const c of chapterLessons) {
    const done = new Set(c.done ?? []);
    if (done.size === 0 || now - c.updatedAt < 86_400_000) continue;
    for (const t of c.order)
      if (!done.has(t.id)) push(topicKey(c.subject, t.id), { kind: "abandoned", at: c.updatedAt });
  }

  const weak = new Map<string, Weakness>();
  for (const [key, list] of byKey) weak.set(key, weakness(list, now));
  const tried = new Set(
    [...byKey]
      .filter(([, l]) => l.some((s) => s.kind === "quiz" || s.kind === "mock"))
      .map(([k]) => k),
  );
  const doneWell = new Set(
    [...weak]
      .filter(([k, w]) => tried.has(k) && !w.weak && (w.latestAccuracy ?? 0) >= 0.8)
      .map(([k]) => k),
  );
  const allSignals = [...byKey.values()].flat();
  const predictions = predictTough({
    topics: topicNodes(subjects),
    weak,
    mistakeType: mistakeProfile(allSignals, PREDICTION.minWrongForType, PREDICTION.typeShare),
    doneWell,
  });
  return {
    weakness: weak,
    predictions: new Map(predictions.map((p) => [p.key, p])),
    doneWell,
    overrides: settings?.importanceOverrides ?? {},
    tried,
  };
}

/** The student's state for one topic, for lesson length and priority. */
export function studentStateOf(
  model: StudyModel,
  key: string,
): "new" | "tried" | "weak" | "tough" | "done-well" {
  if (model.weakness.get(key)?.weak) return "weak";
  if (model.predictions.has(key)) return "tough";
  if (model.doneWell.has(key)) return "done-well";
  if (model.tried.has(key)) return "tried";
  return "new";
}

/**
 * Importance of every topic in a subject, from the syllabus data, the prerequisite map, the
 * student's previous-year papers for the subject (if uploaded) and their own overrides.
 */
export async function subjectImportance(
  subject: Subject,
  overrides: Record<string, Band>,
): Promise<Map<string, Importance>> {
  const notes = await listLocalNotes().catch(() => []);
  const papers = notes.filter(
    (n) => n.kind === "pyq" && (!n.subject || n.subject === subject.id) && n.sections?.length,
  );
  const allTopics = subject.chapters.flatMap((c) => c.topics);
  const stats =
    papers.length > 0
      ? paperStats(
          papers.map((n) => {
            const out = new Set(n.excluded ?? []);
            return (n.sections ?? [])
              .filter((s) => !out.has(s.index))
              .map(sectionText)
              .join("\n");
          }),
          allTopics,
          subject.chapters,
        )
      : undefined;
  return importanceFromData(
    subject,
    overrides,
    stats && {
      total: stats.total,
      papersWithTopic: perTopicPaperCount(stats.topicHits, stats.total),
    },
  );
}

/** Questions per topic → "in how many papers" (at most the number of papers). */
function perTopicPaperCount(hits: Record<string, number>, total: number): Record<string, number> {
  return Object.fromEntries(Object.entries(hits).map(([k, v]) => [k, Math.min(v, total)]));
}

/** Pure part of subjectImportance (tested without storage). */
export function importanceFromData(
  subject: Subject,
  overrides: Record<string, Band>,
  papers?: { total: number; papersWithTopic: Record<string, number> },
): Map<string, Importance> {
  const allTopics = subject.chapters.flatMap((c) => c.topics);
  const deps = dependentCounts(allTopics);
  const maxDeps = Math.max(1, ...deps.values());
  const totalHours = subject.chapters.reduce((s, c) => s + (c.hours ?? 0), 0);
  const totalMarks = subject.chapters.reduce((s, c) => s + (c.marks ?? 0), 0);
  const hoursKnown = subject.chapters.every((c) => c.hours);
  const marksKnown = subject.chapters.every((c) => c.marks);
  const out = new Map<string, Importance>();
  for (const c of subject.chapters) {
    for (const t of c.topics) {
      out.set(
        t.id,
        topicImportance({
          papers: papers
            ? { inPapers: papers.papersWithTopic[t.id] ?? 0, totalPapers: papers.total }
            : undefined,
          unit:
            hoursKnown || marksKnown
              ? {
                  hours: hoursKnown ? c.hours : undefined,
                  totalHours: hoursKnown ? totalHours : undefined,
                  marks: marksKnown ? c.marks : undefined,
                  totalMarks: marksKnown ? totalMarks : undefined,
                  units: subject.chapters.length,
                }
              : undefined,
          dependents: { count: deps.get(t.id) ?? 0, max: maxDeps },
          override:
            overrides[topicKey(subject.id, t.id)] ?? overrides[chapterKey(subject.id, c.id)],
        }),
      );
    }
  }
  return out;
}
