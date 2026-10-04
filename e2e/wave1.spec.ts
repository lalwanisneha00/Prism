import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

test.describe("Wave 1 subjects (V3 · Step 6)", () => {
  test("Applied Physics shows its own chapters and the linked E&M chapters", async ({ page }) => {
    await page.goto("/subjects/applied-physics");
    await expect(page.getByRole("heading", { name: "Applied Physics" })).toBeVisible();
    await expect(page.getByText(/AICTE Model Curriculum/).first()).toBeVisible();
    const chapters = page.getByTestId("subject-chapters");
    await expect(chapters).toContainText("Quantum Physics");
    await expect(chapters).toContainText("Electrostatics");
    await expectNoSidewaysScroll(page);
    await page.screenshot({ path: `test-results/wave1-physics-${test.info().project.name}.png` });
  });

  test("every Wave 1 subject is listed for a first-year student", async ({ page }) => {
    await page.goto("/subjects");
    for (const name of [
      "Applied Physics",
      "Engineering Chemistry",
      "Basic Electrical Engineering",
      "Basic Electronics Engineering",
      "Engineering Mechanics",
      "Engineering Graphics & Design",
      "Programming for Problem Solving",
      "Environmental Science",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
    }
    await expectNoSidewaysScroll(page);
  });

  test("a new subject's concept map draws and highlights a path", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "hover is a desktop gesture");
    await page.goto("/map?subject=applied-physics");
    const node = page.locator('[data-node="particle-in-a-box"]');
    await page
      .getByRole("searchbox", { name: "Find a topic on the map" })
      .fill("Particle in a box");
    await page.getByRole("button", { name: "Particle in a box", exact: true }).click();
    await expect(node).toHaveAttribute("data-state", "active");
    await expect(page.locator('[data-node="schrodinger-equation"]')).toHaveAttribute(
      "data-state",
      "path",
    );
  });
});
