import type { Band, Importance } from "@/lib/priority/importance";
import {
  importanceFromData,
  studentStateOf,
  topicKey,
  type StudyModel,
} from "@/lib/priority/model";
import { minutesInRange, topicPriority } from "@/lib/priority/priority";
import {
  buildSchedule,
  DEFAULT_BREAKS,
  type Breaks,
  type ScheduleTopic,
} from "@/lib/planner/schedule";
import type { StudyPlan } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

export type BuildPlanParams = {
  subjects: readonly Subject[];
  /** Topic keys ("subject/topic") the student picked. */
  picked: ReadonlySet<string>;
  model: StudyModel;
  level: string;
  range: { min: number; max: number };
  weekMinutes: readonly number[];
  overrides?: Record<string, number>;
  startDate: string;
  days: number;
  examDate?: string;
  flashcards: boolean;
  finalReview: boolean;
  breaks?: Breaks;
  /** Importance from the student's papers etc. (key → importance); falls back to syllabus data. */
  importance?: ReadonlyMap<string, Importance>;
  now?: number;
};

/** Picked topics → priorities → minutes in the chosen range → day-by-day v2 plan. */
export function buildV2Plan(p: BuildPlanParams): StudyPlan {
  const now = p.now ?? Date.now();
  const topics: ScheduleTopic[] = [];
  const raw: {
    key: string;
    subject: string;
    name: string;
    requires: string[];
    pr: ReturnType<typeof topicPriority>;
  }[] = [];
  for (const s of p.subjects) {
    const imp = importanceFromData(s, p.model.overrides);
    for (const c of s.chapters) {
      for (const t of c.topics) {
        const key = topicKey(s.id, t.id);
        if (!p.picked.has(key)) continue;
        const importance = p.importance?.get(key) ?? imp.get(t.id)!;
        const pr = topicPriority(key, importance, studentStateOf(p.model, key), p.level);
        raw.push({
          key,
          subject: s.id,
          name: t.name,
          requires: (t.requires ?? []).map((r) => topicKey(s.id, r)),
          pr,
        });
      }
    }
  }
  const minutes = raw.length
    ? minutesInRange(
        raw.map((r) => r.pr),
        p.range.min,
        p.range.max,
      )
    : new Map<string, number>();
  for (const r of raw) {
    topics.push({
      key: r.key,
      subject: r.subject,
      name: r.name,
      requires: r.requires,
      minutes: minutes.get(r.key) ?? p.range.min,
      priority: r.pr.priority,
      tags: r.pr.tags,
      band: r.pr.band as Band,
    });
  }
  const result = buildSchedule({
    topics,
    startDate: p.startDate,
    days: p.days,
    weekMinutes: p.weekMinutes,
    overrides: p.overrides,
    breaks: p.breaks ?? DEFAULT_BREAKS,
    flashcards: p.flashcards,
    finalReview: p.finalReview,
  });
  const byKey = new Map(topics.map((t) => [t.key, t]));
  const first = p.subjects[0]?.id ?? "";
  return {
    id: `plan:main`,
    subject: first,
    level: p.level,
    lessonMinutes: p.range.max,
    minutesPerDay: Math.round(p.weekMinutes.reduce((a, b) => a + b, 0) / 7),
    startDate: p.startDate,
    ...(p.examDate ? { examDate: p.examDate } : {}),
    days: result.days.map((d) => ({
      date: d.date,
      available: d.available,
      sessions: d.sessions.map((s) => ({ itemIds: s.itemIds, breakAfter: s.breakAfter })),
      items: d.items.map((i) => {
        const t = i.topicKey ? byKey.get(i.topicKey) : undefined;
        return {
          id: i.id,
          kind: i.kind,
          topicId: t ? t.key.slice(t.subject.length + 1) : undefined,
          subject: t?.subject,
          minutes: i.minutes,
          done: false,
          tags: t ? [...t.tags] : undefined,
        };
      }),
    })),
    overflow: result.overflow.map((t) => t.key),
    createdAt: now,
    updatedAt: now,
    deleted: false,
    version: 2,
    subjects: p.subjects.map((s) => s.id),
    range: p.range,
    weekMinutes: [...p.weekMinutes],
    overrides: p.overrides ?? {},
    breaks: p.breaks ?? DEFAULT_BREAKS,
    flashcards: p.flashcards,
    finalReview: p.finalReview,
  };
}
