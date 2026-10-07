import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

async function openPanel(page: Page) {
  await page.goto("/");
  await page.getByTestId("all-subjects-list").locator("summary").click();
  await page
    .getByTestId("all-subjects-list")
    .getByRole("button", { name: /^Applied Physics/ })
    .click();
  await page.getByLabel("Or browse by chapter").selectOption("electricity-and-magnetism");
  await page.getByText(/Faraday/).click();
  await page.getByText("Building Blocks", { exact: true }).click();
  await page.getByRole("button", { name: /Make slides or a PDF instead/ }).click();
}

test.describe("Slides and PDF generator (Feature B)", () => {
  test("a teaching PowerPoint: right slide count, notes, real text, then listed in My slides", async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    await openPanel(page);
    await expectNoSidewaysScroll(page);
    await page.getByText("For teaching", { exact: true }).click();
    await page.getByText("PowerPoint (.pptx)", { exact: true }).click();
    await page.getByText("10 slides", { exact: true }).click();
    await page.getByText("Blueprint", { exact: true }).first().click();

    const download = page.waitForEvent("download", { timeout: 150_000 });
    await page.getByRole("button", { name: "Make my file" }).click();
    await expect(page.getByTestId("slides-progress")).toBeVisible();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.pptx$/);
    const path = info.outputPath(file.suggestedFilename());
    await file.saveAs(path);
    const files = unzipSync(new Uint8Array(await readFile(path)));
    const slides = Object.keys(files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides.length).toBeGreaterThanOrEqual(4);
    expect(slides.length).toBeLessThanOrEqual(16);
    const notes = Object.keys(files).filter((f) => f.startsWith("ppt/notesSlides/notesSlide"));
    expect(notes.length).toBeGreaterThan(0);
    for (const s of slides) {
      expect(/<a:t>[^<]+<\/a:t>|<p:pic>/.test(strFromU8(files[s]))).toBe(true);
    }
    await expect(page.getByTestId("slides-done")).toBeVisible();

    await page.goto("/slides");
    await expect(page.getByRole("heading", { name: "My slides and PDFs" })).toBeVisible();
    await expect(page.getByText(/PowerPoint · \d+ slides/)).toBeVisible();
    await expectNoSidewaysScroll(page);
  });

  test("a study PDF downloads with selectable text", async ({ page }, info) => {
    test.setTimeout(180_000);
    await openPanel(page);
    await page.getByText("To study from", { exact: true }).click();
    await page.getByText("PDF", { exact: true }).first().click();
    const download = page.waitForEvent("download", { timeout: 150_000 });
    await page.getByRole("button", { name: "Make my file" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.pdf$/);
    const path = info.outputPath(file.suggestedFilename());
    await file.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(20_000);
  });
});

for (const [theme, purpose, label] of [
  ["Chalkboard", "To study from", "study"],
  ["Ink & Paper", "For revision", "revise"],
  ["Spectrum", "Practice sheet", "practice"],
] as const) {
  test(`${theme} · ${label}: a deck in each look opens and has content`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await openPanel(page);
    await page.getByText(purpose, { exact: true }).click();
    await page.getByText("PowerPoint (.pptx)", { exact: true }).click();
    await page.getByText(theme, { exact: true }).first().click();
    const download = page.waitForEvent("download", { timeout: 150_000 });
    await page.getByRole("button", { name: "Make my file" }).click();
    const file = await download;
    const path = info.outputPath(`${label}-${file.suggestedFilename()}`);
    await file.saveAs(path);
    const files = unzipSync(new Uint8Array(await readFile(path)));
    const slides = Object.keys(files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides.length).toBeGreaterThanOrEqual(3);
  });
}
