/*
 * Copies the Phase 2 import items that need a person (handouts/_parsed/rearrange-plan.json,
 * `needsReview`) into a small file the admin page can load: src/data/syllabus/needs-review.json.
 * Each item gets a stable id (a hash of what it says), so "checked" marks survive a re-run.
 * Run: npm run syllabus:needs-review
 */
import { readFileSync, writeFileSync } from "node:fs";

const plan = JSON.parse(readFileSync("handouts/_parsed/rearrange-plan.json", "utf8"));

function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const seen = new Set();
const items = [];
for (const item of plan.needsReview ?? []) {
  const id = fnv([item.branch, item.sem, item.reason, item.detail].join("|"));
  if (seen.has(id)) continue;
  seen.add(id);
  items.push({
    id,
    branch: String(item.branch),
    sem: Number(item.sem),
    reason: String(item.reason ?? ""),
    detail: String(item.detail ?? ""),
  });
}

writeFileSync(
  "src/data/syllabus/needs-review.json",
  JSON.stringify({ version: 1, from: "handouts/_parsed/rearrange-plan.json", items }, null, 2) +
    "\n",
);
console.log(`needs-review.json: ${items.length} items`);
