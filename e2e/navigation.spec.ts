import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Navigation for many subjects (V3 · Step 3)", () => {
  test("search any topic → the picker opens with it chosen", async ({ page }) => {
    await page.goto("/");
    const search = page.getByTestId("global-search");
    await search.getByLabel("Search any subject, chapter or topic").fill("faraday");
    // Several courses teach Faraday's law; pick Applied Physics by name, not by rank.
    // Its main copy is pdeu-physics-ict since the first-year merge (migration 005).
    await search
      .getByRole("option")
      .filter({ hasText: /Applied Physics ›/ })
      .first()
      .click();
    await expect(page).toHaveURL(/subject=pdeu-physics-ict/);
    await expect(page.getByRole("radio", { name: /^Applied Physics/ })).toBeChecked();
    await expect(page.getByLabel("Or browse by chapter")).not.toHaveValue("");
    await expect(page.getByRole("radio", { name: /Faraday/ })).toBeChecked();
  });

  test("my branch and semester is saved and shapes the subject list", async ({ page }) => {
    await page.goto("/subjects");
    const bar = page.getByTestId("branch-bar");
    await expect(async () => {
      await bar.getByLabel("My branch").selectOption("ce");
      await bar.getByLabel("Semester").selectOption("1");
      await expect(bar.getByLabel("Semester")).toHaveValue("1", { timeout: 1500 });
      await page.waitForTimeout(300);
      await expect(bar.getByLabel("My branch")).toHaveValue("ce", { timeout: 1500 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByTestId("pdeu-core")).toContainText("Applied Physics");
    await expect(page.getByTestId("pdeu-noncore")).toContainText("Universal Human Values");
    await expectNoSidewaysScroll(page);

    // Saved: the home page picker remembers it.
    await page.goto("/");
    await expect(page.getByTestId("branch-bar").getByLabel("My branch")).toHaveValue("ce");
    // Only the chosen subject shows on top; every subject is in the collapsed list.
    await expect(page.getByTestId("subject-chips").getByRole("radio")).toHaveCount(1);
    await page.getByTestId("all-subjects-list").locator("summary").click();
    await expect(page.getByTestId("all-subjects-list").getByRole("button").first()).toBeVisible();
  });

  test("a subject page shows PDEU's details, its units and leads into lessons", async ({
    page,
  }) => {
    await page.goto("/subjects/pdeu-applied-physics");
    await expect(page.getByRole("heading", { name: "Applied Physics", level: 1 })).toBeVisible();
    await expect(page.getByText(/Syllabus source:/)).toBeVisible();
    const chapters = page.getByTestId("subject-chapters");
    await expect(chapters.getByRole("listitem").first()).toContainText("Electricity and Magnetism");
    await chapters.getByRole("link", { name: /Faraday/ }).click();
    await expect(page).toHaveURL(/topic=faradays-law/);
    await expect(page.getByRole("radio", { name: /Faraday/ })).toBeChecked();
    await expectNoSidewaysScroll(page);
  });

  test("an unknown subject page is a 404", async ({ page }) => {
    const res = await page.goto("/subjects/underwater-basket-weaving");
    expect(res?.status()).toBe(404);
  });

  test("Mock Tests: in the menu, any topic can be picked, the paper is taken and marked", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    // Let the home page finish loading, so the click isn't caught by a half-loaded page.
    await page.waitForLoadState("networkidle");
    await page.getByTestId("nav-mock-tests").first().click();
    await expect(page).toHaveURL(/\/mock-test/);
    await expect(page.getByTestId("pattern-banner")).toBeVisible({ timeout: 30_000 });

    // Opened from a subject page: that subject is chosen. Nothing studied yet is fine.
    await page.goto("/mock-test?subject=pdeu-physics-ict");
    await page.getByRole("radio", { name: /Topics/ }).click();
    const tree = page.getByTestId("scope-tree");
    await tree.getByRole("checkbox").nth(1).check();
    await expect(page.getByTestId("not-studied")).toBeVisible();
    await page
      .getByTestId("mock-wizard")
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await page
      .getByRole("radiogroup", { name: "Total marks" })
      .getByRole("radio", { name: "20" })
      .click();
    await expect(page.getByTestId("pattern-note")).toContainText(
      "standard Indian university pattern",
    );
    await page
      .getByTestId("mock-wizard")
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await page.getByRole("button", { name: "Generate my paper" }).click();
    // Paper mode: a printed-style paper, no answer boxes; the answer sheet only after Finish.
    await expect(page.getByTestId("mock-paper")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("mock-paper")).toContainText("Max. Marks: 20");
    await expect(page.getByTestId("answer-sheet")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await page.getByRole("button", { name: "Start timer" }).click();
    await expect(page.getByTestId("mock-timer")).toContainText(/\d\d:\d\d left/);
    await page.getByRole("button", { name: "Pause timer" }).click();
    await expect(page.getByTestId("mock-timer")).toContainText("paused");
    await page.getByRole("button", { name: "Finish mock test" }).first().click();
    await expect(page.getByTestId("answer-sheet")).toBeVisible();
    await expect(page.getByTestId("answer-sheet")).toContainText("Marking scheme");
    const score = page.getByTestId("self-score");
    await score.getByRole("textbox").fill("25");
    await score.getByRole("button", { name: "Save my score" }).click();
    await expect(score.getByRole("alert")).toContainText("out of 20");
    await score.getByRole("textbox").fill("12.5");
    await score.getByRole("button", { name: "Save my score" }).click();
    await expect(score).toContainText("✓ Saved: 12.5 / 20");
    await page.getByRole("button", { name: "Done" }).click();
    const past = page.getByTestId("past-mocks");
    await expect(past).toContainText("Physics");
    await expect(past).toContainText("12.5/20");
    await past.getByRole("button", { name: "View answer sheet" }).first().click();
    await expect(page.getByTestId("answer-sheet")).toBeVisible();
  });
});
