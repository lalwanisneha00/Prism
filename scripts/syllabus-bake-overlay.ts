// Syllabus fix, Phase 5: copy the live fixes students voted through (Firestore
// `syllabusOverlay/current`) into the syllabus JSON, so they are in git and in the next build.
//
//   npm run syllabus:bake-overlay                 → dry run: lists what would change
//   npm run syllabus:bake-overlay -- --write      → writes the subject files, history, stale map
//   ... -- --from=backups/overlay.json            → reads the overlay from a file instead
//
// Safe to run again: a fix already in the JSON changes nothing (each change checks first). The
// overlay itself is left as it is; the app lays it over the JSON, which is then a no-op.
// Only the course files (`src/data/subjects/*.json`) change; the handbook view
// (`src/data/pdeu/<branch>.json`) is not edited, so a moved course's handbook row may need an admin
// migration. Run `npx prettier --write "src/data/subjects/pdeu-*.json"` and
// `npm run syllabus:check` afterwards.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { adminFromEnv } from "@/lib/firebase/adminCore";
import type { Subject } from "@/lib/subjects";
import { formatHistory, historyEntry, type HistoryEntry } from "@/lib/syllabusFix/history";
import {
  activeChanges,
  applyOverlay,
  OverlaySchema,
  type AppliedChange,
  type Overlay,
} from "@/lib/syllabusFix/overlay";
import { markStale, StaleTopicsSchema } from "@/lib/syllabusFix/stale";

const HISTORY = "data/university/pdeu/history.jsonl";
const STALE = "src/data/syllabus/stale-topics.json";
const write = process.argv.includes("--write");
const from = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);

async function readOverlay(): Promise<Overlay> {
  if (from) return OverlaySchema.parse(JSON.parse(readFileSync(from, "utf8")));
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const admin = adminFromEnv(process.env);
  if (!admin) {
    console.error("FIREBASE_ADMIN_* are not set. Use --from=<overlay.json> instead.");
    process.exit(1);
  }
  const snap = await admin.db.collection("syllabusOverlay").doc("current").get();
  return snap.exists
    ? OverlaySchema.parse(snap.data())
    : { version: 1, updatedAt: "", changes: [] };
}

async function main() {
  const overlay = await readOverlay();
  const changes = activeChanges(overlay);
  const bySubject = new Map<string, AppliedChange[]>();
  for (const c of changes)
    for (const id of new Set([c.change.prism?.subject, c.change.to?.subject].filter(Boolean)))
      bySubject.set(id as string, [...(bySubject.get(id as string) ?? []), c]);

  const now = new Date().toISOString();
  const history: HistoryEntry[] = [];
  const staleKeys: { subject: string; topic: string }[] = [];
  let files = 0;
  for (const [id, list] of bySubject) {
    const file = `src/data/subjects/${id}.json`;
    if (!existsSync(file)) {
      console.warn(`skip ${id}: no subject file`);
      continue;
    }
    const before = JSON.parse(readFileSync(file, "utf8")) as Subject;
    let after = before;
    for (const applied of list) {
      const next = applyOverlay(after, { version: 1, updatedAt: now, changes: [applied] });
      if (next === after) continue; // already in the JSON
      after = next;
      const p = applied.change.prism;
      history.push(
        historyEntry({
          at: now,
          actor: { kind: "script", id: "syllabus-bake-overlay" },
          cause: `bake proposal ${applied.proposalId} (went live ${applied.appliedAt}, ${applied.supporters} students)`,
          target: p?.topic
            ? { kind: "topic", subject: id, chapter: p.chapter, topic: p.topic }
            : p?.chapter
              ? { kind: "chapter", subject: id, chapter: p.chapter }
              : { kind: "subject", subject: id },
          field: applied.change.type,
          oldValue: null,
          newValue: { change: applied.change, newIds: applied.newIds ?? null },
        }),
      );
      if (
        p?.topic &&
        (applied.change.type === "topic under wrong unit" || applied.change.type === "topic split")
      )
        staleKeys.push({ subject: id, topic: p.topic });
      console.log(`${write ? "apply" : "would apply"} ${applied.change.type} → ${id}`);
    }
    if (after !== before) {
      files++;
      if (write) writeFileSync(file, `${JSON.stringify(after, null, 2)}\n`);
    }
  }

  console.log(
    `${changes.length} live fixes, ${files} subject files ${write ? "written" : "to change"}.`,
  );
  if (write && history.length) {
    writeFileSync(HISTORY, readFileSync(HISTORY, "utf8") + formatHistory(history));
    const stale = StaleTopicsSchema.parse(JSON.parse(readFileSync(STALE, "utf8")));
    writeFileSync(STALE, `${JSON.stringify(markStale(stale, staleKeys, now), null, 2)}\n`);
    console.log(`${history.length} history entries, ${staleKeys.length} topics marked stale.`);
  }
}

void main();
