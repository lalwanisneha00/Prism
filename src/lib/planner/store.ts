import { listAllAnnotations } from "@/lib/annotations/store";
import { listCards } from "@/lib/flashcards/cards";
import { localDate } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import { listRecent } from "@/lib/storage/library";
import { listQuizAttempts } from "@/lib/storage/progress";
import { getAllRecords, getRecord, putRecord } from "@/lib/storage/records";

/* Study plans (one per subject) and the activity history behind the streak. */

export const planId = (subject: string) => `plan:${subject}`;

export async function getPlan(subject: string): Promise<StudyPlan | null> {
  const plan = await getRecord("plans", planId(subject));
  return plan && !plan.deleted ? plan : null;
}

export async function listPlans(): Promise<StudyPlan[]> {
  return (await getAllRecords("plans")).filter((p) => !p.deleted);
}

export async function savePlan(plan: StudyPlan, now = Date.now()): Promise<StudyPlan> {
  const next = { ...plan, updatedAt: now };
  await putRecord("plans", next);
  return next;
}

/** Ticks a plan item on or off (synced, so the other device sees it too). */
export async function setItemDone(
  plan: StudyPlan,
  itemId: string,
  done: boolean,
  now = Date.now(),
): Promise<StudyPlan> {
  return savePlan(
    {
      ...plan,
      days: plan.days.map((d) => ({
        ...d,
        items: d.items.map((i) =>
          i.id === itemId ? { ...i, done, doneAt: done ? now : undefined } : i,
        ),
      })),
    },
    now,
  );
}

export async function deletePlan(plan: StudyPlan, now = Date.now()): Promise<void> {
  await putRecord("plans", { ...plan, deleted: true, updatedAt: now });
}

/** Every day the student studied something: opened a lesson, took a quiz, reviewed cards, … */
export async function activityDays(): Promise<Set<string>> {
  const [recent, attempts, cards, notes, plans] = await Promise.all([
    listRecent(200),
    listQuizAttempts(),
    listCards(),
    listAllAnnotations(),
    listPlans(),
  ]);
  const stamps = [
    ...recent.map((r) => r.viewedAt),
    ...attempts.map((a) => a.at),
    ...cards.flatMap((c) => (c.srs.lastReviewed ? [c.srs.lastReviewed] : [])),
    ...notes.map((n) => n.createdAt),
    ...plans.flatMap((p) =>
      p.days.flatMap((d) => d.items.flatMap((i) => (i.doneAt ? [i.doneAt] : []))),
    ),
  ];
  return new Set(stamps.map(localDate));
}
