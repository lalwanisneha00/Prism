import { expect, test } from "@playwright/test";

// The highlight colours are added when highlights are drawn (they left globals.css because
// the build's CSS parser warned about ::highlight). A highlight must still be painted.
test("a highlight is painted and survives a reload", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("mobile"), "text selection is a desktop gesture here");
  await page.goto(
    "/lesson?subject=em&chapter=electrostatics&topic=gauss-law&level=first-encounter&duration=10",
  );
  const paragraph = page.locator("[data-section-card] .markdown p").first();
  await expect(paragraph).toBeVisible({ timeout: 60_000 });
  await paragraph.evaluate((p) => {
    p.scrollIntoView({ block: "center" });
    const text = p.firstChild;
    if (!text) return;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, Math.min(20, text.textContent?.length ?? 0));
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
  const popup = page.getByRole("toolbar", { name: "Highlight or ask about the selected text" });
  await popup.getByRole("button", { name: /^Highlight: Important/ }).click();

  const painted = () =>
    page.evaluate(() => ({
      style: Boolean(document.getElementById("prism-highlight-styles")),
      ranges: CSS.highlights?.get("prism-important")?.size ?? 0,
    }));
  await expect.poll(painted).toEqual({ style: true, ranges: 1 });
  await page.reload();
  await expect.poll(painted, { timeout: 60_000 }).toEqual({ style: true, ranges: 1 });
});
