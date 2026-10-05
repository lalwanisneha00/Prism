import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("My university syllabus", () => {
  test("read, review, apply: subjects by semester, hidden chapters, own subjects, undo", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const text = await readFile(
      path.join(__dirname, "..", "test-fixtures", "university-syllabus-sample.txt"),
      "utf8",
    );
    await page.goto("/subjects/university");
    await page.getByLabel("University and branch (optional)").fill("Test University, Mechanical");
    await page.getByLabel("Or paste it here").fill(text);
    await page.getByRole("button", { name: "Read my syllabus" }).click();

    const rows = page.getByTestId("uni-row");
    await expect(rows).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "Semester 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Semester 2" })).toBeVisible();
    await expect(
      rows.filter({ hasText: "Applied Physics" }).getByText(/of \d+ chapters/),
    ).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.getByRole("button", { name: "Apply my syllabus" }).click();
    await expect(page.getByTestId("uni-done")).toContainText(
      "now show only what your university teaches",
    );
    await expect(page.getByTestId("uni-applied")).toContainText("Test University");

    // Subjects by semester, plus a subject of the student's own for what Prism doesn't teach.
    await page.goto("/subjects");
    const panel = page.getByTestId("semester-subjects");
    await panel.getByLabel("My semester").selectOption("2");
    await expect(page.getByTestId("semester-picks")).toContainText("Indian Knowledge System");
    await expect(page.getByTestId("semester-picks")).toContainText("Engineering Mechanics");

    // A subject shows only the chapters the university teaches, with a way back.
    await page.goto("/subjects/applied-physics");
    await expect(page.getByTestId("scope-notice")).toContainText("Test University");
    await expect(page.getByTestId("scope-notice")).toContainText("topic");
    await page.getByTestId("scope-notice").getByRole("button", { name: "Show everything" }).click();
    await expect(page.getByTestId("scope-notice")).toHaveCount(0);
  });

  test("a syllabus with no subjects in it says so", async ({ page }) => {
    await page.goto("/subjects/university");
    await page.getByLabel("Or paste it here").fill("Hello there. This is not a syllabus at all.");
    await page.getByRole("button", { name: "Read my syllabus" }).click();
    await expect(page.getByTestId("uni-error")).toContainText("couldn't find subjects");
  });

  test("the AI option reads messy text (test AI)", async ({ page }) => {
    await page.goto("/subjects/university");
    await page
      .getByLabel("Or paste it here")
      .fill(
        "A messy two-column table that the plain reader cannot follow, with enough words in it.",
      );
    await page.getByRole("button", { name: "Read it with AI" }).click();
    await expect(page.getByTestId("uni-row")).toHaveCount(1);
  });
});
