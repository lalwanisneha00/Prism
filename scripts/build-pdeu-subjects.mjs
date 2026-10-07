/*
 * Makes Prism's subject catalogue follow PDEU's official syllabus (one-time migration, kept so it
 * can be re-run when the handbooks change).
 *
 *   node scripts/build-pdeu-subjects.mjs <folder with the OLD subject files and curatedLinks.ts>
 *
 * Every PDEU core course that has a unit-wise syllabus becomes a subject: its name, credits, code,
 * L-T-P, units (chapters, with hours) and topics are PDEU's. Courses that appear in several branches
 * with the same syllabus are one subject; where the branches' syllabi differ, each version is its
 * own subject. Subjects of the old catalogue that PDEU does not teach are not recreated.
 *
 * Accuracy is kept as high as it can be without new tests: when a PDEU topic is (nearly) the same
 * as a topic of the old catalogue, the old topic id is reused, so its checked sources, prerequisite
 * links and widgets still apply. Nothing else is guessed. All accuracy tests are re-run later.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OLD = process.argv[2];
if (!OLD) throw new Error("usage: node scripts/build-pdeu-subjects.mjs <old-subjects-folder>");
const OUT = "src/data/subjects";
const PDEU = "src/data/pdeu";
const BRANCH_ORDER = ["ce", "ict", "ece", "civil", "petro", "biotech", "me"];

const slug = (t, max = 60) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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

// ---------- read the old catalogue ----------
const oldSubjects = new Map();
const oldSources = new Map();
for (const f of readdirSync(OLD)) {
  if (!f.endsWith(".json") || f === "branches.json" || f === "subjectIds.lock.json") continue;
  const data = JSON.parse(readFileSync(join(OLD, f), "utf8"));
  if (f.endsWith("-sources.json")) oldSources.set(f.replace(/-sources\.json$/, ""), data);
  else oldSubjects.set(data.id, data);
}
// Old topics by word set, for strict reuse of ids.
const oldTopics = [];
for (const s of oldSubjects.values()) {
  for (const c of s.chapters) {
    for (const t of c.topics) {
      const w = new Set(words(t.name));
      if (w.size > 0) oldTopics.push({ subject: s.id, topic: t, words: w });
    }
  }
}
const prismMatch = JSON.parse(readFileSync(join(PDEU, "prism-match.json"), "utf8"));

function bestOldTopic(text, preferSubject) {
  const w = new Set(words(text));
  if (w.size === 0) return null;
  let best = null;
  for (const o of oldTopics) {
    const inter = [...w].filter((x) => o.words.has(x)).length;
    const union = new Set([...w, ...o.words]).size;
    const jac = inter / union;
    if (inter < 2 && !(w.size === 1 && o.words.size === 1 && inter === 1)) continue;
    if (jac < 0.75) continue;
    const score = jac + (o.subject === preferSubject ? 0.05 : 0);
    if (!best || score > best.score) best = { ...o, score };
  }
  return best;
}

// ---------- collect PDEU courses ----------
const groups = new Map(); // nameKey -> variants
for (const branchId of BRANCH_ORDER) {
  const b = JSON.parse(readFileSync(join(PDEU, `${branchId}.json`), "utf8"));
  const list = [];
  for (const s of b.subjects) {
    list.push(s);
    for (const o of s.options ?? []) list.push({ ...o, semester: s.semester, core: s.core });
  }
  for (const c of list) {
    if (!c.core) continue;
    const units = c.units.filter((u) => u.topics.length > 0);
    if (units.length === 0) continue;
    const key = nameKey(c.name);
    const sig = JSON.stringify(units.map((u) => [u.title, u.topics]));
    const variants = groups.get(key) ?? [];
    let v = variants.find((x) => x.sig === sig);
    if (!v) {
      v = { sig, units, name: c.name, key, offerings: [] };
      variants.push(v);
    }
    v.offerings.push({
      branch: branchId,
      key: c.key,
      ...(c.code ? { code: c.code } : {}),
      category: c.category,
      ...(c.ltp ? { ltp: c.ltp } : {}),
      credits: c.credits,
      ...(c.creditsNote ? { creditsNote: c.creditsNote } : {}),
      semester: c.semester,
      ...(c.track ? { track: c.track } : {}),
    });
    groups.set(key, variants);
  }
}

// ---------- visual set for a subject ----------
const VISUAL_RULES = [
  [/physics|electromagnet/i, "physics"],
  [/math|calculus|statistic|probab|numerical|optimi/i, "maths"],
  [/electric|electronic|circuit|analog|network|power|machine|vlsi|instrument/i, "circuits"],
  [/signal|communication|control|antenna|microwave|wireless|dsp/i, "signals"],
  [/fluid|hydraul|hydrolog|flow/i, "fluids"],
  [/thermo|heat|refrigeration|combustion|engine/i, "thermal"],
  [/mechanic|strength|solid|machine design|kinematic|dynamics|vibration|graphics/i, "mechanics"],
  [/chemi|bio|material|metallurg/i, "chemistry"],
  [
    /structur|concrete|steel|geotech|survey|building|highway|foundation|earthquake|estimation/i,
    "civil",
  ],
  [/process|petroleum|reservoir|drilling|production|well|mass transfer/i, "process"],
  [
    /data|algorithm|program|database|operating|network|compiler|software|machine learning|artificial|computer|web|cloud|cyber|distributed|blockchain|internet/i,
    "computing",
  ],
  [/theory of computation|discrete/i, "theory"],
];
const visualFor = (name, oldSubject) =>
  oldSubject?.visualSet ?? VISUAL_RULES.find(([re]) => re.test(name))?.[1];

// ---------- build ----------
const BRANCH_SHORT = {
  ce: "CE",
  ict: "ICT",
  ece: "ECE",
  civil: "Civil",
  petro: "Petro",
  biotech: "Biotech",
  me: "Mech",
};
const taken = new Set();
const newSubjects = [];
const reusedOld = new Map(); // old id -> new id (exact matches only)
const curatedAlias = {};
const carriedTopics = []; // old subject/topic -> new subject/chapter/topic (for the report)

// Exact (non-part) matches keep their old id for the largest variant.
for (const [key, variants] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
  variants.sort((a, b) => b.offerings.length - a.offerings.length || a.sig.localeCompare(b.sig));
  const match = prismMatch[key];
  const oldId = match && !match.part && oldSubjects.has(match.subject) ? match.subject : null;
  variants.forEach((v, i) => {
    const branches = [...new Set(v.offerings.map((o) => o.branch))];
    const multi = variants.length > 1;
    const suffix = multi ? ` (${branches.map((b) => BRANCH_SHORT[b]).join(", ")})` : "";
    let id;
    if (i === 0 && oldId && !reusedOld.has(oldId)) {
      id = oldId;
      reusedOld.set(oldId, oldId);
      taken.add(id);
    } else {
      id = uniqueIn(taken, slug(v.name) + (multi ? `-${branches.join("-")}` : ""));
      // "<id>-sources.json" is a sources file, so a subject id must not end in "-sources".
      if (id.endsWith("-sources")) {
        taken.delete(id);
        id = uniqueIn(taken, `${id}-course`);
      }
    }
    const old =
      match && oldSubjects.has(match.subject) ? oldSubjects.get(match.subject) : undefined;

    const chapterIds = new Set();
    const topicIds = new Set();
    const idMap = new Map(); // old topic id -> new topic id (for prerequisites)
    const topicSources = {};
    const sourceBooks = {};
    const sourceSections = {};
    let carried = 0;
    const chapters = v.units.map((u, ui) => {
      const chapterId = uniqueIn(chapterIds, slug(u.title, 50) || `unit-${ui + 1}`);
      const seen = new Set();
      const topics = [];
      for (const raw of u.topics) {
        const name = raw
          .replace(/\s+/g, " ")
          .replace(/^[-–•\s]+|[\s.;,]+$/g, "")
          .slice(0, 200);
        if (name.length < 2 || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const hit = bestOldTopic(name, old?.id);
        let topicId;
        if (hit && !topicIds.has(hit.topic.id)) {
          topicId = hit.topic.id;
          topicIds.add(topicId);
          idMap.set(`${hit.subject}/${hit.topic.id}`, topicId);
          carried++;
          carriedTopics.push(`${hit.subject}/${hit.topic.id} -> ${id}/${chapterId}/${topicId}`);
          const osrc = oldSources.get(hit.subject);
          const src = osrc?.topics?.[hit.topic.id];
          if (src) {
            // Book keys are made unique per old subject ("<old subject>-<book>/<page>"), so sections
            // carried from several old subjects can sit in one file.
            const renamed = src.openstax.map((sec) => {
              const [bookKey, page] = sec.includes("/") ? sec.split("/", 2) : ["", sec];
              const book = bookKey
                ? osrc.openstaxBooks?.[bookKey]
                : osrc.openstaxBook
                  ? { url: osrc.openstaxBook, title: osrc.openstaxBookTitle }
                  : undefined;
              const newBook = `${hit.subject}-${bookKey || "book"}`;
              const newSec = `${newBook}/${page}`;
              if (book) {
                sourceBooks[newBook] = book;
                sourceSections[newSec] = osrc.openstaxSections[sec];
              }
              return book ? newSec : null;
            });
            topicSources[topicId] = { ...src, openstax: renamed.filter(Boolean) };
          }
        } else {
          topicId = uniqueIn(topicIds, slug(name));
        }
        topics.push({ id: topicId, name, _old: hit ? `${hit.subject}/${hit.topic.id}` : null });
      }
      return {
        id: chapterId,
        name: u.title.replace(/\s+/g, " ").slice(0, 160) || `Unit ${ui + 1}`,
        ...(u.hours ? { hours: u.hours } : {}),
        topics,
      };
    });
    // Prerequisites: an old edge survives when both of its topics were carried into this subject.
    const oldRequires = new Map();
    for (const s of oldSubjects.values())
      for (const c of s.chapters)
        for (const t of c.topics)
          if (t.requires) oldRequires.set(`${s.id}/${t.id}`, { s: s.id, req: t.requires });
    for (const c of chapters) {
      for (const t of c.topics) {
        if (!t._old) continue;
        const info = oldRequires.get(t._old);
        const reqs = (info?.req ?? [])
          .map((r) => idMap.get(`${info.s}/${r}`))
          .filter((r) => r && r !== t.id);
        if (reqs.length) t.requires = [...new Set(reqs)];
        delete t._old;
      }
      for (const t of c.topics) delete t._old;
      // The handbook lists topics in teaching order: where no earlier Prism link was reused, a topic
      // follows the one before it in its unit (this is what draws the concept map's arrows).
      c.topics.forEach((t, i) => {
        if (!t.requires && i > 0) t.requires = [c.topics[i - 1].id];
      });
    }
    const semesters = [...new Set(v.offerings.map((o) => o.semester))].sort((a, b) => a - b);
    const first = v.offerings[0];
    const subject = {
      id,
      name: v.name.replace(/\s+/g, " ") + suffix,
      field: old?.field ?? v.name.replace(/\s*\(.*$/, ""),
      tier: carried > 0 ? "sourced" : "limited",
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
        note: `Units and topics are PDEU's, copied from the handbook. ${carried} topic(s) reuse earlier Prism topics, so their checked sources still apply; the rest have no sources yet and the subject's accuracy test has not been run. Prerequisite arrows follow the handbook's teaching order within a unit.`,
      },
      ...(visualFor(v.name, old) ? { visualSet: visualFor(v.name, old) } : {}),
      ...(old?.teaching ? { teaching: old.teaching } : {}),
      chapters,
    };
    newSubjects.push({ subject, topicSources, sourceBooks, sourceSections, oldId: old?.id });
    if (old) curatedAlias[id] = old.id;
  });
}

// ---------- write ----------
for (const f of readdirSync(OUT)) {
  if (f.endsWith(".json")) rmSync(join(OUT, f));
}
const lockIds = [];
for (const { subject, topicSources, sourceBooks, sourceSections } of newSubjects) {
  writeFileSync(join(OUT, `${subject.id}.json`), `${JSON.stringify(subject, null, 2)}\n`);
  if (Object.keys(topicSources).length > 0) {
    const file = {
      ...(Object.keys(sourceBooks).length ? { openstaxBooks: sourceBooks } : {}),
      openstaxSections: sourceSections,
      topics: topicSources,
    };
    writeFileSync(join(OUT, `${subject.id}-sources.json`), `${JSON.stringify(file, null, 2)}\n`);
  }
  for (const c of subject.chapters)
    for (const t of c.topics) lockIds.push(`${subject.id}/${c.id}/${t.id}`);
}
writeFileSync(
  "src/lib/subjectIds.lock.json",
  `${JSON.stringify(
    {
      note: "Every subject/chapter/topic id published in the PDEU catalogue. Saved progress, highlights and library lessons are keyed by them, so they may be added to but never renamed or removed (a test checks). Rebuilt on 2026-10-07 when the catalogue moved to PDEU's syllabus.",
      ids: lockIds,
    },
    null,
    2,
  )}\n`,
);
// ---------- visual aliases: PDEU topics that mean the same as an old topic with widgets / PhET sims ----------
const visualOldIds = new Set();
for (const f of [
  "src/visuals/registry.ts",
  "src/visuals/wave1/registry.ts",
  "src/visuals/wave2/registry.ts",
  "src/data/phet.ts",
]) {
  const text = readFileSync(f, "utf8");
  for (const block of text.matchAll(/topics:\s*\[([^\]]*)\]/g)) {
    for (const m of block[1].matchAll(/"([a-z0-9-]+)"/g)) visualOldIds.add(m[1]);
  }
}
const oldByWords = oldTopics.filter((o) => visualOldIds.has(o.topic.id));
const visualAliases = {};
for (const { subject } of newSubjects) {
  for (const c of subject.chapters) {
    for (const t of c.topics) {
      if (visualOldIds.has(t.id) || visualAliases[t.id]) continue;
      const w = new Set(words(t.name));
      const hits = new Set();
      for (const o of oldByWords) {
        const ow = [...o.words];
        const inter = ow.filter((x) => w.has(x)).length;
        const ok =
          ow.length >= 2
            ? inter === ow.length && w.size <= ow.length * 2 + 2
            : inter === 1 && w.size <= 3;
        if (ok) hits.add(o.topic.id);
      }
      if (hits.size > 0) visualAliases[t.id] = [...hits].slice(0, 3);
    }
  }
}
writeFileSync(
  "src/data/visualAliases.json",
  `${JSON.stringify(visualAliases, null, 2)}
`,
);
console.log(
  `${Object.keys(visualAliases).length} PDEU topics reuse an older topic's widgets / PhET sims`,
);

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/curatedAlias.json", `${JSON.stringify(curatedAlias, null, 2)}\n`);
// subject lookup for the PDEU pages: "<branch>/<course key>" -> subject id
const subjectOf = {};
for (const { subject } of newSubjects)
  for (const o of subject.offerings) subjectOf[`${o.branch}/${o.key}`] = subject.id;
writeFileSync(join(PDEU, "subject-map.json"), `${JSON.stringify(subjectOf, null, 2)}\n`);

const carriedCount = carriedTopics.length;
console.log(
  `${newSubjects.length} subjects (${newSubjects.filter((s) => s.oldId).length} derived from an old subject, ${[...reusedOld.keys()].length} kept their id), ${lockIds.length} topics, ${carriedCount} old topic ids reused`,
);
writeFileSync(".logs/carried-topics.txt", carriedTopics.join("\n"));
void existsSync;
