import { sameTopic } from "@/lib/custom/matchSyllabus";
import { chaptersOf, type Subject } from "@/lib/subjects";
import { nameSimilarity } from "@/lib/university/match";
import type { UniSubject } from "@/lib/university/parse";

/*
 * Which Prism subject is each subject of the student's syllabus? Pure and AI-free: word overlap on
 * names, with the topic lists as a second opinion. A clear match is used straight away; anything
 * less is put to the student ("We think Mathematics I is Engineering Mathematics. Is this right?").
 * Nothing is decided silently when it is uncertain.
 */

export type Candidate = {
  subject: Subject;
  /** 0–1 name similarity (filler words like "Engineering" and "I" ignored). */
  score: number;
  /** How many of the syllabus's topics are topics of this Prism subject. */
  hits: number;
};

export type Proposal = {
  uni: UniSubject;
  /** A subject whose name clearly matches, when there is one. */
  best: Candidate | null;
  /** Other plausible subjects, best first. */
  others: Candidate[];
  /**
   * high: names match and nothing suggests a part of a bigger subject, so it is used as is.
   * confirm: a likely match the student must confirm (renamed, split over semesters, or only the topics agree).
   * none: nothing on Prism fits; it becomes a subject of the student's own.
   */
  confidence: "high" | "confirm" | "none";
  /** The guess to show when confidence is "confirm". */
  suggestion: Candidate | null;
};

/** "Mathematics I", "Mathematics – II", "Physics Part 2": a sign the subject is split over terms. */
export function isSequenced(name: string): boolean {
  return /(?:[-–]\s*|\s)(?:i{1,3}|iv|v|vi{0,3}|[1-4])\s*$|\bpart\s*\d\b/i.test(name.trim());
}

/** Everything the syllabus lists for a subject: unit names and topics. */
function listed(uni: UniSubject): { unitNames: string[]; topics: string[] } {
  return { unitNames: uni.units.map((u) => u.name), topics: uni.units.flatMap((u) => u.topics) };
}

/** The topics of a Prism subject as "owner/topicId", counting chapters linked in from other subjects. */
export function topicsOf(subject: Subject): { key: string; name: string }[] {
  return chaptersOf(subject).flatMap((o) =>
    o.chapter.topics.map((t) => ({ key: `${o.owner.id}/${t.id}`, name: t.name })),
  );
}

/** Prism topics the syllabus covers, and syllabus topics Prism does not have. */
export function coverageOf(
  subject: Subject,
  uni: UniSubject,
): { covered: string[]; extra: string[] } {
  const { unitNames, topics } = listed(uni);
  const texts = [...unitNames, ...topics];
  const tops = topicsOf(subject);
  const covered = tops.filter((t) => texts.some((x) => sameTopic(x, t.name))).map((t) => t.key);
  const extra = [
    ...new Set(
      topics
        .filter((x) => x.length >= 4 && !tops.some((t) => sameTopic(x, t.name)))
        .map((x) => x.slice(0, 120)),
    ),
  ].slice(0, 60);
  return { covered, extra };
}

export function propose(uni: UniSubject, catalogue: readonly Subject[]): Proposal {
  const { unitNames, topics } = listed(uni);
  const texts = [...unitNames, ...topics];
  const ranked: Candidate[] = catalogue
    .map((subject) => ({
      subject,
      score: nameSimilarity(subject.name, uni.name),
      hits: topicsOf(subject).filter((t) => texts.some((x) => sameTopic(x, t.name))).length,
    }))
    .filter((c) => c.score >= 0.4 || c.hits >= 3)
    .sort((a, b) => b.score - a.score || b.hits - a.hits);

  const best = ranked[0] && ranked[0].score >= 0.6 ? ranked[0] : null;
  const others = ranked.filter((c) => c !== best).slice(0, 4);
  if (best) {
    const clear = best.score >= 0.99 && !isSequenced(uni.name);
    return {
      uni,
      best,
      others,
      confidence: clear ? "high" : "confirm",
      suggestion: clear ? null : best,
    };
  }
  // No name matches, but the topics may: a likely subject worth asking about.
  const byTopics = [...ranked].sort((a, b) => b.hits - a.hits)[0];
  if (byTopics && byTopics.hits >= 3) {
    return { uni, best: null, others, confidence: "confirm", suggestion: byTopics };
  }
  return { uni, best: null, others, confidence: "none", suggestion: null };
}
