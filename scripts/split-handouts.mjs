// Syllabus fix, Phase 2 step 0: cut each semester's combined handout PDF into
// one PDF per course. Reads handouts/<BRANCH>/sem<N>/*.pdf (never changed),
// writes handouts/_split/<BRANCH>/sem<N>/<CODE>_<title>.pdf, plus
// handouts/_split/manifest.json and handouts/_split/SPLIT_REPORT.md.
// Free and local: pdfjs-dist for text, pdf-lib to copy pages.
//
//   node scripts/split-handouts.mjs
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  BRANCH_FOLDERS,
  SKIPPED_FOLDERS,
  detectCourseStarts,
  isLabCourse,
  isPlaceholderCode,
  parseLtp,
  readPdfLines,
  slug,
} from "./lib/handout-text.mjs";

const ROOT = path.resolve("handouts");
const OUT = path.join(ROOT, "_split");

/**
 * Internships, seminars, major/comprehensive projects, yoga/NSS/NCC: real
 * courses, but not taught subjects. "Project Management" is a taught course,
 * so only these exact kinds of project count.
 */
function isNonTeaching(code, title) {
  return (
    /^\d{2}(INT|PR)/.test(code ?? "") ||
    /internship|seminar|\b(?:major|comprehensive|capstone|mini)\s+project|^project$|orientation|industrial training|\byog(?:a)?\b|\b(?:nss|ncc)\b|national service|cadet corps/i.test(
      title,
    )
  );
}

const baseName = (title) =>
  title
    .toLowerCase()
    .replace(/\b(lab|laboratory|practical)\b|\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ltpText = (l) => `${l.L}-${l.T}-${l.P}`;

/**
 * Theory, lab or other. A lab is named as one, has a P code, or is taught
 * with no lectures (L-T-P = 0-0-P, e.g. field work), unless the semester also
 * has a "<same name> Laboratory": then the 0-0-P is a copy error in the PDF.
 */
function classify(courses) {
  const labNames = new Set(
    courses.filter((c) => isLabCourse(c.code, c.title)).map((c) => baseName(c.title)),
  );
  return courses.map((c) => {
    let kind = "theory";
    let check = null;
    const practicalOnly = c.ltp && c.ltp.L === 0 && c.ltp.T === 0 && c.ltp.P > 0;
    if (isNonTeaching(c.code, c.title)) kind = "other";
    else if (isLabCourse(c.code, c.title)) {
      kind = "lab";
      if (c.ltp && c.ltp.L > 0) check = `named a lab but L-T-P is ${ltpText(c.ltp)}`;
    } else if (practicalOnly) {
      if (labNames.has(baseName(c.title)))
        check = `L-T-P ${ltpText(c.ltp)} but a separate lab exists: kept as theory`;
      else kind = "lab";
    }
    return { ...c, kind, ...(check ? { check } : {}) };
  });
}

async function splitFile(file) {
  const pages = await readPdfLines(file);
  const starts = [];
  const notes = [];
  pages.forEach((lines, i) => {
    for (const s of detectCourseStarts(lines, pages[i - 1])) {
      const prev = starts.at(-1);
      // The same heading again at the top of the next page = the course goes on.
      if (prev && !s.midPage && prev.code === s.code && prev.title === s.title) {
        notes.push(`p${i + 1}: heading of ${s.code ?? s.title} repeated, kept as one course`);
        continue;
      }
      starts.push({ page: i + 1, ...s });
    }
  });
  const found = starts.map((s, k) => {
    const next = starts[k + 1];
    // A course that starts mid-page shares that page with the one before it.
    const to = next ? (next.midPage ? next.page : next.page - 1) : pages.length;
    if (s.midPage) notes.push(`p${s.page}: ${s.code ?? s.title} starts mid-page (page shared)`);
    const text = [...pages[s.page - 1].slice(s.line), ...(pages[s.page] ?? [])];
    return {
      code: s.code,
      title: s.title,
      ltp: parseLtp(text),
      titleOnPrevPage: s.titleOnPrevPage,
      from: s.page,
      fromLine: s.line,
      to: Math.max(s.page, to),
    };
  });
  const courses = classify(found);
  for (const c of courses) if (c.check) notes.push(`p${c.from}: ${c.code ?? c.title}: ${c.check}`);
  const firstCourse = starts[0]?.page ?? pages.length + 1;
  const frontMatter = Array.from({ length: firstCourse - 1 }, (_, i) => i + 1);
  return { pageCount: pages.length, courses, frontMatter, notes };
}

async function writePieces(file, outDir, courses) {
  const src = await PDFDocument.load(readFileSync(file));
  const used = new Map();
  for (const c of courses) {
    const code = (c.code ?? "NOCODE").replace(/[^A-Za-z0-9_]/g, "x");
    const base = `${code}_${slug(c.title) || "untitled"}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const name = `${n > 1 ? `${base}-${n}` : base}.pdf`;
    const doc = await PDFDocument.create();
    const idx = Array.from({ length: c.to - c.from + 1 }, (_, i) => c.from - 1 + i);
    for (const p of await doc.copyPages(src, idx)) doc.addPage(p);
    writeFileSync(path.join(outDir, name), await doc.save());
    c.file = path.relative(ROOT, path.join(outDir, name)).replaceAll("\\", "/");
  }
}

function problemsFor(sem) {
  const out = [];
  const theory = sem.courses.filter((c) => c.kind === "theory");
  if (sem.courses.length === 0) out.push("no courses found");
  else if (theory.length < 4 || theory.length > 9)
    out.push(`${theory.length} theory courses (expected 4 to 9)`);
  const seen = new Map();
  for (const c of sem.courses) {
    if (isPlaceholderCode(c.code)) continue;
    seen.set(c.code, (seen.get(c.code) ?? 0) + 1);
  }
  for (const [code, n] of seen) if (n > 1) out.push(`code ${code} used ${n} times`);
  for (const c of sem.courses)
    if (!c.title) out.push(`p${c.from}: course with no title (${c.code ?? "no code"})`);
  const noCode = sem.courses.filter((c) => c.title && !c.code && c.kind !== "other");
  if (noCode.length)
    out.push(`no course code printed (${noCode.length}): ${noCode.map((c) => c.title).join("; ")}`);
  return out;
}

function report(manifest) {
  const L = [];
  L.push("# Handout split report", "");
  L.push(
    'Made by `node scripts/split-handouts.mjs`. Each semester\'s combined PDF was cut at pages where a course handout starts (a "Teaching Scheme" table near the top of the page, with the course code and name above it). The originals are unchanged.',
    "",
    "- **Theory** = taught subjects (what Prism shows). **Lab** = laboratory/practical courses. **Other** = internships, seminars, projects.",
    "- **Front** = pages before the first course (course outline tables, cover pages). They don't belong to any course on purpose.",
    "- Most pieces are one page long: in these handouts each course fits on one dense page, so one-page pieces are normal and not flagged.",
    "- Flagged: fewer than 4 or more than 9 theory courses, a repeated course code, a course without a code or title, or a scheme table that starts mid-page.",
    "",
  );
  const all = manifest.semesters;
  const theory = all.reduce((n, s) => n + s.courses.filter((c) => c.kind === "theory").length, 0);
  const pieces = all.reduce((n, s) => n + s.courses.length, 0);
  L.push(
    `**Totals:** ${all.length} semester PDFs, ${pieces} course pieces, ${theory} theory courses.`,
    "",
  );
  if (manifest.skipped.length) L.push(`Skipped folders: ${manifest.skipped.join(", ")}.`, "");

  L.push("## Course counts per semester", "");
  L.push("| Branch | Sem | Pages | Front | Theory | Lab | Other | Flags |");
  L.push("| ------ | --- | ----- | ----- | ------ | --- | ----- | ----- |");
  for (const s of all) {
    const n = (k) => s.courses.filter((c) => c.kind === k).length;
    L.push(
      `| ${s.folder} | ${s.sem} | ${s.pageCount} | ${s.frontMatter.length} | ${n("theory")} | ${n("lab")} | ${n("other")} | ${s.problems.length || ""} |`,
    );
  }
  L.push("");

  const flagged = all.filter((s) => s.problems.length);
  L.push("## Flagged", "");
  if (flagged.length === 0) L.push("Nothing flagged.", "");
  for (const s of flagged) {
    L.push(`- **${s.folder} sem ${s.sem}**`);
    for (const p of s.problems) L.push(`  - ${p}`);
  }
  L.push("");

  const noted = all.filter((s) => s.notes.length);
  L.push("## Notes (handled automatically; lines about L-T-P are worth a human check)", "");
  for (const s of noted) L.push(`- **${s.folder} sem ${s.sem}:** ${s.notes.join("; ")}`);
  L.push("");

  L.push("## Courses found", "");
  for (const s of all) {
    L.push(`### ${s.folder} sem ${s.sem} (${path.basename(s.source)})`, "");
    if (s.courses.length === 0) {
      L.push("No course handouts found in this PDF.", "");
      continue;
    }
    L.push("| Pages | Code | Title | Kind |", "| ----- | ---- | ----- | ---- |");
    for (const c of s.courses) {
      const pages = c.from === c.to ? `${c.from}` : `${c.from}-${c.to}`;
      L.push(
        `| ${pages} | ${c.code ?? "?"} | ${c.title.replaceAll("|", "/") || "?"} | ${c.kind} |`,
      );
    }
    L.push("");
  }
  return L.join("\n");
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    skipped: [],
    unknown: [],
    semesters: [],
  };
  for (const folder of readdirSync(ROOT).sort()) {
    if (folder.startsWith("_") || !statSync(path.join(ROOT, folder)).isDirectory()) continue;
    if (SKIPPED_FOLDERS.includes(folder)) {
      manifest.skipped.push(folder);
      continue;
    }
    if (!(folder in BRANCH_FOLDERS)) {
      manifest.unknown.push(folder);
      continue;
    }
    const semDirs = readdirSync(path.join(ROOT, folder))
      .filter((d) => /^sem[1-8]$/.test(d))
      .sort();
    for (const semDir of semDirs) {
      const dir = path.join(ROOT, folder, semDir);
      for (const name of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
        const file = path.join(dir, name);
        const result = await splitFile(file);
        const outDir = path.join(OUT, folder, semDir);
        mkdirSync(outDir, { recursive: true });
        await writePieces(file, outDir, result.courses);
        const sem = {
          folder,
          branch: BRANCH_FOLDERS[folder],
          sem: Number(semDir.slice(3)),
          source: path.relative(ROOT, file).replaceAll("\\", "/"),
          ...result,
        };
        sem.problems = problemsFor(sem);
        manifest.semesters.push(sem);
        console.log(`${folder}/${semDir}: ${result.courses.length} pieces`);
      }
    }
  }
  if (manifest.unknown.length)
    console.log(`Unknown folders (not split): ${manifest.unknown.join(", ")}`);
  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(path.join(OUT, "SPLIT_REPORT.md"), report(manifest) + "\n");
  console.log("Wrote handouts/_split/manifest.json and SPLIT_REPORT.md");
}

await main();
