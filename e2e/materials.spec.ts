import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = (name: string) => path.join(__dirname, "..", "test-fixtures", name);

test.describe("My materials (V2.5 · Step 2)", () => {
  test("uploads several formats at once, explains failures, re-tags and previews", async ({
    page,
  }) => {
    await page.goto("/notes?subject=pdeu-applied-physics");
    await expect(page.getByRole("heading", { name: "My materials" })).toBeVisible();

    await page
      .getByTestId("materials-input")
      .setInputFiles([
        fixture("text-heavy-slides.pptx"),
        fixture("notes-with-tables.docx"),
        fixture("old-format-slides.ppt"),
        fixture("question-bank.csv"),
      ]);
    const status = page.getByTestId("upload-status");
    await expect(status.getByText(/6 slides · saved as Slides/)).toBeVisible();
    await expect(status.getByText(/4 sections · saved as Notes/)).toBeVisible();
    await expect(status.getByText(/old-style PowerPoint file/)).toBeVisible();
    await expect(status.getByText(/1 part · saved as/)).toBeVisible();

    const list = page.getByTestId("materials-list");
    await expect(list.getByRole("listitem")).toHaveCount(3);
    const slides = list.getByRole("listitem").filter({ hasText: "text-heavy-slides.pptx" });
    // Tagged with the chosen subject and the chapter it is about.
    await expect(slides.getByLabel("Subject", { exact: true })).toHaveValue("pdeu-applied-physics");
    await expect(slides.getByLabel("Chapter", { exact: true })).toHaveValue(
      "electricity-and-magnetism",
    );

    // Re-tag: the change survives a reload.
    await slides.getByLabel("Type", { exact: true }).selectOption("pyq");
    await page.reload();
    const again = page
      .getByTestId("materials-list")
      .getByRole("listitem")
      .filter({ hasText: "text-heavy-slides.pptx" });
    await expect(again.getByLabel("Type", { exact: true })).toHaveValue("pyq");

    // Preview: open a slide, leave it out of lessons.
    await again.getByRole("button", { name: "Preview" }).click();
    const preview = again.getByTestId("material-preview");
    await preview.getByText("slide 4", { exact: true }).click();
    await expect(preview.getByText(/only enclosed charge counts/)).toBeVisible();
    await preview
      .getByRole("listitem")
      .filter({ hasText: "slide 4" })
      .getByLabel("Use this part in lessons")
      .uncheck();
    await expect(again.getByText(/1 left out/)).toBeVisible();

    // Other subjects' filter hides it; "All subjects" shows it.
    await page.getByTestId("materials-subject-filter").locator("summary").click();
    await page
      .getByTestId("materials-subject-filter")
      .getByRole("button", { name: /Mathematics - I/ })
      .first()
      .click();
    await expect(page.getByText("No materials for this subject yet.")).toBeVisible();
  });

  test("reads a picture-only slide with the AI (test AI, no quota)", async ({ page }) => {
    await page.goto("/notes");
    await page.getByTestId("materials-input").setInputFiles(fixture("picture-heavy-slides.pptx"));
    await expect(page.getByText(/3 with content in pictures/)).toBeVisible();
    const card = page.getByTestId("materials-list").getByRole("listitem").first();
    await card.getByRole("button", { name: "Preview" }).click();
    const preview = card.getByTestId("material-preview");
    await expect(
      preview.getByText("3 parts have content in pictures.", { exact: false }),
    ).toBeVisible();
    await preview.getByText("slide 2", { exact: true }).click();
    await preview.getByRole("button", { name: "Read with AI (uses AI quota)" }).first().click();
    await expect(preview.getByText(/read by the test AI/)).toBeVisible();
    await expect(preview.getByText("Read by AI")).toBeVisible();
  });
});

test("reads text from a photo on this device (OCR)", async ({ page }, info) => {
  // OCR downloads its language data once and takes a while: one run is enough.
  test.skip(info.project.name !== "desktop-light", "OCR runs once, on desktop-light");
  test.setTimeout(240_000);
  await page.goto("/notes");
  await page.getByTestId("materials-input").setInputFiles(fixture("photo-of-board-notes.png"));
  await expect(
    page.getByText(/1 image · saved as Notes · 1 with content in pictures/),
  ).toBeVisible();
  const card = page.getByTestId("materials-list").getByRole("listitem").first();
  await card.getByRole("button", { name: "Preview" }).click();
  await card.getByRole("button", { name: "Read text from images" }).click();
  await expect(card.getByText("Read from picture")).toBeVisible({ timeout: 200_000 });
  await card.getByText("image", { exact: true }).click();
  await expect(card.getByText(/surface with symmetry/i)).toBeVisible();
});

test("a lesson that uses my materials cites them by slide", async ({ page }) => {
  await page.goto("/notes?subject=pdeu-applied-physics");
  await page.getByTestId("materials-input").setInputFiles(fixture("text-heavy-slides.pptx"));
  await expect(page.getByText(/6 slides · saved as Slides/)).toBeVisible();
  await page.goto(
    "/lesson?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law&level=first-encounter&duration=10&notes=1",
  );
  await expect(page.getByText(/text-heavy-slides\.pptx, slide \d+/).first()).toBeVisible({
    timeout: 60_000,
  });
});

test("the Uploads page does not scroll sideways on a phone", async ({ page }) => {
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/notes");
    await expect(page.getByTestId("materials-input")).toBeAttached();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `at ${width}px`).toBeLessThanOrEqual(0);
  }
});
