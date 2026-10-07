import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const fixture = (name: string) => path.join(__dirname, "..", "test-fixtures", name);

async function pickChapter(page: Page) {
  await page.goto("/");
  await page.getByTestId("all-subjects-list").locator("summary").click();
  await page
    .getByTestId("all-subjects-list")
    .getByRole("button", { name: /^Applied Physics/ })
    .click();
  await page.getByLabel("Or browse by chapter").selectOption("electricity-and-magnetism");
}

test.describe("Whole-chapter lessons: choosing and planning (V2.5 · Step 3)", () => {
  test("whole chapter → three time options → adjustable plan", async ({ page }) => {
    await pickChapter(page);
    await page.getByRole("radio", { name: "Study the whole chapter" }).click();
    await expect(page.getByText("Choose a level first")).toBeVisible();
    await page.getByText("First Encounter", { exact: true }).click();

    const options = page.getByTestId("time-options");
    await expect(options.getByRole("radio")).toHaveCount(3);
    await expect(options.getByText(/^Quick · \d+ min/)).toBeVisible();
    await expect(options.getByText(/^Standard · \d+ min/)).toBeVisible();
    await expect(options.getByText(/^Thorough · \d+ min/)).toBeVisible();
    // The recommended one is chosen to begin with.
    await expect(options.getByRole("radio", { checked: true })).toHaveCount(1);
    await expect(options.getByText("Recommended")).toBeVisible();
    await expectNoSidewaysScroll(page);

    const why = page.getByTestId("why-timings");
    await why.getByText("Why these timings?").click();
    await expect(why.getByText("16 topics")).toBeVisible();
    await expect(why.getByText(/size and difficulty only/)).toBeVisible();

    await page.getByRole("button", { name: /Build my lesson/ }).click();
    await expect(page).toHaveURL(/\/chapter\?/);
    const list = page.getByTestId("plan-list");
    await expect(list.getByRole("listitem")).toHaveCount(16);
    const total = page.getByTestId("plan-total");
    const before = await total.textContent();
    expect(before).toMatch(/Total: (\d+) of \1 min/);
    await expectNoSidewaysScroll(page);
    await page.screenshot({ path: test.info().outputPath("plan.png"), fullPage: true });

    // More time for one topic, skip another: the total stays the chosen option.
    await list
      .getByRole("button", { name: /More time for/ })
      .first()
      .click();
    await list.getByRole("button", { name: "Skip" }).nth(2).click();
    await expect(total).toHaveText(before!);
    await expect(list.getByText("Skipped")).toBeVisible();
    await expect(page.getByRole("link", { name: /Start the lesson/ })).toHaveAttribute(
      "href",
      /\/chapter\/lesson\?.*plan=/,
    );
  });

  test("chosen topics, and uploaded papers shape the estimate", async ({ page }) => {
    await page.goto("/notes?subject=applied-physics");
    await page
      .getByTestId("materials-input")
      .setInputFiles(fixture("PYQ-applied-physics-2024.txt"));
    await expect(page.getByText(/saved as Previous-year paper/)).toBeVisible();

    await pickChapter(page);
    await page.getByRole("radio", { name: "Choose topics" }).click();
    await page.getByText(/Faraday/).click();
    await page.getByText("Vector Potential", { exact: true }).click();
    await page.getByText("Exam Prep", { exact: true }).click();
    const why = page.getByTestId("why-timings");
    await why.getByText("Why these timings?").click();
    await expect(why.getByText("2 topics")).toBeVisible();
    await expect(why.getByText(/appears in 1 of your 1 uploaded paper/)).toBeVisible();
    await expect(why.getByText(/size and difficulty only/)).toHaveCount(0);

    await page.getByRole("button", { name: /Build my lesson/ }).click();
    await expect(page.getByTestId("plan-list").getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("most important topics first")).toBeVisible();
  });

  test("asks for topics when none are ticked", async ({ page }) => {
    await pickChapter(page);
    await page.getByRole("radio", { name: "Choose topics" }).click();
    await expect(page.getByText("Tick the topics you want first.")).toBeVisible();
    await page.getByText("Select all").click();
    await page.getByText("Last-Minute Revision", { exact: true }).click();
    await expect(page.getByTestId("time-options").getByRole("radio")).toHaveCount(3);
  });
});

test("a broken chapter link explains itself", async ({ page }) => {
  await page.goto(
    "/chapter?subject=applied-physics&chapter=electricity-and-magnetism&level=genius&minutes=2",
  );
  await expect(page.getByRole("heading", { name: /can't be planned/ })).toBeVisible();
});
