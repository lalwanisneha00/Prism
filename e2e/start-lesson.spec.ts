import { expect, test, type Page } from "@playwright/test";

const SYLLABUS = `Unit 1: Vedic literature – The four Vedas, Upanishads
Unit 2: Indian mathematics – Zero and the decimal system, Aryabhata`;

async function openList(page: Page) {
  const list = page.getByTestId("all-subjects-list");
  await list.locator("summary").click();
  return list;
}

test.describe("Start a lesson", () => {
  test("the top bar has Start a lesson, and it opens the lesson maker", async ({ page }) => {
    await page.goto("/subjects");
    const link = page.getByTestId("nav-start-lesson");
    await expect(link).toHaveAttribute("href", "/#start");
    await link.click();
    await expect(page).toHaveURL(/\/#start$/);
    await expect(page.getByTestId("subject-chips")).toBeVisible();
  });

  test("choosing a subject folds the list away again", async ({ page }) => {
    await page.goto("/");
    const list = await openList(page);
    await expect(list).toHaveAttribute("open", "");
    await list
      .getByRole("button", { name: /^Applied Physics/ })
      .first()
      .click();
    await expect(list).not.toHaveAttribute("open", "");
    await expect(page.getByRole("radio", { name: /^Applied Physics/ })).toBeChecked();
  });

  test("Back from a lesson brings the same choices back", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    const list = await openList(page);
    await list
      .getByRole("button", { name: /^Applied Physics/ })
      .first()
      .click();
    await page.getByLabel("Or browse by chapter").selectOption("electricity-and-magnetism");
    await page
      .getByText(/Faraday/)
      .first()
      .click();
    await page.getByText("First Encounter", { exact: true }).click();
    await page.getByRole("button", { name: /Build my lesson/ }).click();
    await expect(page).toHaveURL(/\/lesson\?/, { timeout: 60_000 });

    await page.getByTestId("back-button").click();
    await expect(page).toHaveURL(/\/(\?.*)?(#start)?$/);
    await expect(page.getByRole("radio", { name: /^Applied Physics/ })).toBeChecked();
    await expect(page.getByLabel("Or browse by chapter")).toHaveValue("electricity-and-magnetism");
    await expect(page.getByRole("radio", { name: /Faraday/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: "First Encounter" })).toBeChecked();
  });

  test("a subject the student added comes first in the list", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/my-subjects/new?name=Zebra%20Studies");
    const form = page.getByTestId("custom-subject-form");
    await form.getByLabel(/Type your topics/).fill(SYLLABUS);
    await form.getByRole("button", { name: "Check my outline" }).click();
    await form.getByRole("button", { name: "Save my subject" }).click();
    await expect(page).toHaveURL(/\/my-subjects\/view\?id=custom-/, { timeout: 30_000 });

    await page.goto("/");
    const list = await openList(page);
    await expect(list.getByRole("button").first()).toContainText("Zebra Studies");
  });
});
