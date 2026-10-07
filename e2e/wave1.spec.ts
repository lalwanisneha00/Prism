import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("PDEU subjects", () => {
  test("Applied Physics shows PDEU's four units with their hours", async ({ page }) => {
    await page.goto("/subjects/pdeu-applied-physics");
    await expect(page.getByRole("heading", { name: "Applied Physics", level: 1 })).toBeVisible();
    await expect(page.getByText(/PDEU B.Tech curriculum handbook/).first()).toBeVisible();
    const chapters = page.getByTestId("subject-chapters");
    for (const unit of [
      "Electricity and Magnetism",
      "Electromagnetic Waves",
      "Physics of Solids",
      "Optics",
    ]) {
      await expect(chapters).toContainText(unit);
    }
    await expectNoSidewaysScroll(page);
  });

  test("first-semester Computer Engineering subjects are listed by name only", async ({ page }) => {
    await page.goto("/subjects");
    await page.getByTestId("all-subjects").locator("summary").click();
    await page.getByTestId("all-subjects").getByRole("searchbox").fill("Applied Physics");
    await expect(
      page
        .getByTestId("all-subjects")
        .getByRole("link", { name: /Applied Physics/ })
        .first(),
    ).toBeVisible();
    await expect(page.getByTestId("all-subjects")).not.toContainText(/credit/i);
    await expectNoSidewaysScroll(page);
  });

  test("a subject's concept map draws and highlights a path", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "hover is a desktop gesture");
    await page.goto("/map?subject=pdeu-applied-physics");
    await page.getByRole("searchbox", { name: "Find a topic on the map" }).fill("Newton");
    await page
      .getByRole("button", { name: /Newton/ })
      .first()
      .click();
    await expect(page.locator('[data-node="thin-films-newtons-rings"]')).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(page.locator('[data-node="interference-in-thin-films"]')).toHaveAttribute(
      "data-state",
      "path",
    );
  });
});
