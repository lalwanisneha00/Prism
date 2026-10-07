/*
 * Step 2: which existing Prism subjects and topics does each PDEU course reuse?
 *
 *   node scripts/map-pdeu.mjs
 *
 * Reads data/university/pdeu/syllabus-extracted.json and src/data/subjects/*.json (the existing
 * topic bank) and writes data/university/pdeu/MAPPING.md (for people) and mapping.json (for the
 * app). Rule-based and auditable, no AI: an existing topic is reused when all its content words
 * appear in a PDEU topic (a "topic match"), or, more weakly, in the text of the PDEU unit (a
 * "unit match"). Nothing is decided silently when unsure: the course is listed as "unsure".
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "data/university/pdeu";
const extracted = JSON.parse(readFileSync(join(DIR, "syllabus-extracted.json"), "utf8"));

// ---------- the existing topic bank ----------
const subjects = new Map();
for (const f of readdirSync("src/data/subjects")) {
  if (!f.endsWith(".json") || f.endsWith("-sources.json")) continue;
  const s = JSON.parse(readFileSync(join("src/data/subjects", f), "utf8"));
  // Only the existing topic bank: the PDEU layer built from this mapping must not match itself.
  if (s.university === "pdeu") continue;
  subjects.set(s.id, s);
}

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
const GENERIC = new Set([
  "introduction",
  "basics",
  "basic",
  "overview",
  "applications",
  "application",
  "concept",
  "concepts",
  "principles",
  "principle",
  "types",
  "type",
  "analysis",
  "design",
  "methods",
  "method",
  "theory",
  "fundamentals",
  "systems",
  "system",
  "model",
  "models",
  "using",
  "use",
  "general",
  "advanced",
]);
const stem = (w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
const words = (t) =>
  t
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);

/** Topics of a subject, counting chapters linked in from other subjects (they keep their owner). */
function topicsOf(s) {
  const out = [];
  const add = (owner, chapter) => {
    for (const t of chapter.topics)
      out.push({ key: `${owner.id}/${t.id}`, owner: owner.id, chapter: chapter.id, name: t.name });
  };
  for (const c of s.chapters) add(s, c);
  for (const l of s.links ?? []) {
    const o = subjects.get(l.subject);
    if (!o) continue;
    for (const c of o.chapters) if (!l.chapters || l.chapters.includes(c.id)) add(o, c);
  }
  return out;
}

const bank = [];
for (const s of subjects.values()) {
  const own = new Set();
  for (const c of s.chapters) for (const t of c.topics) own.add(`${s.id}/${t.id}`);
  for (const t of topicsOf(s)) {
    const w = [...new Set(words(t.name))];
    const informative = w.filter((x) => !GENERIC.has(x));
    if (informative.length === 0) continue;
    bank.push({ ...t, subject: s.id, words: w, informative });
  }
}
// A topic key can appear under several subjects (linked chapters): keep one entry per key and subject.
const subjectTotals = new Map([...subjects.values()].map((s) => [s.id, topicsOf(s).length]));

function oldMatchesIn(wordSet, oneWordOk) {
  const hit = [];
  for (const o of bank) {
    if (o.words.length >= 2) {
      if (o.words.every((w) => wordSet.has(w)) && o.informative.length >= 1) hit.push(o);
    } else if (oneWordOk && o.words[0].length >= 6 && wordSet.has(o.words[0])) hit.push(o);
  }
  return hit;
}

// ---------- names and categories ----------
const nameKey = (n) =>
  n
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(
      (w) =>
        w &&
        ![
          "engineering",
          "engg",
          "applied",
          "basic",
          "and",
          "of",
          "the",
          "to",
          "i",
          "ii",
          "iii",
          "iv",
          "1",
          "2",
          "3",
          "4",
        ].includes(w),
    )
    .join(" ");

// Non-core is what PDEU itself tags non-core (humanities, open electives, internships). These are
// the courses whose category is not clear-cut, so the owner decides.
const OVERRIDES = JSON.parse(readFileSync(join(DIR, "overrides.json"), "utf8"));
const UNSURE = []; // nothing is unsure any more: the owner decided (overrides.json)

function typeOf(c) {
  return c.type;
}

const rows = [];
const mapping = { generatedFrom: "syllabus-extracted.json", branches: {} };

function analyse(c, core) {
  const units = c.units.filter((u) => u.topics.length > 0);
  if (units.length === 0) return null;
  const perTopic = []; // { unit, topic, match: [{key, subject}] }
  const unitHits = new Map(); // subject -> Set(keys) (topic or unit level)
  const topicHits = new Map(); // subject -> Set(keys)
  let total = 0;
  let matched = 0;
  const unitsOut = [];
  for (const u of units) {
    const unitWords = new Set([...words(u.title), ...u.topics.flatMap((t) => words(t))]);
    const unitLevel = oldMatchesIn(unitWords, false);
    const topicsOut = [];
    for (const t of u.topics) {
      total++;
      const tw = new Set(words(t));
      const hit = oldMatchesIn(tw, true);
      if (hit.length) matched++;
      for (const h of hit) {
        if (!topicHits.has(h.subject)) topicHits.set(h.subject, new Set());
        topicHits.get(h.subject).add(h.key);
        if (!unitHits.has(h.subject)) unitHits.set(h.subject, new Set());
        unitHits.get(h.subject).add(h.key);
      }
      topicsOut.push({ name: t, existing: [...new Set(hit.map((h) => h.key))] });
    }
    const topicKeys = new Set(topicsOut.flatMap((t) => t.existing));
    const weak = unitLevel.filter((h) => !topicKeys.has(h.key));
    for (const h of weak) {
      if (!unitHits.has(h.subject)) unitHits.set(h.subject, new Set());
      unitHits.get(h.subject).add(h.key);
    }
    unitsOut.push({
      number: u.number,
      title: u.title,
      ...(u.hours ? { hours: u.hours } : {}),
      topics: topicsOut,
      unitLevelExisting: [...new Set(weak.map((h) => h.key))],
    });
  }
  const ranked = [...unitHits.entries()]
    .map(([id, keys]) => ({
      id,
      n: keys.size,
      topicN: topicHits.get(id)?.size ?? 0,
      ot: keys.size / (subjectTotals.get(id) || 1),
    }))
    .sort((a, b) => b.n - a.n);
  const best = ranked[0];
  const second = ranked[1];
  const pt = total ? matched / total : 0;
  const nameSim =
    best && subjects.has(best.id) ? nameKey(subjects.get(best.id).name) === nameKey(c.name) : false;
  // A subject of the same name counts even when few topics match by wording ("Engineering Chemistry").
  const nameCands = [...subjects.values()].filter((sub) => {
    const a = new Set(nameKey(sub.name).split(" ").filter(Boolean));
    const b = new Set(nameKey(c.name).split(" ").filter(Boolean));
    if (a.size === 0 || b.size === 0) return false;
    const inter = [...a].filter((x) => b.has(x)).length;
    return inter / new Set([...a, ...b]).size >= 0.6;
  });
  let type;
  if ((!best || best.n < 2) && nameCands.length) {
    type = "Partly new";
    ranked.splice(
      0,
      ranked.length,
      ...nameCands.slice(0, 2).map((sub) => ({ id: sub.id, n: 0, topicN: 0, ot: 0, byName: true })),
    );
  } else if (!best || best.n < 2) type = "New";
  else if (second && second.n >= 4 && second.n >= 0.3 * best.n && best.n >= 4) type = "Combined";
  // "Mathematics - I" is a numbered part of a wider subject, never the same as it.
  else if (
    nameSim &&
    !/(\s|-)(i{1,3}|iv|[1-4])\s*$/i.test(c.name.replace(/\([^)]*\)/g, "").trim()) &&
    (pt >= 0.3 || best.ot >= 0.4)
  )
    type = "Same";
  else if (best.ot <= 0.6 && (pt >= 0.3 || best.n >= 5)) type = "Subset";
  else type = "Partly new";
  const reused = new Set(unitsOut.flatMap((u) => u.topics.flatMap((t) => t.existing)));
  const newTopics = unitsOut.reduce(
    (n, u) => n + u.topics.filter((t) => t.existing.length === 0).length,
    0,
  );
  return {
    type,
    best,
    second,
    ranked: ranked.slice(0, 3),
    reused: reused.size,
    newTopics,
    total,
    units: unitsOut,
  };
}

function categoryOf(c, coreFlag) {
  const rule = OVERRIDES.categories.find((r) => new RegExp(r.match, "i").test(c.name));
  if (rule) return { category: rule.category };
  return { category: coreFlag ? "core" : "non-core" };
}
const excluded = (bid, sem, x) =>
  OVERRIDES.exclude.some(
    (e) =>
      e.branch === bid && e.semester === sem && (e.code ? e.code === x.code : e.name === x.name),
  );

const summary = { courses: 0, full: 0, partly: 0, none: 0, unsure: [], byType: {} };
let md = "";
for (const [bid, branch] of Object.entries(extracted.branches)) {
  mapping.branches[bid] = { name: branch.name, semesters: {} };
  for (const [semKey, list] of Object.entries(branch.semesters)) {
    const sem = Number(semKey.split("-")[1]);
    const out = [];
    const table = [];
    const labLines = [];
    for (const c of list) {
      const flat = [c, ...(c.options ?? []).map((o) => ({ ...o, core: c.core, _slot: c.name }))];
      for (const x of flat) {
        if (excluded(bid, sem, x)) continue;
        const isOption = Boolean(x._slot);
        const cat = categoryOf(x, c.core);
        const labByName = /\b(lab|laboratory|practical|practicals|workshop)\b/i.test(x.name);
        // A practical-only course whose name is not a lab (Engineering Graphics) is matched on its experiments.
        const forAnalysis =
          x.type === "lab" && !labByName
            ? {
                ...x,
                units: [
                  {
                    number: 1,
                    title: x.name,
                    topics: x.experiments.map((e) => e.replace(/^[^:]*:\s*/, "")),
                  },
                ],
              }
            : x;
        const a = x.type === "lab" && labByName ? null : analyse(forAnalysis, c.core);
        const kind =
          x.type === "lab" && !labByName ? "theory" : (x.type ?? (isOption ? "theory" : c.type));
        const label = isOption ? `${x.name} (option of ${x._slot})` : x.name;
        let match = "n/a";
        let existing = "";
        let reused = "";
        let fresh = "";
        if (kind === "elective-slot") match = "slot (see options)";
        else if (kind === "lab" && labByName) {
          match = "Lab";
          existing = x.pairedTheory
            ? `pairs with ${x.pairedTheory}`
            : "own experiments (not a lesson subject)";
        } else if (kind === "no-syllabus") match = "no syllabus printed";
        else if (a) {
          match = a.type;
          existing = a.ranked
            .filter((r) => r.n >= 2 || r.byName)
            .map(
              (r) =>
                `${subjects.get(r.id)?.name ?? r.id} (${r.id}, ${r.byName ? "same name, 0 by wording" : r.n})`,
            )
            .join("; ");
          reused = a.reused;
          fresh = a.newTopics;
          summary.byType[a.type] = (summary.byType[a.type] ?? 0) + 1;
          if (a.type === "Same") summary.full++;
          else if (a.type === "New") summary.none++;
          else summary.partly++;
        }
        summary.courses++;
        if (cat.category === "unsure")
          summary.unsure.push({ branch: bid, sem, name: label, why: cat.why, lean: cat.lean });
        table.push(
          `| ${x.code ?? "(not printed)"} | ${label.replace(/\|/g, "/")} | ${cat.category === "unsure" ? "unsure (lean " + cat.lean + ")" : cat.category === "core" ? "Core" : "Non-core"} | ${match} | ${existing.replace(/\|/g, "/")} | ${reused} | ${fresh} |`,
        );
        out.push({
          key: x.key,
          code: x.code ?? null,
          name: x.name,
          semester: sem,
          credits: x.credits,
          category: cat.category === "unsure" ? "unsure" : cat.category,
          ...(cat.category === "unsure" ? { leaning: cat.lean, whyUnsure: cat.why } : {}),
          kind,
          match,
          ...(isOption ? { optionOf: x._slot } : {}),
          ...(a
            ? {
                existingSubjects: a.ranked
                  .filter((r) => r.n >= 2 || r.byName)
                  .map((r) => ({ subject: r.id, topicsMatched: r.n })),
                reusedTopics: a.reused,
                newTopics: a.newTopics,
                units: a.units,
              }
            : {}),
          ...(kind === "lab" && x.pairedTheory ? { pairedTheory: x.pairedTheory } : {}),
          sourcePage: x.page,
        });
      }
    }
    mapping.branches[bid].semesters[semKey] = out;
    md += `\n### ${branch.name}, semester ${sem}\n\n| Code | PDEU course | Category | Match | Existing Prism subject(s) (id, topics matched) | Topic ids reused | New topics |\n|---|---|---|---|---|---|---|\n${table.join("\n")}\n`;
    void labLines;
  }
}

const head = `# PDEU courses mapped onto Prism's existing subjects

Generated by \`scripts/map-pdeu.mjs\` from \`syllabus-extracted.json\` and the existing subject files. Rule-based, no AI. **Draft for the owner's review: nothing in the app has changed because of it.**

How to read it: **Same** = same content, maybe a different name. **Subset** = the PDEU course covers part of an existing, wider subject. **Combined** = it draws on more than one existing subject. **Partly new** = some existing topics, many missing. **New** = nothing in Prism matches. "Topic ids reused" = distinct existing topics found in the PDEU topic text (or its unit text); "New topics" = PDEU topics with no existing topic. Labs are listed against the theory course they pair with. Categories follow PDEU's own core / non-core tags, with the unclear ones marked **unsure**.

## Summary

- Courses and elective options listed: ${summary.courses}
- With a syllabus to map: ${Object.values(summary.byType).reduce((a, b) => a + b, 0)} (Same ${summary.byType.Same ?? 0}, Subset ${summary.byType.Subset ?? 0}, Combined ${summary.byType.Combined ?? 0}, Partly new ${summary.byType["Partly new"] ?? 0}, New ${summary.byType.New ?? 0})
- Reuse existing data fully (Same): ${summary.full}; partly (Subset, Combined, Partly new): ${summary.partly}; not at all (New): ${summary.none}
- Unsure categories: ${summary.unsure.length}

## Unsure (the owner decides)

${summary.unsure.length ? "| Branch | Sem | Course | Why | Leaning |\n|---|---|---|---|---|\n" + summary.unsure.map((u) => `| ${u.branch} | ${u.sem} | ${u.name} | ${u.why} | ${u.lean} |`).join("\n") : "None."}
`;
writeFileSync(join(DIR, "MAPPING.md"), `${head}\n## Tables\n${md}`);
writeFileSync(join(DIR, "mapping.json"), `${JSON.stringify(mapping, null, 1)}\n`);
console.log(
  JSON.stringify({
    courses: summary.courses,
    byType: summary.byType,
    unsure: summary.unsure.length,
  }),
);
