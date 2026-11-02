import { expect, test } from "@playwright/test";
import { seedStudyData } from "./helpers/seed";

/*
 * No page may scroll sideways on a phone, and no dropdown or text box may stick out of its box,
 * with real-looking data in place (long subject names are what used to stretch the dropdowns).
 * The full screenshot sweep in several themes is scripts/mobile-sweep.mjs.
 */

const PAGES = [
  "/",
  "/start",
  "/subjects",
  "/subjects/pdeu-applied-physics",
  "/mock-test",
  "/library",
  "/flashcards",
  "/map",
  "/my-notes",
  "/notes",
  "/planner",
  "/dashboard",
  "/my-subjects",
  "/themes",
  "/settings/keys",
];

for (const width of [360, 390, 412]) {
  test(`no sideways scroll and no control sticking out at ${width}px`, async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-light", "phone widths are set here");
    test.setTimeout(300_000); // 15 pages, each loaded fresh
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await seedStudyData(page);
    for (const url of PAGES) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > vw) {
          out.push(`page is ${document.documentElement.scrollWidth - vw}px too wide`);
        }
        for (const el of document.querySelectorAll("select, input, textarea")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflowX !== "visible") break;
            if (cs.display.startsWith("inline")) continue;
            if (r.right > p.getBoundingClientRect().right + 1) {
              out.push(
                `${el.tagName.toLowerCase()} ${el.getAttribute("aria-label") ?? ""} sticks out`,
              );
              break;
            }
          }
        }
        return out;
      });
      expect(problems, `${url} at ${width}px`).toEqual([]);
    }
  });
}
