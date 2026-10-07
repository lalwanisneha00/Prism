import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

async function choose(page: Page, branch: string, semester: string) {
  await page.goto("/subjects");
  const bar = page.getByTestId("branch-bar");
  // A choice made before the page has finished loading can be reset, so check it stuck.
  await expect(async () => {
    await bar.getByLabel("My branch").selectOption(branch);
    await bar.getByLabel("Semester").selectOption(semester);
    await expect(bar.getByLabel("Semester")).toHaveValue(semester, { timeout: 1500 });
    await page.waitForTimeout(300);
    await expect(bar.getByLabel("My branch")).toHaveValue(branch, { timeout: 1500 });
    await expect(bar.getByLabel("Semester")).toHaveValue(semester, { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}

test.describe("PDEU's own syllabus", () => {
  test("a Computer Engineering student sees core and non-core subjects by name only", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await expect(page.getByTestId("pdeu-semester")).toBeVisible();

    const core = page.getByTestId("pdeu-core");
    const physics = core.getByTestId("pdeu-course").filter({ hasText: "Applied Physics" }).first();
    await expect(physics.getByTestId("pdeu-on-prism")).toBeVisible();
    // Course codes, credits and hours are not shown, and labs and workshops are not listed.
    await expect(page.getByTestId("pdeu-semester")).not.toContainText("24PH101T");
    await expect(page.getByTestId("pdeu-semester")).not.toContainText(/credit/i);
    await expect(page.getByTestId("pdeu-semester")).not.toContainText(/laboratory|workshop/i);

    const nonCore = page.getByTestId("pdeu-noncore");
    await expect(nonCore).toContainText("Universal Human Values");
    await expect(nonCore).toContainText("Environment Science");
    await expect(core).not.toContainText("Environment Science");
    // Humanities are not core; physics is not listed as non-core.
    await expect(nonCore).not.toContainText("Applied Physics");
    await expectNoSidewaysScroll(page);
  });

  test("a subject page shows PDEU's units and topics, and can become a studyable subject", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await page
      .getByTestId("pdeu-core")
      .getByRole("link", { name: "Applied Physics", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Applied Physics", level: 1 })).toBeVisible();
    await expect(page.getByTestId("pdeu-details")).toContainText("24PH101T");
    await expect(page.getByTestId("pdeu-details")).toContainText("Credits");
    const units = page.getByTestId("pdeu-units");
    await expect(units).toContainText("Unit 1: Electricity and Magnetism");
    await expect(units).toContainText("12 hrs");
    await expect(units).toContainText("Poynting Vector");
    await expect(page.getByTestId("pdeu-prism-lessons")).toContainText("Prism teaches");
    await expectNoSidewaysScroll(page);

    await page.getByRole("button", { name: "Study this syllabus on Prism" }).click();
    await expect(page).toHaveURL(/\/my-subjects\/view\?id=custom-/);
    await expect(page.getByText("Electricity and Magnetism").first()).toBeVisible();
  });

  test("a non-core subject lists its units and offers the faculty-material upload", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await page
      .getByTestId("pdeu-noncore")
      .getByRole("link", { name: "Universal Human Values", exact: true })
      .click();
    await expect(page.getByTestId("pdeu-details")).toContainText("Non-core subject");
    await expect(page.getByTestId("pdeu-units")).toContainText("Human Values and Process");
    await expect(page.getByTestId("pdeu-prism-lessons")).toHaveCount(0);
    await page
      .getByTestId("pdeu-material")
      .getByRole("button", { name: /Upload faculty material/ })
      .click();
    await expect(page).toHaveURL(/\/my-subjects\/edit\?id=custom-/);
  });

  test("a subject the handbook gives no syllabus for says so instead of inventing one", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await page
      .getByTestId("pdeu-noncore")
      .getByRole("link", { name: "Indian Knowledge System", exact: true })
      .click();
    await expect(page.getByRole("note")).toContainText("does not print its detailed syllabus");
    await expect(page.getByTestId("pdeu-units")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Add this subject and upload faculty material/ }),
    ).toBeVisible();
  });

  test("an elective slot lists its options", async ({ page }) => {
    await choose(page, "ce", "5");
    await page
      .getByTestId("pdeu-core")
      .getByRole("link", { name: "Program Elective 1", exact: true })
      .click();
    const options = page.getByTestId("pdeu-options");
    await expect(options).toContainText("Data Mining and Data Warehousing");
    await options.getByRole("link", { name: /Data Mining/ }).click();
    await expect(page.getByTestId("pdeu-details")).toContainText("24CS331T");
    await expect(page.getByTestId("pdeu-units")).toContainText("Association Analysis");
  });

  test("other PDEU branches work, and a branch PDEU's file lacks keeps the usual list", async ({
    page,
  }) => {
    await choose(page, "civil", "3");
    await expect(page.getByTestId("pdeu-core").getByTestId("pdeu-course").first()).toBeVisible();
    await choose(page, "ee", "3");
    await expect(page.getByTestId("pdeu-semester")).toHaveCount(0);
    await expect(page.getByTestId("subject-card").first()).toContainText("Suggested");
  });
});
