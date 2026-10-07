import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const fixture = (name: string) => path.join(__dirname, "..", "test-fixtures", name);
const PDEU = fixture("pdeu-computer-engineering-sem1-syllabus.pdf");

async function chooseSemester(page: Page, n: string) {
  const select = page.getByTestId("branch-bar").getByLabel("Semester");
  // A choice made before the page has finished loading can be reset, so check it stuck.
  await expect(async () => {
    await select.selectOption(n);
    await expect(select).toHaveValue(n, { timeout: 1500 });
    await page.waitForTimeout(300);
    await expect(select).toHaveValue(n, { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}

async function uploadPdeu(page: Page) {
  await page.goto("/subjects");
  await chooseSemester(page, "1");
  await page.getByRole("button", { name: "Upload syllabus" }).click();
  await page.getByLabel(/Syllabus file/).setInputFiles(PDEU);
  await expect(page.getByTestId("syllabus-review")).toBeVisible({ timeout: 60_000 });
}

test.describe("My subjects: semester syllabus (PDEU Computer Engineering, semester 1)", () => {
  test("a student with no syllabus can pick branch and semester and browse the collapsed list", async ({
    page,
  }) => {
    await page.goto("/subjects");
    const all = page.getByTestId("all-subjects");
    // Closed by default: never one long list.
    await expect(all).not.toHaveAttribute("open", "");
    await expect(all.getByRole("searchbox")).toBeHidden();
    await expect(page.getByTestId("my-subjects")).toContainText("Choose your branch and semester");

    await page.getByTestId("branch-bar").getByLabel("My branch").selectOption("ee");
    await chooseSemester(page, "1");
    await expect(page.getByTestId("my-subjects")).toContainText("My subjects, semester 1");
    await expect(page.getByTestId("subject-card").first()).toContainText("Suggested");

    await all.locator("summary").click();
    await all.getByRole("searchbox").fill("thermo");
    await expect(all.getByRole("link", { name: /Thermodynamics/ }).first()).toBeVisible();
    await all.getByRole("searchbox").fill("zzzz-nothing");
    await expect(all).toContainText("No subject matches");
    await expectNoSidewaysScroll(page);
  });

  test("reads the real PDEU syllabus, asks about uncertain matches, then personalises", async ({
    page,
  }) => {
    await uploadPdeu(page);
    const review = page.getByTestId("syllabus-review");
    await expect(review).toContainText("Found 7 subjects");
    await expect(review).toContainText("3 lab courses");

    // Clear matches are used as they are.
    await expect(
      review.getByTestId("match-row").filter({ hasText: "Applied Physics" }),
    ).toContainText("On Prism: Applied Physics");
    await expect(
      review.getByTestId("match-row").filter({ hasText: "Universal Human Values" }),
    ).toContainText("Not on Prism");

    // Uncertain ones (Mathematics – I, Computer Programming-I) must be confirmed first.
    const asks = review.getByTestId("confirm-match");
    await expect(asks).toHaveCount(2);
    await expect(asks.first()).toContainText("We think Mathematics – I is Engineering Mathematics");
    await expect(asks.first()).toContainText("Is this right?");
    await expect(page.getByRole("button", { name: /Save to my semester 1/ })).toBeDisabled();
    await expectNoSidewaysScroll(page);

    await asks.first().getByRole("button", { name: "Yes" }).click();
    // Choose another subject / Treat as new subject are the other answers.
    const second = review.getByTestId("confirm-match");
    await expect(second).toHaveCount(1);
    await expect(second.getByRole("button", { name: "Choose another subject" })).toBeVisible();
    await expect(second.getByRole("button", { name: "Treat as new subject" })).toBeVisible();
    await second.getByRole("button", { name: "Yes" }).click();
    await page.getByRole("button", { name: /Save to my semester 1/ }).click();

    await expect(page.getByTestId("syllabus-done")).toContainText("Saved 7 subjects");

    // Cards: syllabus counts and notes.
    const cards = page.getByTestId("my-subjects");
    const physics = cards.getByTestId("subject-card").filter({ hasText: "Applied Physics" });
    await expect(physics).toContainText("topics in your syllabus");
    await expect(physics).toContainText("not in your syllabus");
    await expect(physics.getByTestId("not-on-prism")).toContainText("not on Prism yet");

    const maths = cards.getByTestId("subject-card").filter({ hasText: "Engineering Mathematics" });
    await expect(maths).toContainText("may come in a later semester");

    const values = cards.getByTestId("subject-card").filter({ hasText: "Universal Human Values" });
    await expect(values).toContainText(
      "Upload the material given by your faculty to study this subject here. This is optional and you can do it any time.",
    );
    // Labs are listed, not made into subjects.
    await expect(cards).toContainText("Lab courses in your syllabus");
    await expect(cards.getByTestId("subject-card").filter({ hasText: "Laboratory" })).toHaveCount(
      0,
    );

    // The collapsed list is still collapsed and no longer repeats the personal subjects.
    const all = page.getByTestId("all-subjects");
    await expect(all).not.toHaveAttribute("open", "");
    await expectNoSidewaysScroll(page);

    // It is remembered after a reload (stored on the device).
    await page.reload();
    await expect(
      page
        .getByTestId("my-subjects")
        .getByTestId("subject-card")
        .filter({ hasText: "Applied Physics" }),
    ).toContainText("topics in your syllabus");
  });

  test("topics outside the syllabus stay visible with the note, in the lesson picker and on the map", async ({
    page,
  }, info) => {
    await uploadPdeu(page);
    const review = page.getByTestId("syllabus-review");
    for (let i = 0; i < 2; i++) {
      await review
        .getByTestId("confirm-match")
        .first()
        .getByRole("button", { name: "Yes" })
        .click();
    }
    await page.getByRole("button", { name: /Save to my semester 1/ }).click();
    await expect(page.getByTestId("syllabus-done")).toBeVisible();

    // Lesson picker (home page): Applied Physics topics, some marked as outside the syllabus.
    await page.goto("/?subject=applied-physics&chapter=mechanics");
    await expect(
      page
        .getByText(
          "Not in your syllabus, but you can study this for a better understanding of the subject.",
        )
        .first(),
    ).toBeVisible({ timeout: 30_000 });

    // Concept map: a collapsed subject chooser, with search and the marker.
    await page.goto("/map?subject=applied-physics");
    const picker = page.getByTestId("map-subject-picker");
    await expect(picker).not.toHaveAttribute("open", "");
    await expect(page.getByLabel("Find a topic on the map")).toBeVisible();
    await expect(page.getByTestId("subject-graph")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("not-in-syllabus").first()).toBeAttached();

    await picker.locator("summary").click();
    await picker.getByPlaceholder("Search subject").fill("Applied Phys");
    await expect(picker.getByRole("link", { name: "Applied Physics" })).toBeVisible();
    await picker.getByPlaceholder("Search subject").fill("Chemistry");
    await picker.getByRole("link", { name: /Engineering Chemistry/ }).click();
    await expect(page).toHaveURL(/subject=/);
    await expect(page.getByTestId("subject-graph")).toBeVisible({ timeout: 30_000 });
    await expectNoSidewaysScroll(page);
    await page.screenshot({ path: `test-results/map-picker-${info.project.name}.png` });
  });

  test("Choose another subject lets the student correct a match", async ({ page }) => {
    await uploadPdeu(page);
    const review = page.getByTestId("syllabus-review");
    const first = review.getByTestId("confirm-match").first();
    await first.getByRole("button", { name: "Choose another subject" }).click();
    await first
      .getByLabel("Which Prism subject is it?")
      .selectOption({ label: "Discrete Mathematics" });
    await expect(
      review.getByTestId("match-result").filter({ hasText: "Discrete Mathematics" }),
    ).toBeVisible();
    // And it can be changed again.
    await review
      .getByTestId("match-result")
      .filter({ hasText: "Discrete Mathematics" })
      .getByRole("button", { name: "Change" })
      .click();
    await expect(review.getByTestId("confirm-match")).toHaveCount(2);
  });
});
