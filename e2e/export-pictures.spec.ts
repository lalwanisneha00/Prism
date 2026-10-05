import { expect, test } from "@playwright/test";

test.describe("Pictures for slides and PDFs", () => {
  test.beforeEach(({ page }) => {
    page.on("console", (m) => {
      if (m.text().includes("[slides]")) console.log("BROWSER:", m.text());
    });
  });

  test("formulas, diagrams, widgets and plots are drawn, and none is blank", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/dev/export");
    await page.getByRole("button", { name: "Draw pictures" }).click();
    await expect(page.getByRole("button", { name: "Draw pictures" })).toBeVisible({
      timeout: 90_000,
    });
    const results = page.getByTestId("export-results");
    await results.screenshot({
      path: `test-results/export-pictures-${test.info().project.name}.png`,
    });
    console.log("FAILED:", await page.getByTestId("failed").allTextContents());
    await expect(results.locator("img")).toHaveCount(4, { timeout: 90_000 });
    await expect(page.getByTestId("failed")).toHaveCount(0);
    await results.screenshot({
      path: `test-results/export-pictures-${test.info().project.name}.png`,
    });
    // A picture that is one flat colour is a failed picture: check each has real ink in it.
    const ink = await results.locator("img").evaluateAll(async (imgs) =>
      Promise.all(
        (imgs as HTMLImageElement[]).map(async (img) => {
          await img.decode();
          const c = document.createElement("canvas");
          c.width = Math.min(img.naturalWidth, 400);
          c.height = Math.min(img.naturalHeight, 300);
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          let dark = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 600) dark++;
          return { alt: img.alt, dark, w: img.naturalWidth, h: img.naturalHeight };
        }),
      ),
    );
    for (const i of ink) {
      expect(i.dark, `${i.alt} looks blank`).toBeGreaterThan(40);
      expect(i.w).toBeGreaterThan(100);
    }
  });
});
