// Syllabus fix, Phase 2 step 5: no student record may point at a missing id.
//
// Student data (progress, weak topics, mock tests, highlights, saved lessons, plans) lives on each
// device and in each student's Firestore folder, keyed by subject + topic (+ chapter) ids. Every id
// ever published is in src/lib/subjectIds.lock.json, so if every locked id still resolves, every
// saved record still resolves too. A locked id resolves when the subject/chapter/topic exists, or
// when the topic moved to another chapter of its subject and remembers the chapter it came from.
// Also checks the links between the data files. Exits 1 on any problem.
//
//   npm run syllabus:check
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

type Topic = {
  id: string;
  movedFrom?: { subject: string; chapter?: string };
  formerChapters?: string[];
};
type Subject = {
  id: string;
  offerings?: { branch: string; key: string }[];
  chapters: { id: string; topics: Topic[] }[];
  sameAs?: string;
  movedTo?: string;
  relatedCourses?: string[];
};
type HbCourse = { key: string; options?: HbCourse[] };

const DIR = "src/data/subjects";
const read = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

const subjects = new Map<string, Subject>();
for (const f of readdirSync(DIR))
  if (f.endsWith(".json") && !f.endsWith("-sources.json")) {
    const s = read<Subject>(path.join(DIR, f));
    subjects.set(s.id, s);
  }

const resolved = new Set<string>();
for (const s of subjects.values())
  for (const c of s.chapters)
    for (const t of c.topics) {
      resolved.add(`${s.id}/${c.id}/${t.id}`);
      if (t.movedFrom?.chapter && t.movedFrom.subject === s.id)
        resolved.add(`${s.id}/${t.movedFrom.chapter}/${t.id}`);
      for (const ch of t.formerChapters ?? []) resolved.add(`${s.id}/${ch}/${t.id}`);
    }

const problems: string[] = [];
const lock = read<{ ids: string[] }>("src/lib/subjectIds.lock.json").ids;
const missing = lock.filter((id) => !resolved.has(id));
for (const id of missing.slice(0, 50)) problems.push(`locked id no longer resolves: ${id}`);
if (missing.length > 50) problems.push(`… and ${missing.length - 50} more locked ids`);

const topicExists = (subject: string, topic: string) =>
  subjects.get(subject)?.chapters.some((c) => c.topics.some((t) => t.id === topic)) ?? false;

for (const s of subjects.values())
  for (const [field, target] of [
    ["sameAs", s.sameAs],
    ["movedTo", s.movedTo],
    ...(s.relatedCourses ?? []).map((r) => ["relatedCourses", r] as const),
  ] as const)
    if (target && !subjects.has(target)) problems.push(`${s.id}: ${field} → unknown ${target}`);

const map = read<Record<string, string>>("src/data/pdeu/subject-map.json");
for (const [key, id] of Object.entries(map))
  if (!subjects.has(id)) problems.push(`subject-map ${key} → unknown subject ${id}`);

const handbookKeys = new Map<string, Set<string>>();
for (const f of readdirSync("src/data/pdeu")) {
  const data = read<{ id?: string; subjects?: HbCourse[] }>(path.join("src/data/pdeu", f));
  if (!data.id || !data.subjects) continue;
  const keys = new Set<string>();
  for (const c of data.subjects) for (const x of [c, ...(c.options ?? [])]) keys.add(x.key);
  handbookKeys.set(data.id, keys);
}
for (const s of subjects.values())
  for (const o of s.offerings ?? []) {
    const keys = handbookKeys.get(o.branch);
    if (keys && !keys.has(o.key))
      problems.push(`${s.id}: offering ${o.branch}/${o.key} has no handbook entry`);
  }

const stale = read<{ topics: Record<string, string> }>("src/data/syllabus/stale-topics.json");
for (const key of Object.keys(stale.topics)) {
  const [subject, topic] = key.split("/");
  if (!topicExists(subject, topic)) problems.push(`stale-topics: unknown ${key}`);
}

console.log(
  `Checked ${lock.length} locked ids, ${subjects.size} subjects, ${Object.keys(map).length} handbook links, ${Object.keys(stale.topics).length} stale marks.`,
);
if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("OK: every saved id still resolves; no record points at a missing id.");
