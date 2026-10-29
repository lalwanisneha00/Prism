import { sameTopic } from "@/lib/custom/matchSyllabus";
import type { ParsedUnit } from "@/lib/syllabusFix/handoutCourse";
import { singular } from "@/lib/university/match";
import { normalize } from "@/lib/topicSearch";

/*
 * Phase 8 re-check: after the Phase 2 import, compare each course with its handout again and fix
 * what is still out of place, conservatively:
 *   - a visible topic that the handout puts in another unit moves to that unit's chapter;
 *   - when that chapter already shows the same topic, the misplaced copy is hidden instead
 *     (soft: its id still opens), so nothing is listed twice;
 *   - a hidden topic (kept only so old links work) that the handout lists, and that no visible
 *     topic covers, is shown again in its unit's chapter, unless it is a cut-off piece of a
 *     longer topic ("Polar form)", "Proteins: Primary").
 * A unit's chapter is the active chapter holding most of that unit's topics today (one chapter
 * per unit), so short or generic names cannot pull a topic back and forth. Anything unclear is
 * left alone. Ids never change.
 */

export type RecheckTopic = { id: string; name: string; status?: string; [k: string]: unknown };
export type RecheckChapter = {
  id: string;
  name: string;
  status?: string;
  topics: RecheckTopic[];
  [k: string]: unknown;
};

export type RecheckFix = {
  kind: "move" | "hide" | "unhide";
  topic: string;
  name: string;
  from: string;
  to: string;
  unit: string;
};

/** A unit needs at least this many of its topics in one chapter to call that chapter its own. */
export const MIN_VOTES = 2;

const retired = (x: { status?: string }) => x.status === "retired";

const words = (name: string) =>
  normalize(name.replace(/['’]s\b/gi, ""))
    .split(" ")
    .filter((w) => w.length > 1)
    .map(singular);

/** One-word names ("stress", "slope") say too little to place a topic. */
function placeable(name: string): boolean {
  return words(name).length >= 2;
}

/** A cut-off piece of a longer topic: unclosed bracket, or one word after a list head. */
function fragment(name: string): boolean {
  const open = (name.match(/[([]/g) ?? []).length;
  const close = (name.match(/[)\]]/g) ?? []).length;
  if (open !== close) return true;
  if (!/:|-/.test(name)) return false;
  const tail = name.split(/:|\s[-–]\s?|-\s/).at(-1) ?? "";
  return words(tail).length <= 1;
}

/** A visible topic already teaches the handout topic: same topic, or holds all its words. */
function shownBy(handoutTopic: string, visible: string): boolean {
  if (sameTopic(handoutTopic, visible)) return true;
  const inside = words(visible);
  const need = words(handoutTopic);
  return need.length > 0 && need.every((w) => inside.includes(w));
}

/** Indices of the units that list this topic. */
function unitsOf(name: string, units: readonly ParsedUnit[]): number[] {
  return units.flatMap((u, i) => (u.topics.some((h) => sameTopic(name, h)) ? [i] : []));
}

/** Where the topic sits in its unit's list (for ordering inside the chapter). */
function indexIn(name: string, unit: ParsedUnit): number {
  return unit.topics.findIndex((h) => sameTopic(name, h));
}

/** Unit index → the active chapter that holds it (one chapter per unit). */
export function unitChapters(
  chapters: readonly RecheckChapter[],
  units: readonly ParsedUnit[],
): Map<number, string> {
  const pairs: { unit: number; chapter: string; votes: number; gap: number }[] = [];
  chapters.forEach((c, position) => {
    if (retired(c)) return;
    const votes = new Map<number, number>();
    for (const t of c.topics) {
      if (!placeable(t.name)) continue;
      const hit = unitsOf(t.name, units);
      if (hit.length === 1) votes.set(hit[0], (votes.get(hit[0]) ?? 0) + 1);
    }
    for (const [unit, n] of votes)
      if (n >= MIN_VOTES)
        pairs.push({ unit, chapter: c.id, votes: n, gap: Math.abs(unit - position) });
  });
  pairs.sort((a, b) => b.votes - a.votes || a.gap - b.gap);
  const out = new Map<number, string>();
  const taken = new Set<string>();
  for (const p of pairs) {
    if (out.has(p.unit) || taken.has(p.chapter)) continue;
    out.set(p.unit, p.chapter);
    taken.add(p.chapter);
  }
  // A unit with no clear majority keeps a chapter of the same name, when one is free.
  units.forEach((u, i) => {
    if (out.has(i)) return;
    const named = chapters.find(
      (c) => !retired(c) && !taken.has(c.id) && sameTopic(c.name, u.name),
    );
    if (named) {
      out.set(i, named.id);
      taken.add(named.id);
    }
  });
  return out;
}

type Target = { chapter: string; unit: string } | "unclear" | undefined;

/** The one chapter every handout agrees on, "unclear" when they disagree or a unit is unplaced. */
function targetFor(
  name: string,
  handouts: readonly { units: readonly ParsedUnit[]; map: Map<number, string> }[],
): Target {
  let found: Target;
  for (const h of handouts) {
    const hit = unitsOf(name, h.units);
    if (hit.length === 0) continue;
    const chapter = hit.length === 1 ? h.map.get(hit[0]) : undefined;
    if (!chapter) return "unclear";
    if (found && found !== "unclear" && found.chapter !== chapter) return "unclear";
    found = { chapter, unit: h.units[hit[0]].name };
  }
  return found;
}

/** What to fix in one course, given the units of every handout matched to it. */
export function planRecheck(
  chapters: readonly RecheckChapter[],
  handoutUnits: readonly (readonly ParsedUnit[])[],
): RecheckFix[] {
  const handouts = handoutUnits
    .filter((u) => u.length > 0)
    .map((units) => ({ units, map: unitChapters(chapters, units) }));
  if (handouts.length === 0) return [];
  const fixes: RecheckFix[] = [];
  const visible = chapters
    .filter((c) => !retired(c))
    .flatMap((c) => c.topics.filter((t) => !retired(t)).map((t) => t.name));

  for (const c of chapters)
    for (const t of c.topics) {
      if (!placeable(t.name)) continue;
      const shown = !retired(c) && !retired(t);
      if (shown) {
        const target = targetFor(t.name, handouts);
        if (!target || target === "unclear" || target.chapter === c.id) continue;
        const there = chapters.find((x) => x.id === target.chapter);
        const twin =
          there?.topics.some(
            (x) => !retired(x) && placeable(x.name) && sameTopic(x.name, t.name),
          ) ?? false;
        fixes.push({
          kind: twin ? "hide" : "move",
          topic: t.id,
          name: t.name,
          from: c.id,
          to: twin ? c.id : target.chapter,
          unit: target.unit,
        });
        continue;
      }
      // Hidden: show it again only when the handout lists it and nothing visible covers it.
      const listed = handouts
        .flatMap((h) => h.units.flatMap((u) => u.topics))
        .filter((h) => sameTopic(t.name, h));
      if (listed.length === 0 || fragment(t.name)) continue;
      if (listed.some((h) => visible.some((v) => shownBy(h, v)))) continue;
      if (fixes.some((f) => f.kind === "unhide" && sameTopic(f.name, t.name))) continue;
      const target = targetFor(t.name, handouts);
      if (!target || target === "unclear") continue;
      fixes.push({
        kind: "unhide",
        topic: t.id,
        name: t.name,
        from: c.id,
        to: target.chapter,
        unit: target.unit,
      });
      visible.push(t.name);
    }
  return fixes;
}

/**
 * Applies the fixes to a copy of the chapters. A moved topic goes next to its handout
 * neighbours; a shown-again topic loses its "retired" status (it then follows its chapter).
 * `moved` adds whatever the caller records on a topic that changed chapter (e.g. `movedFrom`).
 */
export function applyRecheck(
  chapters: readonly RecheckChapter[],
  fixes: readonly RecheckFix[],
  handoutUnits: readonly (readonly ParsedUnit[])[],
  moved: (topic: RecheckTopic, from: string) => Record<string, unknown>,
): RecheckChapter[] {
  const out = chapters.map((c) => ({ ...c, topics: c.topics.map((t) => ({ ...t })) }));
  const unitNamed = (name: string) => handoutUnits.flatMap((u) => u).find((u) => u.name === name);
  for (const f of fixes) {
    const from = out.find((c) => c.id === f.from);
    const to = out.find((c) => c.id === f.to);
    const topic = from?.topics.find((t) => t.id === f.topic);
    if (!from || !to || !topic) continue;
    if (f.kind === "hide") topic.status = "retired";
    if (f.kind === "unhide" && topic.status === "retired") delete topic.status;
    if (from === to) continue;
    from.topics = from.topics.filter((t) => t !== topic);
    Object.assign(topic, moved(topic, from.id));
    const unit = unitNamed(f.unit);
    const own = unit ? indexIn(topic.name, unit) : -1;
    let at = to.topics.length;
    if (unit && own >= 0) {
      const last = to.topics.findLastIndex((t) => {
        const i = indexIn(t.name, unit);
        return i >= 0 && i <= own;
      });
      if (last >= 0) at = last + 1;
      else if (to.topics.some((t) => indexIn(t.name, unit) > own)) at = 0;
    }
    to.topics.splice(at, 0, topic);
  }
  return out;
}
