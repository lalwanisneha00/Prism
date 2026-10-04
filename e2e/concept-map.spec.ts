import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const PATH = ["coulombs-law", "electric-field", "electric-flux"];
const node = (id: string) => `[data-node="${id}"]`;

test.describe("Subject concept map (fix before V3 · Step 5)", () => {
  test("hovering a topic lights up its prerequisites in order and fades the rest", async ({
    page,
  }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "hover is a desktop gesture");
    await page.goto("/map?subject=em");
    const graph = page.getByTestId("subject-graph");
    await expect(graph.locator(node("gauss-law"))).toBeVisible();

    await graph.locator(node("gauss-law")).hover();
    await expect(graph.locator(node("gauss-law"))).toHaveAttribute("data-state", "active");
    for (const [i, id] of PATH.entries()) {
      await expect(graph.locator(node(id))).toHaveAttribute("data-state", "path");
      await expect(graph.locator(`${node(id)} [data-step]`)).toHaveText(String(i + 1));
    }
    await expect(graph.locator(`${node("gauss-law")} [data-step]`)).toHaveText("4");
    await expect(graph.locator(node("ohms-law"))).toHaveAttribute("data-state", "faded");
    for (const e of [
      "coulombs-law>electric-field",
      "electric-field>electric-flux",
      "electric-flux>gauss-law",
    ]) {
      await expect(graph.locator(`[data-edge="${e}"]`)).toHaveAttribute("data-state", "path");
    }
    await expect(graph.locator('[data-edge="gauss-law>gauss-law-applications"]')).toHaveAttribute(
      "data-state",
      "faded",
    );

    const panel = page.getByTestId("path-panel");
    await expect(panel.getByRole("heading", { name: "Gauss's law" })).toBeVisible();
    await expect(panel.getByTestId("path-list").getByRole("listitem")).toHaveText([
      /Electric charge and Coulomb's law/,
      /Electric field and field lines/,
      /Electric flux/,
    ]);
    await expect(panel.getByText("This topic unlocks")).toBeVisible();

    // Moving away restores the map; clicking pins; Esc clears.
    await page.mouse.move(2, 2);
    await expect(graph.locator(node("ohms-law"))).toHaveAttribute("data-state", "normal");
    await graph.locator(node("gauss-law")).click();
    await page.mouse.move(2, 2);
    await expect(graph.locator(node("electric-flux"))).toHaveAttribute("data-state", "path");
    await page.keyboard.press("Escape");
    await expect(graph.locator(node("electric-flux"))).toHaveAttribute("data-state", "normal");

    // Keyboard focus highlights the same way.
    await graph.locator(node("electric-dipole")).focus();
    await expect(graph.locator(node("electric-dipole"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(node("electric-field"))).toHaveAttribute("data-state", "path");
  });

  test("on a touch screen the first tap pins the path and the second opens the topic", async ({
    page,
  }, info) => {
    test.skip(!info.project.name.startsWith("mobile"), "touch gesture");
    await page.goto("/map?subject=em");
    const graph = page.getByTestId("subject-graph");
    // Search jumps to a topic and pins its path.
    await page.getByRole("searchbox", { name: "Find a topic on the map" }).fill("Electric flux");
    await page.getByRole("button", { name: "Electric flux", exact: true }).click();
    await expect(graph.locator(node("electric-flux"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(node("electric-field"))).toHaveAttribute("data-state", "path");
    await expectNoSidewaysScroll(page);
    // First tap pins a topic's path, the second tap opens it.
    await graph.locator(node("gauss-law")).tap();
    await expect(graph.locator(node("gauss-law"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(`${node("electric-flux")} [data-step]`)).toHaveText("3");
    await expect(page).toHaveURL(/\/map\?subject=em/);
    await graph.locator(node("gauss-law")).tap();
    await expect(page).toHaveURL(/\/lesson\?subject=em&chapter=electrostatics&topic=gauss-law/);
  });

  test("chapters collapse into one box and expand again", async ({ page }) => {
    await page.goto("/map?subject=em");
    const graph = page.getByTestId("subject-graph");
    await graph
      .getByRole("button", { name: /Electrostatics/ })
      .first()
      .click();
    await expect(graph.locator(node("chapter:electrostatics"))).toBeVisible();
    await expect(graph.locator(node("gauss-law"))).toHaveCount(0);
    await graph.locator(node("chapter:electrostatics")).click();
    await expect(graph.locator(node("gauss-law"))).toBeVisible();
  });
});
