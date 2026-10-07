import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Navigation for many subjects (V3 · Step 3)", () => {
  test("search any topic → the picker opens with it chosen", async ({ page }) => {
    await page.goto("/");
    const search = page.getByTestId("global-search");
    await search.getByLabel("Search any subject, chapter or topic").fill("faraday");
    await search.getByRole("option").first().click();
    await expect(page).toHaveURL(/subject=applied-physics/);
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
    await page.goto("/subjects/applied-physics");
    await expect(page.getByRole("heading", { name: "Applied Physics", level: 1 })).toBeVisible();
    await expect(page.getByTestId("subject-details")).toContainText("3 credits");
    await expect(page.getByTestId("subject-details")).toContainText("24PH101T");
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

  test("a mock test across chapters uses the lessons studied", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/mock-test?subject=applied-physics");
    await expect(page.getByTestId("mock-empty")).toBeVisible();

    // Study (and save) one lesson, then its chapter becomes available.
    await page.goto(
      "/lesson?subject=applied-physics&chapter=electricity-and-magnetism&topic=faradays-law&level=exam-prep&duration=10",
    );
    await page.getByRole("button", { name: /Save lesson/ }).click({ timeout: 90_000 });
    await page.goto("/mock-test?subject=applied-physics");
    const chapters = page.getByTestId("mock-chapters");
    await chapters.getByRole("checkbox", { name: /Electricity and Magnetism/ }).check();
    await expect(chapters.getByRole("checkbox", { name: /Optics/ }).first()).toBeDisabled();
    await chapters.getByRole("button", { name: /Continue with 1 chapter/ }).click();
    await page.getByRole("button", { name: "Start the mock test" }).click();
    await expect(page.getByTestId("mock-timer")).toBeVisible({ timeout: 30_000 });
  });
});
