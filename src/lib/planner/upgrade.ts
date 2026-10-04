import type { StudyPlan } from "@/lib/storage/db";

/** Plans made before V3 · Step 11 have no `version`; this makes them v2 so one UI handles both. */
export function upgradePlan(plan: StudyPlan): StudyPlan {
  if (plan.version === 2) return plan;
  return {
    ...plan,
    version: 2,
    subjects: [plan.subject],
    range: { min: plan.lessonMinutes, max: plan.lessonMinutes },
    weekMinutes: Array.from({ length: 7 }, () => plan.minutesPerDay),
    overrides: {},
    days: plan.days.map((d) => ({
      ...d,
      available: d.items.reduce((s, i) => s + i.minutes, 0),
      items: d.items.map((i) => ({ ...i, subject: i.subject ?? plan.subject, tags: i.tags ?? [] })),
    })),
    overflow: plan.overflow.map((o) => (o.includes("/") ? o : `${plan.subject}/${o}`)),
  };
}
