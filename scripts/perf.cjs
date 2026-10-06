/* eslint-disable @typescript-eslint/no-require-imports */
/*
 * Measures the production build the way a mid-range phone would see it: a 375px screen, a 4x slower
 * CPU and a "slow 4G" network. For each page: JavaScript downloaded, time until the page has real
 * content, and the main thread's blocked time. Then the clicks that matter: time from the click to
 * the next screen showing something.
 *
 *   LLM_PROVIDER=fake npx next build
 *   node scripts/perf.cjs perf-result.json
 */
const { chromium } = require("@playwright/test");
const { spawn } = require("node:child_process");
const fs = require("node:fs");

const PORT = 3212;
const BASE = `http://localhost:${PORT}`;
const out = process.argv[2] ?? "perf-result.json";
const CPU = Number(process.env.PERF_CPU ?? 4);

const pages = [
  ["home", "/"],
  ["subjects", "/subjects"],
  ["subject page", "/subjects/em"],
  ["concept map", "/map?subject=em"],
  ["lesson (sample)", "/lesson?subject=em&chapter=electrostatics&topic=gauss-law&level=first-encounter&duration=10"],
  ["dashboard", "/dashboard"],
  ["planner", "/planner"],
  ["library", "/library"],
  ["accuracy", "/accuracy"],
  ["uploads", "/notes"],
];

async function setup(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (0.75 * 1024 * 1024) / 8,
  });
  const stats = { js: 0, all: 0 };
  const urls = new Map();
  cdp.on("Network.responseReceived", (e) => urls.set(e.requestId, e.response.url));
  cdp.on("Network.loadingFinished", (e) => {
    const url = urls.get(e.requestId) ?? "";
    stats.all += e.encodedDataLength;
    if (/\.js(\?|$)/.test(url)) stats.js += e.encodedDataLength;
  });
  return { ctx, page, stats };
}

/** Waits until the page's <main> has real text (not just a skeleton) and returns the elapsed ms. */
async function contentReady(page, t0) {
  await page.waitForFunction(
    () => {
      const m = document.querySelector("main");
      return Boolean(m && (m.textContent ?? "").trim().length > 80 && !m.querySelector('[aria-busy="true"]'));
    },
    null,
    { timeout: 60000 },
  );
  return Date.now() - t0;
}

(async () => {
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    shell: true,
    env: { ...process.env, LLM_PROVIDER: "fake" },
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 9000));
  const browser = await chromium.launch({ channel: "msedge" });
  const result = { cpuSlowdown: CPU, network: "slow 4G (1.6 Mbps, 150 ms)", viewport: "375x812", pages: [], clicks: [] };

  for (const [name, url] of pages) {
    const { ctx, page, stats } = await setup(browser);
    await page.addInitScript(() => {
      window.__blocked = 0;
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__blocked += Math.max(0, e.duration - 50);
        }).observe({ type: "longtask", buffered: true });
      } catch {}
    });
    const t0 = Date.now();
    await page.goto(BASE + url, { waitUntil: "commit", timeout: 90000 });
    const ready = await contentReady(page, t0).catch(() => -1);
    await page.waitForTimeout(1500);
    const blocked = await page.evaluate(() => Math.round(window.__blocked));
    result.pages.push({ name, url, jsKB: Math.round(stats.js / 1024), totalKB: Math.round(stats.all / 1024), contentMs: ready, blockedMs: blocked });
    console.log(name, "js", Math.round(stats.js / 1024), "KB; content", ready, "ms; blocked", blocked, "ms");
    await ctx.close();
  }

  // Clicks, on a warm session (the first visit has loaded the app once).
  const { ctx, page } = await setup(browser);
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(2500);
  const clicks = [
    ["home → Subjects (nav)", async () => page.getByRole("link", { name: /Subjects/ }).first().click(), () => page.getByRole("heading", { name: "Subjects", exact: true }).waitFor()],
    ["Subjects → a subject page", async () => page.locator('a[href^="/subjects/"]').nth(2).click(), () => page.locator("h1").first().waitFor()],
    ["→ Dashboard (nav)", async () => page.getByRole("link", { name: /Dashboard/ }).first().click(), () => page.getByRole("heading", { name: /study dashboard/i }).waitFor()],
    ["→ Library (nav)", async () => page.getByRole("link", { name: /Library/ }).first().click(), () => page.getByRole("heading", { name: /library/i }).first().waitFor()],
    ["→ Concept map", async () => page.goto(BASE + "/map?subject=em", { waitUntil: "commit" }), () => page.locator("[data-node]").first().waitFor({ timeout: 60000 })],
  ];
  for (const [name, act, done] of clicks) {
    const t = Date.now();
    await act();
    // Instant feedback: how long until anything on screen changed after the click.
    await done();
    const ms = Date.now() - t;
    result.clicks.push({ name, ms });
    console.log("click:", name, ms, "ms");
    await page.waitForTimeout(800);
  }
  await ctx.close();
  await browser.close();
  spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
})();
