/*
 * Turns the text of PDEU's all-branches syllabus PDF into one JSON file per branch in
 * src/data/pdeu/. Run once when the syllabus changes:
 *
 *   pdftotext -enc UTF-8 -layout PDEU_BTech_All_Branches_Syllabus.pdf syllabus.txt
 *   node scripts/build-pdeu.mjs syllabus.txt
 *
 * Nothing is invented: a course the handbook does not print a syllabus for is written with a note
 * and no units. The credit totals of every semester are checked against the credit table the PDF
 * prints for each branch (the script stops if they differ).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input) throw new Error("usage: node scripts/build-pdeu.mjs <syllabus.txt>");
const lines = readFileSync(input, "utf8").replace(/\f/g, "\n").split(/\r?\n/);

const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
const BRANCH_IDS = {
  "Computer Engineering": { id: "ce", short: "CE" },
  "Information and Communication Technology": { id: "ict", short: "ICT" },
  "Electronics and Communication Engineering": { id: "ece", short: "ECE" },
  "Civil Engineering": { id: "civil", short: "Civil" },
  "Petroleum Engineering": { id: "petro", short: "Petro" },
  Biotechnology: { id: "biotech", short: "Biotech" },
  "Mechanical Engineering": { id: "me", short: "Mech" },
};

const isHeaderOrFooter = (l) => /^\s*Page \d+\s*$/.test(l) || /^PDEU B\.Tech syllabus/.test(l);

/** Splits a topic paragraph into topics: on ";" when used, otherwise on commas outside brackets. */
function splitTopics(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sep = clean.includes(";") ? ";" : ",";
  const parts = [];
  let depth = 0;
  let cur = "";
  for (const ch of clean) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  const out = [];
  const pieces = parts.flatMap((p) =>
    p.trim().length > 140 ? p.split(/(?<=[a-z)])\.\s+(?=[A-Z])|\s[–—]\s/) : [p],
  );
  for (let p of pieces) {
    p = p
      .trim()
      .replace(/^[-–•\s]+/, "")
      .replace(/[.\s]+$/, "")
      .trim();
    if (!p) continue;
    // Very short fragments ("etc", "and") belong to the previous topic.
    if (p.length < 3 && out.length > 0) out[out.length - 1] += `, ${p}`;
    else out.push(p);
  }
  return out;
}

/** "Unit 1: Title (8 hrs) – topics" and "Unit 1 (8 hrs) – Title: topics" → { title, hours, topics }. */
function parseUnit(raw, group) {
  const text = raw.replace(/\s+/g, " ").trim();
  const m = /^Unit\s+(\d+)\s*:?\s*(.*)$/i.exec(text);
  if (!m) return null;
  const number = Number(m[1]);
  const rest = m[2];
  const hoursMatch = /\(\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)\s*\)/i.exec(rest);
  let title = "";
  let body = "";
  let hours;
  if (hoursMatch) {
    hours = Number(hoursMatch[1]);
    const before = rest.slice(0, hoursMatch.index).trim();
    const after = rest
      .slice(hoursMatch.index + hoursMatch[0].length)
      .replace(/^\s*[–—-]\s*/, "")
      .trim();
    if (before) {
      title = before.replace(/[:\s]+$/, "");
      body = after;
    } else {
      const colon = after.indexOf(":");
      if (colon > 0 && colon < 110) {
        title = after.slice(0, colon).trim();
        body = after.slice(colon + 1).trim();
      } else {
        title = `Unit ${number}`;
        body = after;
      }
    }
  } else {
    const dash = /\s[–—]\s/.exec(rest);
    if (dash) {
      title = rest.slice(0, dash.index).trim();
      body = rest.slice(dash.index + dash[0].length).trim();
    } else {
      const colon = rest.indexOf(":");
      if (colon > 0 && colon < 110) {
        title = rest.slice(0, colon).trim();
        body = rest.slice(colon + 1).trim();
      } else {
        title = rest.trim() || `Unit ${number}`;
      }
    }
  }
  const prefix = group ? `${group}: ` : "";
  return {
    number,
    title: `${prefix}${title}`.replace(/\s+/g, " ").trim(),
    ...(hours !== undefined ? { hours } : {}),
    topics: splitTopics(body),
  };
}

/** Reads the lines under one course heading into units / experiments / notes. */
function parseBody(bodyLines) {
  const units = [];
  const experiments = [];
  const notes = [];
  let mode = "pre";
  let group = "";
  let current = null;
  let exp = null;
  let prevBlank = false;
  const flushUnit = () => {
    if (current) {
      const u = parseUnit(current, group);
      if (u) units.push(u);
      current = null;
    }
  };
  for (let i = 0; i < bodyLines.length; i++) {
    const t = bodyLines[i].trim();
    if (!t) {
      prevBlank = true;
      continue;
    }
    const wasBlank = prevBlank;
    prevBlank = false;
    const next = bodyLines.slice(i + 1).find((x) => x.trim());
    if (/^Experiments? \/ practical work:?/i.test(t)) {
      flushUnit();
      mode = "exp";
      continue;
    }
    if (/^Unit\s+\d+/i.test(t)) {
      flushUnit();
      exp = null;
      mode = "unit";
      current = t;
      continue;
    }
    if (mode === "exp") {
      const e = /^(\d+)\.\s+(.*)$/.exec(t);
      if (e) {
        exp = e[2];
        experiments.push(exp);
      } else if (experiments.length > 0) {
        experiments[experiments.length - 1] += ` ${t}`;
      } else notes.push(t);
      continue;
    }
    // A short heading that sits right above "Unit 1", e.g. "Yoga, Health & Hygiene".
    if (
      mode !== "pre" &&
      wasBlank &&
      next &&
      /^Unit\s+\d+/i.test(next.trim()) &&
      t.length < 50 &&
      !/[.;]$/.test(t)
    ) {
      flushUnit();
      group = t;
      continue;
    }
    if (mode === "unit" && current !== null) current += ` ${t}`;
    else notes.push(t);
  }
  flushUnit();
  return {
    units,
    experiments: experiments.map((e) => e.replace(/\s+/g, " ").trim()),
    notes: [notes.join(" ").replace(/\s+/g, " ").trim()].filter(Boolean),
  };
}

/** "Code: 24MA101T | Basic Science | L-T-P: 3-1-0 | Credits: 4" */
function parseMeta(line) {
  const parts = line.split("|").map((s) => s.trim());
  const codeRaw = parts[0].replace(/^Code:\s*/i, "").trim();
  const code = /^code not given$/i.test(codeRaw) ? undefined : codeRaw;
  let category = "";
  let ltp;
  let credits = 0;
  let creditsNote;
  for (const p of parts.slice(1)) {
    const l = /^L-T-P:\s*(.+)$/i.exec(p);
    const c = /^Credits:\s*([\d.]+)\s*(.*)$/i.exec(p);
    if (l) ltp = /^\d+-\d+-\d+$/.test(l[1].trim()) ? l[1].trim() : undefined;
    else if (c) {
      credits = Number(c[1]);
      creditsNote = c[2].replace(/^[()\s]+|[()\s]+$/g, "") || undefined;
    } else if (!category) category = p;
  }
  return {
    code,
    category,
    ...(ltp ? { ltp } : {}),
    credits,
    ...(creditsNote ? { creditsNote } : {}),
  };
}

// ---- find branches ----
const branchStarts = [];
for (let i = 0; i < lines.length; i++) {
  if (/^B\.Tech\. \S/.test(lines[i]) && !/syllabus/i.test(lines[i])) branchStarts.push(i);
}
const branches = [];
for (let b = 0; b < branchStarts.length; b++) {
  const start = branchStarts[b];
  const end = b + 1 < branchStarts.length ? branchStarts[b + 1] : lines.length;
  const block = lines.slice(start, end).filter((l) => !isHeaderOrFooter(l));
  let name = block[0].replace(/^B\.Tech\.\s*/, "").trim();
  if (
    block[1] &&
    block[1].trim() &&
    !/^\s/.test(block[1]) &&
    !/^Department|^School/.test(block[1])
  ) {
    name = `${name} ${block[1].trim()}`;
  }
  const ids = BRANCH_IDS[name];
  if (!ids) throw new Error(`Unknown branch heading: ${name}`);

  // credit table and notes (before the first section)
  const firstSection = block.findIndex((l) => /·\s*(NOT-CORE|CORE) SUBJECTS\s*$/.test(l));
  const head = block.slice(0, firstSection);
  const credits = {};
  const notes = [];
  let curNote = null;
  let department = "";
  let handbook = "";
  for (const l of head.slice(1)) {
    const row = /^(Semester ([IVX]+)|All 8 semesters)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(l.trim());
    if (row) {
      credits[row[2] ? ROMAN[row[2]] : "total"] = {
        core: Number(row[3]),
        notCore: Number(row[4]),
        total: Number(row[5]),
      };
      continue;
    }
    if (/^[•·]/.test(l.trim())) {
      curNote = l.trim().replace(/^[•·]\s*/, "");
      notes.push(curNote);
      continue;
    }
    if (curNote !== null && l.trim() && /^\s/.test(l)) {
      notes[notes.length - 1] += ` ${l.trim()}`;
      continue;
    }
    if (!l.trim()) {
      curNote = null;
      continue;
    }
    if (/^Department|^School/.test(l.trim())) department = l.trim();
    else if (/Curriculum Handbook|Course Structure/.test(l)) handbook = l.trim();
  }

  // sections
  const subjects = [];
  let core = true;
  let semester = 0;
  const pendingOptions = [];
  const items = []; // { nameLine, metaLine, bodyStart, isOption }
  const body = block.slice(firstSection);
  for (let i = 0; i < body.length; i++) {
    const sec = /·\s*(NOT-CORE|CORE) SUBJECTS\s*$/.exec(body[i]);
    if (sec) {
      core = sec[1] === "CORE";
      continue;
    }
    const sem = /^Semester ([IVX]+)\s*$/.exec(body[i].trim());
    if (sem && !/^\s{3,}/.test(body[i])) {
      semester = ROMAN[sem[1]];
      continue;
    }
    if (/^\s*(Option for [^|]+\|\s*)?Code:/.test(body[i])) {
      let j = i - 1;
      while (j >= 0 && !body[j].trim()) j--;
      items.push({
        line: i,
        nameLine: j,
        core,
        semester,
        isOption: /^\s*Option for/.test(body[i]),
      });
    }
  }
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const nextStart = k + 1 < items.length ? items[k + 1].nameLine : body.length;
    // Stop at a section/semester line.
    let stop = nextStart;
    for (let i = it.line + 1; i < nextStart; i++) {
      if (
        /·\s*(NOT-CORE|CORE) SUBJECTS\s*$/.test(body[i]) ||
        /^Semester ([IVX]+)\s*$/.test(body[i].trim())
      )
        if (!/^\s{3,}/.test(body[i])) {
          stop = i;
          break;
        }
    }
    let rawName = body[it.nameLine].trim();
    const notCore = /\(Not core\)\s*$/.test(rawName);
    rawName = rawName.replace(/\s*\(Not core\)\s*$/, "");
    let track;
    const tr = /^(.*?)\s*\(([^()]*track)\)\s*$/.exec(rawName);
    if (tr) {
      rawName = tr[1];
      track = tr[2];
    }
    const meta = parseMeta(body[it.line].replace(/^\s*Option for ([^|]+)\|/, ""));
    const slot = /^\s*Option for ([^|]+)\|/.exec(body[it.line]);
    const parsed = parseBody(
      body.slice(it.line + 1, stop).filter((l) => !/^\s*Options available in Semester/.test(l)),
    );
    const subject = {
      ...(meta.code ? { code: meta.code } : {}),
      name: rawName.replace(/\s+/g, " "),
      category: meta.category,
      ...(meta.ltp ? { ltp: meta.ltp } : {}),
      credits: meta.credits,
      ...(meta.creditsNote ? { creditsNote: meta.creditsNote } : {}),
      semester: it.semester,
      core: it.core && !notCore,
      ...(track ? { track } : {}),
      ...(slot ? { slot: slot[1].trim() } : {}),
      units: parsed.units,
      ...(parsed.experiments.length ? { experiments: parsed.experiments } : {}),
      ...(parsed.notes.length ? { notes: parsed.notes } : {}),
    };
    const isSlot =
      !it.isOption &&
      parsed.notes.some((n) => /^Elective slot\./.test(n)) &&
      parsed.units.length === 0;
    if (isSlot) {
      subject.options = [];
      subject.notes = parsed.notes.filter((n) => !/^Elective slot\./.test(n));
      if (subject.notes.length === 0) delete subject.notes;
    }
    if (it.isOption) {
      pendingOptions.push({ label: subject.slot, semester: it.semester, subject });
    } else subjects.push(subject);
  }
  // Options belong to the slot whose label they name ("PE-1"): same semester first, else any.
  // They can be printed before their slot heading, so this runs once everything is read.
  for (const o of pendingOptions) {
    const labels = o.label.split("/").map((x) => x.trim());
    const slots = subjects.filter((s) => s.options && labels.includes(labelOf(s)));
    let owner = slots.find((s) => s.semester === o.semester) ?? slots[0];
    if (!owner) {
      // "Sem 6 elective A" → the slot of that semester named "... Elective A"; no letter → its only slot.
      const letter = /\s([A-Z])$/.exec(o.label)?.[1];
      const inSem = subjects.filter((s) => s.options && s.semester === o.semester);
      owner =
        (letter && inSem.find((s) => new RegExp(`Elective ${letter}\\b`).test(s.name))) ||
        (inSem.length === 1 ? inSem[0] : undefined);
    }
    if (!owner)
      throw new Error(
        `Option without a slot: ${o.subject.name} (${name}) label=${JSON.stringify(o.label)} sem=${o.semester} slots=${subjects.filter((s) => s.options).map((s) => s.name + "@" + s.semester)}`,
      );
    delete o.subject.semester;
    delete o.subject.core;
    owner.options.push(o.subject);
    // "PE-2 / PE-3" options are printed once; the other slot points at where they are listed.
    for (const other of subjects.filter(
      (s) => s.options && s !== owner && labels.includes(labelOf(s)) && s.options.length === 0,
    )) {
      other.optionsListedUnder = owner.name;
    }
  }

  // A slot whose options the handbook never lists says so, instead of promising a list.
  for (const s of subjects) {
    if (s.options && s.options.length === 0 && !s.optionsListedUnder) {
      delete s.options;
      s.notes = [...(s.notes ?? []), "The handbook does not list the options for this elective."];
    }
  }

  branches.push({
    id: ids.id,
    name,
    short: ids.short,
    department,
    handbook,
    credits,
    notes,
    subjects,
  });
}

/** "Program Elective 1" → "PE-1"; "Open Elective 2" → "OE-2"; "Department Elective III" → "DE-III". */
function labelOf(s) {
  const m = /^(Program|Open|Department|Professional)\s+Elective\s+([\dIVX]+)/i.exec(s.name);
  if (!m) return "";
  const word = { program: "PE", open: "OE", department: "DE", professional: "PE" }[
    m[1].toLowerCase()
  ];
  return `${word}-${m[2]}`;
}

// ---- check credits against the table the PDF prints ----
let problems = 0;
for (const b of branches) {
  for (let sem = 1; sem <= 8; sem++) {
    const want = b.credits[sem];
    if (!want) continue;
    const sum = (core) =>
      b.subjects
        .filter((s) => s.semester === sem && s.core === core)
        .reduce((a, s) => a + s.credits, 0);
    const got = { core: sum(true), notCore: sum(false) };
    if (got.core !== want.core || got.notCore !== want.notCore) {
      problems++;
      console.warn(
        `${b.id} sem ${sem}: table says core ${want.core}/not-core ${want.notCore}, parsed ${got.core}/${got.notCore}`,
      );
    }
  }
}

// Stable url keys: "<semester>-<name slug>", made unique inside the branch.
const slug = (t) =>
  t
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
for (const b of branches) {
  const taken = new Set();
  const unique = (base) => {
    let k = base;
    for (let n = 2; taken.has(k); n++) k = `${base}-${n}`;
    taken.add(k);
    return k;
  };
  b.subjects = b.subjects.map((s) => {
    const key = unique(`s${s.semester}-${slug(s.name)}`);
    const options = s.options?.map((o) => ({ key: unique(`${key}--${slug(o.name)}`), ...o }));
    return { key, ...s, ...(options ? { options } : {}) };
  });
}

const outDir = join(root, "src", "data", "pdeu");
mkdirSync(outDir, { recursive: true });
for (const b of branches) {
  writeFileSync(join(outDir, `${b.id}.json`), `${JSON.stringify(b, null, 2)}\n`);
  const n = b.subjects.length;
  const topics = b.subjects.reduce(
    (a, s) => a + s.units.reduce((x, u) => x + u.topics.length, 0),
    0,
  );
  console.log(`${b.id}: ${n} courses, ${topics} topics`);
}
console.log(problems === 0 ? "credit tables all match" : `${problems} semester(s) differ`);
