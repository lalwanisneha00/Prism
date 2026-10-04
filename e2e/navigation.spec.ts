import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Navigation for many subjects (V3 · Step 3)", () => {
  test("search any topic → the picker opens with it chosen", async ({ page }) => {
    await page.goto("/");
    const search = page.getByTestId("global-search");
    await search.getByLabel("Search any subject, chapter or topic").fill("taylor");
    await search.getByRole("option").first().click();
    await expect(page).toHaveURL(/subject=engg-math/);
    await expect(page.getByRole("radio", { name: /Engineering Mathematics/ })).toBeChecked();
    await expect(page.getByLabel("Or browse by chapter")).not.toHaveValue("");
    await expect(page.getByRole("radio", { name: /Taylor/ })).toBeChecked();
  });

  test("my branch and semester is saved and shapes the subject list", async ({ page }) => {
    await page.goto("/subjects");
    const bar = page.getByTestId("branch-bar");
    await bar.getByLabel("My branch").selectOption("me");
    await bar.getByLabel("Semester").selectOption("1");
    const mine = page.getByTestId("my-subjects");
    await expect(mine).toContainText("Mechanical Engineering, semester 1");
    await expect(mine.getByRole("link", { name: /Electricity & Magnetism/ })).toBeVisible();
    await expectNoSidewaysScroll(page);

    // Saved: the home page picker remembers it.
    await page.goto("/");
    await expect(page.getByTestId("branch-bar").getByLabel("My branch")).toHaveValue("me");
    // The first-year common core: Wave 1's nine subjects plus Electricity & Magnetism.
    await expect(page.getByTestId("subject-chips").getByRole("radio")).toHaveCount(10);
  });

  test("a subject page shows its chapters and leads into lessons", async ({ page }) => {
    await page.goto("/subjects/em");
    await expect(page.getByRole("heading", { name: "Electricity & Magnetism" })).toBeVisible();
    await expect(page.getByText(/Syllabus source:/)).toBeVisible();
    const chapters = page.getByTestId("subject-chapters");
    await expect(chapters.getByRole("listitem").first()).toContainText("Electrostatics");
    await chapters.getByRole("link", { name: "Gauss's law", exact: true }).click();
    await expect(page).toHaveURL(/topic=gauss-law/);
    await expect(page.getByRole("radio", { name: "Gauss's law", exact: true })).toBeChecked();
    await expectNoSidewaysScroll(page);
  });

  test("an unknown subject page is a 404", async ({ page }) => {
    const res = await page.goto("/subjects/underwater-basket-weaving");
    expect(res?.status()).toBe(404);
  });

  test("a mock test across chapters uses the lessons studied", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/mock-test?subject=em");
    await expect(page.getByTestId("mock-empty")).toBeVisible();

    // Study (and save) one lesson, then its chapter becomes available.
    await page.goto(
      "/lesson?subject=em&chapter=electrostatics&topic=gauss-law&level=exam-prep&duration=10",
    );
    await page.getByRole("button", { name: /Save lesson/ }).click({ timeout: 90_000 });
    await page.goto("/mock-test?subject=em");
    const chapters = page.getByTestId("mock-chapters");
    await chapters.getByRole("checkbox", { name: /Electrostatics/ }).check();
    await expect(
      chapters.getByRole("checkbox", { name: /Magnetic Effects/ }).first(),
    ).toBeDisabled();
    await chapters.getByRole("button", { name: /Continue with 1 chapter/ }).click();
    await page.getByRole("button", { name: "Start the mock test" }).click();
    await expect(page.getByTestId("mock-timer")).toBeVisible({ timeout: 30_000 });
  });
});
