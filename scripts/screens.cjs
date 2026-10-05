/* eslint-disable @typescript-eslint/no-require-imports */
// Captures the main screens (desktop light/dark, phone light) for before/after comparison.
const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const out = process.argv[2];
const pages = [
  ["home", "/"],
  ["lesson", "/lesson?subject=em&chapter=electrostatics&topic=gauss-law&level=first-encounter&duration=10"],
  ["dashboard", "/dashboard"],
  ["subjects", "/subjects"],
  ["subject", "/subjects/em"],
  ["planner", "/planner"],
  ["library", "/library"],
  ["map", "/map?subject=em"],
  ["flashcards", "/flashcards"],
  ["mock-test", "/mock-test"],
  ["accuracy", "/accuracy"],
  ["notes", "/notes"],
];
const modes = [
  ["desktop-light", { viewport: { width: 1280, height: 800 }, colorScheme: "light" }],
  ["desktop-dark", { viewport: { width: 1280, height: 800 }, colorScheme: "dark" }],
  ["phone-light", { viewport: { width: 375, height: 812 }, colorScheme: "light", isMobile: true }],
];
(async () => {
  const server = spawn("npx", ["next", "start", "-p", "3211"], { shell: true, env: { ...process.env, LLM_PROVIDER: "fake" }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 9000));
  const browser = await chromium.launch({ channel: "msedge" });
  for (const [mode, opts] of modes) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    for (const [name, url] of pages) {
      try {
        await page.goto(`http://localhost:3211${url}`, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${out}/${name}-${mode}.jpg`, type: "jpeg", quality: 60, fullPage: false });
      } catch (e) { console.log("skip", name, mode, String(e).slice(0, 80)); }
    }
    await ctx.close();
  }
  await browser.close();
  spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
})();
