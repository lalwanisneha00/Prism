/*
 * Phone check of every page: screenshots at 360, 390 and 412 px in three themes, and a report of
 * any page wider than the screen (with the elements that stick out).
 *
 *   npm run dev -- -p 3211          (LLM_PROVIDER=fake)
 *   node scripts/mobile-sweep.mjs [baseUrl] [outDir]
 *
 * Saves <outDir>/<theme>/<width>/<page>.png (default samples/mobile, gitignored).
 * Optional: THEMES=new,index  WIDTHS=360  PAGES=start,my-notes  to narrow the run.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3211";
const outDir = process.argv[3] ?? "samples/mobile";
const LESSON =
  "/lesson?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law&level=first-encounter&duration=10";

export const PAGES = {
  home: "/",
  start: "/start",
  subjects: "/subjects",
  "subject-detail": "/subjects/pdeu-applied-physics",
  university: "/subjects/university",
  chapter:
    "/chapter?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topics=vector-potential,ohms-law,faradays-law&level=first-encounter&minutes=30",
  lesson: LESSON,
  "mock-tests": "/mock-test",
  library: "/library",
  flashcards: "/flashcards",
  map: "/map",
  "my-notes": "/my-notes",
  notes: "/notes",
  planner: "/planner",
  dashboard: "/dashboard",
  "my-subjects": "/my-subjects",
  "my-subjects-new": "/my-subjects/new",
  slides: "/slides",
  lab: "/lab/pdeu-applied-physics-laboratory-ece/experiment-4-to-study-the-magnetic-field-along-the-axis-of-a",
  themes: "/themes",
  account: "/account",
  "api-keys": "/settings/keys",
  accuracy: "/accuracy",
  privacy: "/privacy",
  "not-found": "/no-such-page",
};

/** Runs in the page once the app has made its database: a branch, notes and two past mocks. */
async function seed() {
  for (let i = 0; i < 50; i++) {
    const dbs = await indexedDB.databases();
    if (dbs.some((d) => d.name === "prism" && (d.version ?? 0) > 1)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open("prism");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const now = Date.now();
  const subject = "pdeu-introduction-to-computer-programming-i-laboratory-civil";
  const sync = { updatedAt: now, deleted: false };
  await new Promise((res, rej) => {
    const tx = db.transaction(["settings", "annotations", "mockResults"], "readwrite");
    tx.objectStore("settings").put({ id: "app", ...sync, branch: "ece", semester: 3 });
    for (let i = 0; i < 3; i++) {
      tx.objectStore("annotations").put({
        id: `seed-${i}`,
        ...sync,
        lessonId: `seed-lesson-${i}`,
        lessonVersion: "1",
        subject,
        chapter: "unit-1",
        topic: "variables-and-data-types-in-a-very-long-topic-name",
        level: "first-encounter",
        duration: 10,
        title: "Variables, data types and operators in C: a very long lesson title for testing",
        block: "section:intro",
        color: "important",
        anchor: { start: 0, end: 20, quote: "A variable is a named box", prefix: "", suffix: "" },
        comment: i === 0 ? "Remember: int is 4 bytes on most compilers, char is 1 byte." : "",
        createdAt: now - i * 1000,
      });
    }
    for (let i = 0; i < 2; i++) {
      tx.objectStore("mockResults").put({
        id: `seed-mock-${i}`,
        ...sync,
        subject,
        chapter: "multiple",
        level: "exam-prep",
        minutes: 90,
        title:
          "Introduction to Computer Programming -I Laboratory (For ME, CL, CH, BT): full syllabus",
        score: 42 - i * 7,
        total: 60,
        byTopic: [],
        at: now - i * 86_400_000,
        scope: {
          level: "subject",
          ids: [subject],
          label: "Whole subject, all five units and labs",
        },
      });
    }
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

const themes = (process.env.THEMES ?? "new,index,reading-room").split(",");
const widths = (process.env.WIDTHS ?? "360,390,412").split(",").map(Number);
const only = process.env.PAGES?.split(",");
const pages = Object.entries(PAGES).filter(([k]) => !only || only.includes(k));

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
const problems = [];
for (const theme of themes) {
  for (const width of widths) {
    const folder = path.join(outDir, theme === "new" ? "prism" : theme, String(width));
    mkdirSync(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width, height: 800 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await context.addInitScript((t) => localStorage.setItem("prism-look", t), theme);
    const page = await context.newPage();
    // Real-looking data first: long names are what stretch dropdowns and cards.
    await page.goto(base + "/", { waitUntil: "networkidle", timeout: 90_000 });
    await page.evaluate(seed);
    for (const [name, url] of pages) {
      try {
        await page.goto(base + url, { waitUntil: "networkidle", timeout: 90_000 });
        if (name === "lesson")
          await page.waitForSelector("[data-section-card]", { timeout: 60_000 }).catch(() => {});
        await page.waitForTimeout(600);
        const result = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const extra = document.documentElement.scrollWidth - vw;
          const wide = [];
          if (extra > 0) {
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.right <= vw + 0.5) continue;
              // Skip things inside a box that scrolls sideways on purpose.
              let p = el.parentElement;
              let clipped = false;
              while (p && p !== document.body) {
                const ox = getComputedStyle(p).overflowX;
                if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") {
                  clipped = true;
                  break;
                }
                p = p.parentElement;
              }
              if (clipped) continue;
              const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
              wide.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)}`);
            }
          }
          // Form controls must stay inside every box around them (a card, a filter row…).
          for (const el of document.querySelectorAll("select, input, textarea, button")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const cs = getComputedStyle(p);
              if (cs.overflowX !== "visible") break; // scrolls or clips on purpose
              if (cs.display.startsWith("inline")) continue;
              const pr = p.getBoundingClientRect();
              if (r.right > pr.right + 1) {
                const label = el.getAttribute("aria-label") ?? el.id ?? "";
                const cls = typeof p.className === "string" ? p.className.slice(0, 60) : "";
                wide.push(
                  `${el.tagName.toLowerCase()}[${label}] sticks out of ${p.tagName.toLowerCase()}.${cls} by ${Math.round(r.right - pr.right)}px`,
                );
                break;
              }
            }
          }
          return { extra: Math.max(extra, wide.length ? 1 : 0), wide: wide.slice(0, 6) };
        });
        if (result.extra > 0)
          problems.push(
            `${theme} ${width} ${name}: +${result.extra}px\n    ${result.wide.join("\n    ")}`,
          );
        await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: true });
      } catch (e) {
        problems.push(`${theme} ${width} ${name}: FAILED ${String(e).slice(0, 160)}`);
      }
    }
    await context.close();
  }
}
await browser.close();
console.log(
  problems.length
    ? `PAGES WIDER THAN THE SCREEN:\n${problems.join("\n")}`
    : "NO SIDEWAYS SCROLL ON ANY PAGE",
);
process.exitCode = problems.length ? 1 : 0;
