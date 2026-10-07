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

test.describe("PDEU's syllabus: My subjects", () => {
  test("a Computer Engineering student sees every subject of the semester, core and non-core", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await expect(page.getByTestId("pdeu-semester")).toBeVisible();
    const core = page.getByTestId("pdeu-core");
    const nonCore = page.getByTestId("pdeu-noncore");
    for (const name of [
      "Mathematics - I",
      "Applied Physics",
      "Engineering Graphics",
      "Computer Programming - I",
    ]) {
      await expect(core).toContainText(name);
    }
    // EVS and the humanities are non-core; Workshop Practices was removed, labs are not listed.
    for (const name of [
      "Environment Science",
      "English Communication",
      "Universal Human Values",
      "Indian Knowledge System",
    ]) {
      await expect(nonCore).toContainText(name);
    }
    await expect(core).not.toContainText("Environment Science");
    await expect(page.getByTestId("pdeu-semester")).not.toContainText(/workshop|laborator/i);
    // Names only: no course codes or credits.
    await expect(page.getByTestId("pdeu-semester")).not.toContainText(/24PH101T|credit/i);
    // No manual adding for a PDEU student.
    await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(0);
    await expectNoSidewaysScroll(page);
  });

  test("a core subject opens with PDEU's units and topics, and its concept map follows the units", async ({
    page,
  }) => {
    await choose(page, "ce", "1");
    await page
      .getByTestId("pdeu-core")
      .getByRole("link", { name: "Applied Physics", exact: true })
      .click();
    await expect(page).toHaveURL(/\/subjects\/pdeu-applied-physics$/);
    const chapters = page.getByTestId("subject-chapters");
    for (const unit of [
      "Electricity and Magnetism",
      "Electromagnetic Waves",
      "Physics of Solids",
      "Optics",
    ]) {
      await expect(chapters).toContainText(unit);
    }
    await expect(page.getByText(/credit/i)).toHaveCount(0);
    await expectNoSidewaysScroll(page);
    await page.goto("/map?subject=pdeu-applied-physics");
    await expect(page.getByTestId("subject-graph")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("subject-graph")).toContainText("Electricity and Magnetism");
  });

  test("a non-core subject shows its skeleton and the upload message", async ({ page }) => {
    await choose(page, "ce", "1");
    const card = page
      .getByTestId("pdeu-noncore")
      .getByTestId("pdeu-course")
      .filter({ hasText: "Universal Human Values" });
    await expect(card.getByTestId("upload-material-note")).toContainText(
      "Upload material given by faculty to generate lessons for this subject.",
    );
    await card.getByRole("link", { name: "Universal Human Values", exact: true }).click();
    await expect(page).toHaveURL(/\/subjects\/pdeu-universal-human-values/);
    await expect(page.getByTestId("upload-material-note")).toContainText(
      "Upload material given by faculty to generate lessons for this subject.",
    );
    await expect(page.getByTestId("subject-chapters")).toContainText("Human Values and Process");
    await expect(page.getByRole("link", { name: "Upload material" })).toBeVisible();
  });

  test("the lesson picker shows the upload message for a non-core subject instead of a lesson button", async ({
    page,
  }) => {
    await page.goto("/?subject=pdeu-universal-human-values-ce#start");
    await expect(page.getByTestId("upload-material-note")).toContainText(
      "Upload material given by faculty to generate lessons for this subject.",
    );
    await expect(page.getByRole("button", { name: /Build my lesson/ })).toBeDisabled();
  });

  test("a subject the handbook gives no syllabus for says so", async ({ page }) => {
    await choose(page, "ce", "1");
    const card = page
      .getByTestId("pdeu-noncore")
      .getByTestId("pdeu-course")
      .filter({ hasText: "Indian Knowledge System" });
    await expect(card).toContainText("No syllabus printed in the handbook");
  });

  test("an elective slot asks the student to choose, and remembers the choice", async ({
    page,
  }) => {
    await choose(page, "ce", "5");
    const slot = page.getByTestId("pdeu-core").getByTestId("elective-slot").first();
    await expect(slot).toContainText("Choose yours");
    await slot.getByRole("combobox").selectOption({ label: "Data Mining and Data Warehousing" });
    await expect(slot.getByTestId("elective-chosen")).toContainText(
      "Data Mining and Data Warehousing",
    );
    await page.reload();
    await expect(page.getByTestId("pdeu-core").getByTestId("elective-slot").first()).toContainText(
      "Your choice",
    );
    await page.getByTestId("elective-chosen").click();
    await expect(page.getByTestId("subject-chapters")).toContainText("Association Analysis");
  });

  test("other PDEU branches work, and branches PDEU's file lacks are gone", async ({ page }) => {
    await choose(page, "civil", "3");
    await expect(page.getByTestId("pdeu-core").getByTestId("pdeu-course").first()).toBeVisible();
    const options = await page
      .getByTestId("branch-bar")
      .getByLabel("My branch")
      .locator("option")
      .allTextContents();
    expect(options).toContain("Civil Engineering");
    expect(options).not.toContain("Electrical Engineering");
    expect(options).not.toContain("Mining Engineering");
  });
});
