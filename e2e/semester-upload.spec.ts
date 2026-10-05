import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const syllabus = `Semester III
MA201 Engineering Mathematics III
Unit 1: Complex analysis - analytic functions, Cauchy-Riemann equations, contour integration
Unit 2: Fourier series - periodic functions, Fourier integral
HS201 Quantum Basket Weaving
Unit 1: Warp and weft - knots, loops, tension
Unit 2: Dyes - mordants, natural dyes
`;

test.describe("Upload my semester syllabus (Subjects page)", () => {
  test("adds the semester's subjects by itself, then the picker shows each once", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/subjects");
    const panel = page.getByTestId("semester-upload");
    await expect(panel).toBeVisible();
    await expectNoSidewaysScroll(page);
    await panel.getByText("Or paste the syllabus text").click();
    await panel.getByLabel("Syllabus text").fill(syllabus);
    await panel.getByRole("button", { name: "Add my subjects" }).click();
    const done = page.getByTestId("semester-upload-done");
    await expect(done).toContainText("Added 2 subjects for semester 3");
    await expect(done).toContainText("Engineering Mathematics");
    await expect(done).toContainText("Quantum Basket Weaving");

    // The new subjects are in the lesson maker, each once, with no duplicate-key error.
    await page.goto("/");
    const chips = page.getByTestId("subject-chips");
    await expect(chips.getByText("Quantum Basket Weaving")).toHaveCount(1);
    await expect(chips.getByText("Engineering Mathematics")).toHaveCount(1);
    expect(errors.filter((e) => e.includes("same key"))).toEqual([]);

    // Undo takes this semester's subjects off the list again.
    await page.goto("/subjects");
    await panel.getByText("Or paste the syllabus text").click();
    await panel.getByLabel("Syllabus text").fill(syllabus);
    await panel.getByRole("button", { name: "Add my subjects" }).click();
    await expect(done).toBeVisible();
    await done.getByRole("button", { name: "Undo" }).click();
    await expect(done).toHaveCount(0);
  });

  test("says so when the text has no subjects", async ({ page }) => {
    await page.goto("/subjects");
    const panel = page.getByTestId("semester-upload");
    await panel.getByText("Or paste the syllabus text").click();
    await panel.getByLabel("Syllabus text").fill("nothing useful here");
    await panel.getByRole("button", { name: "Add my subjects" }).click();
    await expect(page.getByTestId("semester-upload-error")).toBeVisible();
  });
});
