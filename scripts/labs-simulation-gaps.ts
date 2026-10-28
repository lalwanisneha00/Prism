/*
 * Writes docs/SIMULATION_GAPS.md (syllabus fix, Phase 7B): the lab experiments no simulation
 * template fits, so the owner knows which templates to build next. Rule-based (the same shortlist
 * the lesson writer gets); `--live` also adds experiments where the AI found no fitting template
 * (Firestore `labSimulationGaps`, 1 read per entry).
 *
 *   npm run labs:gaps            (from the data only)
 *   npm run labs:gaps -- --live  (plus what the AI reported)
 */
import { existsSync, writeFileSync } from "node:fs";
import { adminFromEnv } from "@/lib/firebase/adminCore";
import { experimentsOf } from "@/lib/labs/experiment";
import { shortlistTemplates } from "@/lib/labs/templates";
import { labSubjects } from "@/lib/subjects";

const live = process.argv.includes("--live");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

type Row = {
  course: string;
  subject: string;
  experiment: string;
  why: "no template" | "AI: none fits";
};

async function main() {
  const rows: Row[] = [];
  const used = new Map<string, number>();
  let total = 0;
  for (const lab of labSubjects) {
    for (const { topic } of experimentsOf(lab)) {
      total++;
      const best = shortlistTemplates(topic, lab.name)[0];
      if (best) used.set(best.id, (used.get(best.id) ?? 0) + 1);
      else
        rows.push({
          course: lab.name,
          subject: lab.id,
          experiment: topic.name,
          why: "no template",
        });
    }
  }
  if (live) {
    const admin = adminFromEnv(process.env);
    if (!admin) throw new Error("--live needs the FIREBASE_ADMIN_* settings in .env.local");
    const snap = await admin.db.collection("labSimulationGaps").get();
    for (const doc of snap.docs) {
      const d = doc.data() as { course?: string; subject?: string; experiment?: string };
      if (!rows.some((r) => r.subject === d.subject && r.experiment === d.experiment))
        rows.push({
          course: String(d.course ?? d.subject),
          subject: String(d.subject),
          experiment: String(d.experiment),
          why: "AI: none fits",
        });
    }
  }
  // Words that come up most among the gaps hint at the next template to build.
  const words = new Map<string, number>();
  const stop = new Set(
    "the and for with from using study determine determination of to a an in on by its given part various design simulation analysis".split(
      " ",
    ),
  );
  for (const r of rows)
    for (const w of new Set(r.experiment.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []))
      if (!stop.has(w)) words.set(w, (words.get(w) ?? 0) + 1);
  const topWords = [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

  const byCourse = new Map<string, Row[]>();
  for (const r of rows) byCourse.set(r.course, [...(byCourse.get(r.course) ?? []), r]);
  const md = [
    "# Simulation gaps",
    "",
    "Lab experiments that no simulation template fits yet (syllabus fix, Phase 7B). Their lessons show the labelled setup diagram and an animated step-through of the procedure instead. Regenerate with `npm run labs:gaps` (add `-- --live` to include what the AI reported).",
    "",
    `- Experiments: ${total}, with a template: ${total - rows.filter((r) => r.why === "no template").length}, without: ${rows.filter((r) => r.why === "no template").length}${live ? `, AI found none fits: ${rows.filter((r) => r.why === "AI: none fits").length}` : ""}.`,
    "- Templates used most (best match per experiment): " +
      [...used.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id, n]) => `${id} ${n}`)
        .join(", ") +
      ".",
    "- Most common words among the gaps (ideas for the next templates): " +
      topWords.map(([w, n]) => `${w} ${n}`).join(", ") +
      ".",
    "",
    ...[...byCourse.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .flatMap(([course, list]) => [
        `## ${course} (${list.length})`,
        "",
        ...list.map(
          (r) =>
            `- ${r.experiment.replace(/\s+/g, " ").slice(0, 160)}${r.why === "AI: none fits" ? " (AI: none fits)" : ""}`,
        ),
        "",
      ]),
  ].join("\n");
  writeFileSync("docs/SIMULATION_GAPS.md", md);
  console.log(`docs/SIMULATION_GAPS.md: ${rows.length} gaps of ${total} experiments.`);
}

main().catch((err: unknown) => {
  console.error(String(err));
  process.exit(1);
});
