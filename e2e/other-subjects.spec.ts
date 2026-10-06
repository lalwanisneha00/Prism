import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const fixture = (name: string) => path.join(__dirname, "..", "test-fixtures", name);

const SYLLABUS = `Unit 1: Vedic literature – The four Vedas, Upanishads
Unit 2: Indian mathematics – Zero and the decimal system, Aryabhata`;

async function createFromSyllabus(page: Page) {
  await page.goto("/my-subjects");
  await page
    .getByTestId("other-subjects")
    .getByRole("link", { name: "Indian Knowledge System" })
    .click();
  const form = page.getByTestId("custom-subject-form");
  await expect(form.getByLabel("Subject name")).toHaveValue("Indian Knowledge System");
  await form.getByLabel(/Type your topics/).fill(SYLLABUS);
  await form.getByRole("button", { name: "Check my outline" }).click();
  const editor = form.getByTestId("outline-editor");
  await expect(editor.getByLabel("Name of unit 1")).toHaveValue("Vedic literature");
  await expect(editor.getByLabel("Topic 2 of unit 2")).toHaveValue("Aryabhata");
  // Edit the outline: rename a topic.
  await editor.getByLabel("Topic 2 of unit 1").fill("The Upanishads");
  await form.getByText(/Exam details/).click();
  await form.getByLabel("Marks per question").fill("2, 5 and 10 marks");
  await form.getByRole("button", { name: "Save my subject" }).click();
  await expect(page).toHaveURL(/\/my-subjects\/view\?id=custom-/, { timeout: 30_000 });
}

test.describe("Other subjects (V3 · Step 4)", () => {
  test("set up from a suggestion and a pasted syllabus, then study it", async ({ page }) => {
    test.setTimeout(240_000);
    await createFromSyllabus(page);
    const view = page.getByTestId("custom-subject-view");
    await expect(view.getByRole("heading", { name: "Indian Knowledge System" })).toBeVisible();
    await expect(view.getByText("2, 5 and 10 marks")).toBeVisible();
    await expect(view.getByText(/Upload your slides or notes/)).toBeVisible();
    await expect(
      view.getByTestId("subject-chapters").getByRole("link", { name: "The Upanishads" }),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);

    // A lesson on one topic, through the normal picker.
    await view
      .getByTestId("subject-chapters")
      .getByRole("link", { name: "The Upanishads" })
      .click();
    await expect(page.getByRole("radio", { name: /Indian Knowledge System/ })).toBeChecked({
      timeout: 30_000,
    });
    await expect(page.getByRole("radio", { name: "The Upanishads" })).toBeChecked();
    await page.getByText("Exam Prep", { exact: true }).click();
    await page.getByRole("button", { name: /Build my lesson/ }).click();
    await expect(page).toHaveURL(/\/lesson\?subject=custom-/);
    await expect(page.getByText("In this lesson")).toBeVisible({ timeout: 90_000 });

    // A whole-unit lesson with the three time options.
    await page.goto("/");
    await page.getByTestId("all-subjects-list").locator("summary").click();
    await page
      .getByTestId("all-subjects-list")
      .getByRole("button", { name: /Indian Knowledge System/ })
      .click();
    await page.getByLabel("Or browse by chapter").selectOption("indian-mathematics");
    await page.getByRole("radio", { name: "Study the whole chapter" }).click();
    await page.getByText("Exam Prep", { exact: true }).click();
    await expect(page.getByTestId("time-options").getByRole("radio")).toHaveCount(3);
    await page.getByRole("button", { name: /Build my lesson/ }).click();
    await expect(page.getByTestId("plan-list").getByRole("listitem")).toHaveCount(2, {
      timeout: 30_000,
    });
    await page.getByRole("link", { name: /Start the lesson/ }).click();
    await expect(page.getByTestId("chapter-wrap")).toBeVisible({ timeout: 150_000 });
  });

  test("asks for topics, a syllabus or material instead of guessing", async ({ page }) => {
    await page.goto("/my-subjects/new");
    const form = page.getByTestId("custom-subject-form");
    await form.getByLabel("Subject name").fill("Professional Ethics");
    await form.getByRole("button", { name: "Save my subject" }).click();
    await expect(form.getByRole("alert")).toContainText(
      "Add your topics, paste your syllabus, or upload",
    );
  });

  test("builds an outline from uploaded material, labelled, and keeps the files", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/my-subjects/new?name=Environmental%20Science");
    const form = page.getByTestId("custom-subject-form");
    await form
      .getByTestId("custom-material-input")
      .setInputFiles(fixture("text-heavy-slides.pptx"));
    await expect(form.getByTestId("custom-material-list")).toContainText("text-heavy-slides.pptx");
    await form.getByRole("button", { name: "Save my subject" }).click();
    await expect(form.getByText("Outline built from your material").first()).toBeVisible({
      timeout: 30_000,
    });
    await form.getByRole("button", { name: "Save my subject" }).click();
    await expect(page).toHaveURL(/\/my-subjects\/view\?id=custom-/, { timeout: 30_000 });
    const view = page.getByTestId("custom-subject-view");
    await expect(view.getByText("Outline built from your material")).toBeVisible();
    await expect(view.getByText(/Upload your slides or notes/)).toHaveCount(0);
    await view.getByRole("link", { name: "My materials" }).click();
    await expect(page.getByTestId("materials-list")).toContainText("text-heavy-slides.pptx");
  });

  test("my subjects can be duplicated and deleted", async ({ page }) => {
    await createFromSyllabus(page);
    await page.goto("/my-subjects");
    const list = page.getByTestId("my-subjects-list");
    await list.getByRole("button", { name: "Duplicate" }).click();
    await expect(list.getByText("Indian Knowledge System (copy)")).toBeVisible();
    const copy = list.getByRole("listitem").filter({ hasText: "(copy)" });
    await copy.getByRole("button", { name: "Delete" }).click();
    await copy.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(list.getByText("(copy)")).toHaveCount(0);
    await expect(list.getByRole("listitem")).toHaveCount(1);
  });
});
