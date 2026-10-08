import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

// Applied Physics, unit 1: the topics follow the handbook's teaching order, so each one needs the one before.
const node = (id: string) => `[data-node="${id}"]`;

test.describe("Subject concept map", () => {
  test("hovering a topic lights up its prerequisites in order and fades the rest", async ({
    page,
  }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "hover is a desktop gesture");
    await page.goto("/map?subject=pdeu-applied-physics");
    const graph = page.getByTestId("subject-graph");
    await expect(graph.locator(node("faradays-law"))).toBeVisible();

    await graph.locator(node("faradays-law")).hover();
    await expect(graph.locator(node("faradays-law"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(node("emf"))).toHaveAttribute("data-state", "path");
    await expect(graph.locator(node("ohms-law"))).toHaveAttribute("data-state", "path");
    await expect(graph.locator(node("waveguides"))).toHaveAttribute("data-state", "faded");
    await expect(graph.locator('[data-edge="emf>faradays-law"]')).toHaveAttribute(
      "data-state",
      "path",
    );
    const panel = page.getByTestId("path-panel");
    await expect(panel.getByRole("heading", { name: /Faraday/ })).toBeVisible();
    await expect(panel.getByTestId("path-list").getByRole("listitem").first()).toBeVisible();
    await expect(panel.getByText("This topic unlocks")).toBeVisible();

    // Moving away restores the map; clicking pins; Esc clears.
    await page.mouse.move(2, 2);
    await expect(graph.locator(node("waveguides"))).toHaveAttribute("data-state", "normal");
    await graph.locator(node("faradays-law")).click();
    await page.mouse.move(2, 2);
    await expect(graph.locator(node("emf"))).toHaveAttribute("data-state", "path");
    await page.keyboard.press("Escape");
    await expect(graph.locator(node("emf"))).toHaveAttribute("data-state", "normal");

    // Keyboard focus highlights the same way.
    await graph.locator(node("ohms-law")).focus();
    await expect(graph.locator(node("ohms-law"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(node("vector-potential"))).toHaveAttribute("data-state", "path");
  });

  test("on a touch screen the first tap pins the path and the second opens the topic", async ({
    page,
  }, info) => {
    test.skip(!info.project.name.startsWith("mobile"), "touch gesture");
    await page.goto("/map?subject=pdeu-applied-physics");
    const graph = page.getByTestId("subject-graph");
    // Search jumps to a topic and pins its path.
    await page.getByRole("searchbox", { name: "Find a topic on the map" }).fill("EMF");
    await page.getByRole("button", { name: "EMF", exact: true }).click();
    await expect(graph.locator(node("emf"))).toHaveAttribute("data-state", "active");
    await expect(graph.locator(node("ohms-law"))).toHaveAttribute("data-state", "path");
    await expectNoSidewaysScroll(page);
    // First tap pins a topic's path, the second tap opens it.
    await graph.locator(node("faradays-law")).tap();
    await expect(graph.locator(node("faradays-law"))).toHaveAttribute("data-state", "active");
    await expect(page).toHaveURL(/\/map\?subject=pdeu-applied-physics/);
    await graph.locator(node("faradays-law")).tap();
    await expect(page).toHaveURL(
      /\/lesson\?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topic=faradays-law/,
    );
  });

  test("chapters collapse into one box and expand again", async ({ page }) => {
    await page.goto("/map?subject=pdeu-applied-physics");
    const graph = page.getByTestId("subject-graph");
    await graph
      .getByRole("button", { name: /Electricity and Magnetism/ })
      .first()
      .click();
    await expect(graph.locator(node("chapter:electricity-and-magnetism"))).toBeVisible();
    await expect(graph.locator(node("faradays-law"))).toHaveCount(0);
    await graph.locator(node("chapter:electricity-and-magnetism")).click();
    await expect(graph.locator(node("faradays-law"))).toBeVisible();
  });

  test("opens the student's own subject, and lists their subjects first", async ({ page }) => {
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

    const mine = [
      "Mathematics - I",
      "Applied Physics",
      "Engineering Graphics",
      "Computer Programming - I",
      "Environment Science",
      "English Communication",
      "Universal Human Values",
    ];
    await page.goto("/map");
    const picker = page.getByTestId("map-subject-picker");
    await expect(picker.locator("summary")).toContainText(
      /Mathematics - I|Applied Physics|Engineering Graphics|Computer Programming - I|Environment Science|English Communication|Universal Human Values/,
    );
    await picker.locator("summary").click();
    const names = await picker
      .getByRole("link")
      .evaluateAll((els) => els.slice(0, 7).map((e) => e.textContent ?? ""));
    expect(
      names.every((n) => mine.some((m) => n.startsWith(m))),
      names.join(" | "),
    ).toBe(true);
  });
});
