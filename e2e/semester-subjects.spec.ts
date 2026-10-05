import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("My subjects this semester", () => {
  test("choose a semester's subjects, add a non-core one, and see them first", async ({ page }) => {
    await page.goto("/subjects");
    const panel = page.getByTestId("semester-subjects");
    await expect(panel.getByText("Choose your semester to pick its subjects.")).toBeVisible();
    await panel.getByLabel("My semester").selectOption("2");
    await panel.getByRole("button", { name: "Choose subjects for semester 2" }).click();
    await panel
      .getByRole("checkbox", { name: /Applied Physics/ })
      .first()
      .check();
    await panel
      .getByTestId("non-core")
      .getByRole("checkbox", { name: /Environmental Science/ })
      .check();
    // A non-core subject Prism does not teach opens the form for the student's own syllabus.
    const own = panel
      .getByTestId("non-core")
      .getByRole("link", { name: /Indian Knowledge System/ });
    await expect(own).toHaveAttribute("href", /semester=2/);
    const picks = panel.getByTestId("semester-picks");
    await expect(picks).toContainText("Applied Physics");
    await expect(picks).toContainText("Environmental Science");
    await expectNoSidewaysScroll(page);

    // It sticks, and the lesson maker shows these subjects first.
    await page.reload();
    await expect(page.getByTestId("semester-picks")).toContainText("Applied Physics");
    await expect(page.getByTestId("semester-picks")).toContainText("Environmental Science");
    await page.goto("/");
    const chips = page.getByTestId("subject-chips");
    await expect(chips.locator("label", { hasText: /^Applied Physics/ })).toBeVisible();
    await expect(chips.locator("label", { hasText: /^Environmental Science/ })).toBeVisible();
    await expect(chips.locator("label", { hasText: /^Electricity & Magnetism/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Show all \d+ subjects/ }).click();
    await expect(chips.locator("label", { hasText: /^Electricity & Magnetism/ })).toBeVisible();
  });

  test("the same subject can sit in different semesters for different colleges", async ({
    page,
  }) => {
    await page.goto("/subjects");
    const panel = page.getByTestId("semester-subjects");
    await panel.getByLabel("My semester").selectOption("1");
    await panel.getByRole("button", { name: "Choose subjects for semester 1" }).click();
    await panel
      .getByRole("checkbox", { name: /Applied Physics/ })
      .first()
      .check();
    await panel.getByLabel("My semester").selectOption("2");
    await expect(panel.getByText("No subjects chosen for semester 2 yet.")).toBeVisible();
    await panel.getByLabel("My semester").selectOption("1");
    await expect(page.getByTestId("semester-picks")).toContainText("Applied Physics");
  });
});
