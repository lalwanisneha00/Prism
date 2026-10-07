/*
 * Step 3: the PDEU layer on top of Prism's existing subject files.
 *
 *   node scripts/build-pdeu-layer.mjs
 *
 * Every PDEU course with a unit-wise syllabus becomes a subject file (src/data/subjects/pdeu-*.json):
 * PDEU's name, code, credits, L-T-P, Core / Non-core, units (chapters, with hours) and topics.
 * Existing subject files are NOT edited or deleted by this script. A PDEU topic that the mapping
 * (data/university/pdeu/mapping.json) matches to an existing topic reuses that topic's id, so its
 * checked sources, prerequisite links, widgets, PhET simulations and golden-set links keep working.
 * Genuinely new topics get new ids (tier "limited" until they have sources).
 *
 * Core subjects carry reused sources; non-core subjects are a skeleton (units and topics only):
 * their lessons come from the student's uploaded faculty material.
 */
import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const DIR = "data/university/pdeu";
const OUT = "src/data/subjects";
const mapping = JSON.parse(readFileSync(join(DIR, "mapping.json"), "utf8"));
const extracted = JSON.parse(readFileSync(join(DIR, "syllabus-extracted.json"), "utf8"));

const slug = (t, max = 60) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(new RegExp(`^(.{1,${max}})(?:-.*)?$`), "$1") || "item";
const uniqueIn = (taken, base) => {
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
};
const STOP = new Set([
  "and",
  "of",
  "the",
  "in",
  "to",
  "a",
  "an",
  "for",
  "with",
  "on",
  "its",
  "their",
  "by",
  "as",
  "at",
  "is",
  "or",
]);
const words = (t) =>
  t
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));
const nameKey = (name) =>
  name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => ({ 1: "i", 2: "ii", 3: "iii", 4: "iv" })[w] ?? w)
    .join(" ");
const BRANCH_SHORT = {
  ce: "CE",
  ict: "ICT",
  ece: "ECE",
  civil: "Civil",
  petro: "Petro",
  biotech: "Biotech",
  me: "Mech",
};
const BRANCH_ORDER = ["ce", "ict", "ece", "civil", "petro", "biotech", "me"];

// ---------- existing subjects (read only) ----------
const files = readdirSync(OUT).filter((f) => f.endsWith(".json"));
const old = new Map();
const oldSources = new Map();
for (const f of files) {
  const d = JSON.parse(readFileSync(join(OUT, f), "utf8"));
  if (f.startsWith("pdeu-")) continue;
  if (f.endsWith("-sources.json")) oldSources.set(f.replace(/-sources\.json$/, ""), d);
  else old.set(d.id, d);
}
const oldTopic = new Map(); // "owner/topic" -> { subject, topic, chapter }
for (const s of old.values())
  for (const c of s.chapters)
    for (const t of c.topics) oldTopic.set(`${s.id}/${t.id}`, { s, c, t });

// ---------- collect courses ----------
const groups = new Map();
for (const bid of BRANCH_ORDER) {
  const b = mapping.branches[bid];
  const ext = extracted.branches[bid];
  for (const [semKey, rows] of Object.entries(b.semesters)) {
    const extList = ext.semesters[semKey].flatMap((c) => [
      c,
      ...(c.options ?? []).map((o) => ({ ...o, semester: c.semester })),
    ]);
    for (const r of rows) {
      if (r.kind !== "theory" || !r.units || r.units.every((u) => u.topics.length === 0)) continue;
      const e = extList.find((x) => x.key === r.key);
      const units = r.units.filter((u) => u.topics.length > 0);
      const sig = JSON.stringify(units.map((u) => [u.title, u.topics.map((t) => t.name)]));
      const key = nameKey(r.name);
      const variants = groups.get(key) ?? [];
      let v = variants.find((x) => x.sig === sig && x.category === r.category);
      if (!v) {
        v = {
          sig,
          units,
          name: r.name,
          key,
          category: r.category,
          offerings: [],
          existing: r.existingSubjects ?? [],
        };
        variants.push(v);
      }
      v.offerings.push({
        branch: bid,
        key: r.key,
        ...(r.code ? { code: r.code } : {}),
        category: e?.category ?? "",
        ...(e?.ltp ? { ltp: e.ltp } : {}),
        credits: r.credits,
        semester: r.semester,
        kind: r.category,
        ...(e?.track ? { track: e.track } : {}),
      });
      groups.set(key, variants);
    }
  }
}

// ---------- build ----------
const taken = new Set(old.keys());
const newSubjects = [];
const curatedAlias = {};
for (const f of files) if (f.startsWith("pdeu-")) rmSync(join(OUT, f));

for (const [, variants] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
  variants.sort((a, b) => b.offerings.length - a.offerings.length || a.sig.localeCompare(b.sig));
  variants.forEach((v) => {
    const branches = [...new Set(v.offerings.map((o) => o.branch))];
    const multi = variants.length > 1;
    const suffix = multi ? ` (${branches.map((b) => BRANCH_SHORT[b]).join(", ")})` : "";
    let id = uniqueIn(taken, `pdeu-${slug(v.name, 50)}${multi ? `-${branches.join("-")}` : ""}`);
    if (id.endsWith("-sources")) {
      taken.delete(id);
      id = uniqueIn(taken, `${id}-course`);
    }
    const core = v.category === "core";
    const chapterIds = new Set();
    const topicIds = new Set();
    const idMap = new Map();
    const topicSources = {};
    const books = {};
    const sections = {};
    let reusedCount = 0;
    const chapters = v.units.map((u, ui) => {
      const chapterId = uniqueIn(chapterIds, slug(u.title, 50) || `unit-${ui + 1}`);
      const seen = new Set();
      const topics = [];
      for (const t of u.topics) {
        const name = t.name
          .replace(/\s+/g, " ")
          .replace(/^[-–•\s]+|[\s.;,]+$/g, "")
          .slice(0, 200);
        if (name.length < 2 || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        let topicId;
        let from = null;
        // Reuse an existing topic id when the mapping found one (core subjects only).
        if (core) {
          const tw = new Set(words(name));
          const options = (t.existing ?? [])
            .map((k) => oldTopic.get(k))
            .filter(Boolean)
            .map((o) => ({ o, shared: words(o.t.name).filter((w) => tw.has(w)).length }))
            .sort((a, b) => b.shared - a.shared);
          const pick = options.find((x) => !topicIds.has(x.o.t.id));
          if (pick) {
            topicId = pick.o.t.id;
            topicIds.add(topicId);
            from = `${pick.o.s.id}/${pick.o.t.id}`;
            idMap.set(from, topicId);
            reusedCount++;
            const osrc = oldSources.get(pick.o.s.id);
            const src = osrc?.topics?.[topicId];
            if (src) {
              // Book keys are made unique per old subject so sections from several can share a file.
              const renamed = src.openstax.map((sec) => {
                const [bookKey, page] = sec.includes("/") ? sec.split("/", 2) : ["", sec];
                const book = bookKey
                  ? osrc.openstaxBooks?.[bookKey]
                  : osrc.openstaxBook
                    ? { url: osrc.openstaxBook, title: osrc.openstaxBookTitle }
                    : undefined;
                if (!book) return null;
                const nb = `${pick.o.s.id}-${bookKey || "book"}`;
                books[nb] = book;
                sections[`${nb}/${page}`] = osrc.openstaxSections[sec];
                return `${nb}/${page}`;
              });
              topicSources[topicId] = { ...src, openstax: renamed.filter(Boolean) };
            }
          }
        }
        if (!topicId) topicId = uniqueIn(topicIds, slug(name));
        topics.push({ id: topicId, name, _from: from });
      }
      return {
        id: chapterId,
        name: u.title.replace(/\s+/g, " ").slice(0, 160) || `Unit ${ui + 1}`,
        ...(u.hours ? { hours: u.hours } : {}),
        topics,
      };
    });
    // Prerequisites: an existing edge survives when both ends were reused here; otherwise a topic
    // follows the one before it in its unit (the handbook lists topics in teaching order).
    // Edges that would close a loop are dropped (carried edges and the teaching-order chain can clash).
    const deps = new Map();
    const reaches = (from, target, seen = new Set()) => {
      if (from === target) return true;
      if (seen.has(from)) return false;
      seen.add(from);
      return (deps.get(from) ?? []).some((r) => reaches(r, target, seen));
    };
    const addReqs = (t, list) => {
      const ok = [...new Set(list)].filter((r) => r !== t.id && !reaches(r, t.id));
      if (ok.length) {
        deps.set(t.id, [...(deps.get(t.id) ?? []), ...ok]);
        t.requires = [...(t.requires ?? []), ...ok];
      }
    };
    for (const c of chapters) {
      c.topics.forEach((t, i) => {
        const o = t._from ? oldTopic.get(t._from) : null;
        addReqs(t, (o?.t.requires ?? []).map((r) => idMap.get(`${o.s.id}/${r}`)).filter(Boolean));
        if (!t.requires && i > 0) addReqs(t, [c.topics[i - 1].id]);
      });
      for (const t of c.topics) delete t._from;
    }
    const semesters = [...new Set(v.offerings.map((o) => o.semester))].sort((a, b) => a - b);
    const first = v.offerings[0];
    const best = v.existing?.[0];
    const oldBest = best && best.topicsMatched >= 3 ? old.get(best.subject) : undefined;
    const subject = {
      id,
      name: v.name.replace(/\s+/g, " ") + suffix,
      field: oldBest?.field ?? v.name.replace(/\s*\(.*$/, ""),
      tier: core && reusedCount > 0 ? "sourced" : "limited",
      university: "pdeu",
      courseCategory: v.category,
      branches,
      semesters,
      ...(first.code ? { code: first.code } : {}),
      credits: first.credits,
      ...(first.ltp ? { ltp: first.ltp } : {}),
      category: first.category,
      offerings: v.offerings,
      syllabusSource: {
        kind: "university",
        title: `PDEU B.Tech curriculum handbook (${branches.map((b) => BRANCH_SHORT[b]).join(", ")}): ${v.name}`,
        note: core
          ? `Units and topics are PDEU's, copied from the handbook. ${reusedCount} topic(s) reuse existing Prism topics, so their checked sources, widgets and prerequisite links still apply; the rest have no curated sources yet.`
          : "Skeleton only: units and topics are PDEU's, copied from the handbook. Lessons are built from the material the student uploads (given by their faculty).",
      },
      ...(oldBest?.visualSet ? { visualSet: oldBest.visualSet } : {}),
      ...(oldBest?.teaching ? { teaching: oldBest.teaching } : {}),
      chapters,
    };
    newSubjects.push({ subject, topicSources, books, sections });
    if (oldBest) curatedAlias[id] = oldBest.id;
  });
}

// ---------- write ----------
const lock = JSON.parse(readFileSync("src/lib/subjectIds.lock.json", "utf8"));
// Ids of the PDEU layer are rebuilt each time (nothing has been published under them yet).
const lockIds = new Set(lock.ids.filter((i) => !i.startsWith("pdeu-")));
const subjectOf = {};
for (const { subject, topicSources, books, sections } of newSubjects) {
  writeFileSync(join(OUT, `${subject.id}.json`), `${JSON.stringify(subject, null, 2)}\n`);
  if (Object.keys(topicSources).length > 0) {
    const file = {
      ...(Object.keys(books).length ? { openstaxBooks: books } : {}),
      openstaxSections: sections,
      topics: topicSources,
    };
    writeFileSync(join(OUT, `${subject.id}-sources.json`), `${JSON.stringify(file, null, 2)}\n`);
  }
  for (const c of subject.chapters)
    for (const t of c.topics) lockIds.add(`${subject.id}/${c.id}/${t.id}`);
  for (const o of subject.offerings) subjectOf[`${o.branch}/${o.key}`] = subject.id;
}
lock.ids = [...lockIds];
writeFileSync("src/lib/subjectIds.lock.json", `${JSON.stringify(lock, null, 2)}\n`);
writeFileSync("src/data/curatedAlias.json", `${JSON.stringify(curatedAlias, null, 2)}\n`);
writeFileSync(join("src/data/pdeu", "subject-map.json"), `${JSON.stringify(subjectOf, null, 2)}\n`);

// ---------- visual aliases ----------
const visualOldIds = new Set();
for (const f of [
  "src/visuals/registry.ts",
  "src/visuals/wave1/registry.ts",
  "src/visuals/wave2/registry.ts",
  "src/data/phet.ts",
]) {
  for (const block of readFileSync(f, "utf8").matchAll(/topics:\s*\[([^\]]*)\]/g)) {
    for (const m of block[1].matchAll(/"([a-z0-9-]+)"/g)) visualOldIds.add(m[1]);
  }
}
const oldByWords = [];
for (const { s, t } of oldTopic.values())
  if (visualOldIds.has(t.id)) oldByWords.push({ id: t.id, words: [...new Set(words(t.name))] });
const visualAliases = {};
for (const { subject } of newSubjects) {
  for (const c of subject.chapters) {
    for (const t of c.topics) {
      if (visualOldIds.has(t.id) || visualAliases[t.id]) continue;
      const w = new Set(words(t.name));
      const hits = new Set();
      for (const o of oldByWords) {
        const inter = o.words.filter((x) => w.has(x)).length;
        const ok =
          o.words.length >= 2
            ? inter === o.words.length && w.size <= o.words.length * 2 + 2
            : inter === 1 && o.words.length === 1 && w.size <= 3;
        if (ok) hits.add(o.id);
      }
      if (hits.size > 0) visualAliases[t.id] = [...hits].slice(0, 3);
    }
  }
}
writeFileSync("src/data/visualAliases.json", `${JSON.stringify(visualAliases, null, 2)}\n`);
const topicsTotal = newSubjects.reduce(
  (n, s) => n + s.subject.chapters.reduce((m, c) => m + c.topics.length, 0),
  0,
);
const reused = newSubjects.filter((s) => s.subject.courseCategory === "core").length;
console.log(
  `${newSubjects.length} PDEU subjects (${reused} core, ${newSubjects.length - reused} non-core), ${topicsTotal} topics, ${Object.keys(visualAliases).length} visual aliases, ${Object.keys(curatedAlias).length} with curated-link alias`,
);
