/*
 * Screenshots of the main screens in every theme, for comparing them side by side.
 *
 *   npm run dev -- -p 3211        (with LLM_PROVIDER=fake in .env.local or the shell)
 *   node scripts/theme-screenshots.mjs [outDir] [baseUrl]
 *
 * Saves <outDir>/<theme>[-dark]/<page>.png (default outDir: samples/themes, which is gitignored).
 * The theme is set the same way the app stores it (localStorage), before the first paint.
 * Optional: THEMES=current,classic and MODES=light,dark to narrow the run.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const outDir = process.argv[2] ?? "samples/themes";
const base = process.argv[3] ?? "http://localhost:3211";

const ALL = [
  "current",
  "classic",
  "notebook",
  "reading-room",
  "drafting",
  "midnight",
  "index",
  "studio",
];
const BOTH_MODES = new Set(["current", "classic"]);
const themes = process.env.THEMES ? process.env.THEMES.split(",") : ALL;
const modes = process.env.MODES ? process.env.MODES.split(",") : ["light", "dark"];

const LESSON =
  "/lesson?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law&level=first-encounter&duration=10";
const pages = [
  { name: "dashboard", url: "/dashboard" },
  { name: "lesson", url: LESSON, wait: "[data-section-card], [data-lesson-block]", full: true },
  { name: "mock-tests", url: "/mock-test" },
  { name: "themes", url: "/themes" },
];
const viewports = [
  { suffix: "", width: 1280, height: 900, mobile: false },
  { suffix: "-375", width: 375, height: 812, mobile: true },
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
for (const theme of themes) {
  for (const mode of BOTH_MODES.has(theme) ? modes : ["light"]) {
    const folder = path.join(
      outDir,
      BOTH_MODES.has(theme) && mode === "dark" ? `${theme}-dark` : theme,
    );
    mkdirSync(folder, { recursive: true });
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        colorScheme: mode === "dark" ? "dark" : "light",
        reducedMotion: "reduce",
      });
      // The same keys the app writes ("new" is the stored name of the Current theme).
      const stored = theme === "current" ? "new" : theme;
      await context.addInitScript(
        ([look, m]) => {
          localStorage.setItem("prism-look", look);
          localStorage.setItem("prism-theme", m);
        },
        [stored, mode],
      );
      const page = await context.newPage();
      for (const p of pages) {
        try {
          await page.goto(base + p.url, { waitUntil: "networkidle", timeout: 90_000 });
          if (p.wait) await page.waitForSelector(p.wait, { timeout: 60_000 }).catch(() => {});
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(folder, `${p.name}${vp.suffix}.png`) });
          if (p.full && !vp.mobile) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1500);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({
              path: path.join(folder, `${p.name}-full.png`),
              fullPage: true,
            });
          }
          console.log("saved", folder, p.name + vp.suffix);
        } catch (e) {
          console.log("FAILED", theme, mode, p.name, String(e).slice(0, 200));
        }
      }
      await context.close();
    }
  }
}
await browser.close();
