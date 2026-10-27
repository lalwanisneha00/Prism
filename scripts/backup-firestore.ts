// Free Firestore backup (syllabus fix, Phase 1). The managed export needs the paid Blaze plan, so
// this reads the shared collections with the Admin SDK and writes them to one local JSON file:
//
//   npm run backup:firestore            → backups/firestore-<time>.json (git-ignored)
//
// Shared collections only (the lesson library, and the syllabus-fix collections once they exist).
// Students' own data lives on their devices and under users/{uid}; it has its own in-app backup.
// Each document read counts towards the free 50,000 reads a day, so run it before big changes,
// not on a timer. Needs FIREBASE_ADMIN_* in .env.local.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { adminFromEnv } from "@/lib/firebase/adminCore";

const COLLECTIONS = [
  "lessons",
  "syllabusHistory",
  "syllabusFlags",
  "lessonFlags",
  "syllabusProposals",
  "syllabusOverlay",
  "syllabusHandouts",
  "lessonStatus",
  "lessonVersions",
  "lessonQuality",
];

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const admin = adminFromEnv(process.env);
if (!admin) {
  console.error("FIREBASE_ADMIN_PROJECT_ID, _CLIENT_EMAIL and _PRIVATE_KEY are not set.");
  process.exit(1);
}

/** Firestore values that JSON can't hold (bytes, timestamps) as tagged plain values. */
function plain(value: unknown): unknown {
  if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    const v = value as { toDate?: () => Date };
    if (typeof v.toDate === "function") return { $time: v.toDate().toISOString() };
    return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, plain(x)]));
  }
  return value;
}

const dump: Record<string, Record<string, unknown>> = {};
let reads = 0;
for (const name of COLLECTIONS) {
  const snap = await admin.db.collection(name).get();
  dump[name] = Object.fromEntries(snap.docs.map((d) => [d.id, plain(d.data())]));
  reads += snap.size;
  console.log(`${name}: ${snap.size} document(s)`);
}

mkdirSync("backups", { recursive: true });
const file = `backups/firestore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), collections: dump }, null, 1));
console.log(`Saved ${file} (${reads} reads).`);
