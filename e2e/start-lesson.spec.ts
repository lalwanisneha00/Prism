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
    await expect(link).toHaveAttribute("href", "/start");
    await link.click();
    await expect(page).toHaveURL(/\/start$/);
    // The lesson maker itself, not the home page.
    await expect(page.getByRole("heading", { name: "Start a lesson", level: 1 })).toBeVisible();
    await expect(page.getByText(/topics you got stuck on/)).toHaveCount(0);
    await expect(page.getByTestId("subject-chips")).toBeVisible();
  });

  test("choosing a subject folds the list away again", async ({ page }) => {
    await page.goto("/start");
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
    await page.goto("/start");
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
    await expect(page).toHaveURL(/\/start/);
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

    await page.goto("/start");
    const list = await openList(page);
    await expect(list.getByRole("button").first()).toContainText("Zebra Studies");
  });

  test("after choosing branch and semester, the student's subjects come first everywhere", async ({
    page,
  }) => {
    test.setTimeout(120_000);
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
    const isMine = (text: string) => mine.some((m) => text.startsWith(m));

    // The lesson maker's list.
    await page.goto("/start");
    const list = await openList(page);
    const first = await list
      .getByRole("button")
      .evaluateAll((els) => els.slice(0, 7).map((e) => e.textContent ?? ""));
    expect(first.every(isMine), first.join(" | ")).toBe(true);

    // The subject choice when adding material.
    await page.goto("/notes");
    const options = await page
      .getByTestId("materials-input")
      .locator("xpath=ancestor::*[.//select][1]")
      .locator("select")
      .first()
      .locator("option")
      .allTextContents();
    expect(isMine(options[1] ?? ""), options.slice(0, 4).join(" | ")).toBe(true);
  });

  test("changing the branch here switches the chosen subject and the subjects on top", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/start");
    const bar = page.getByTestId("branch-bar");
    const choose = async (branch: string, semester: string) => {
      await expect(async () => {
        await bar.getByLabel("My branch").selectOption(branch);
        await expect(bar.getByLabel("My branch")).toHaveValue(branch, { timeout: 2000 });
        await expect(bar.getByLabel("Semester")).toBeEnabled({ timeout: 2000 });
        await bar.getByLabel("Semester").selectOption(semester);
        await expect(bar.getByLabel("Semester")).toHaveValue(semester, { timeout: 2000 });
        await page.waitForTimeout(300);
        await expect(bar.getByLabel("My branch")).toHaveValue(branch, { timeout: 2000 });
      }).toPass({ timeout: 30_000 });
    };
    const chip = page.getByTestId("subject-chips").getByRole("radio", { checked: true });
    const chipText = async () =>
      (await page.getByTestId("subject-chips").locator("label").first().innerText())
        .split("·")[0]
        .trim();

    await choose("ce", "1");
    await expect(page.getByTestId("subject-chips")).toContainText(
      /Mathematics - I|Applied Physics|Engineering Graphics|Computer Programming - I|Environment Science|English Communication|Universal Human Values/,
    );
    const ceSubject = await chipText();
    const ceList = await (
      await openList(page)
    )
      .getByRole("button")
      .evaluateAll((els) => els.slice(0, 3).map((e) => (e.textContent ?? "").trim()));

    await choose("civil", "1");
    await expect(chip).toHaveCount(1);
    await expect.poll(chipText).not.toBe(ceSubject);
    const civilList = await page
      .getByTestId("all-subjects-list")
      .getByRole("button")
      .evaluateAll((els) => els.slice(0, 3).map((e) => (e.textContent ?? "").trim()));
    expect(civilList.join("|")).not.toBe(ceList.join("|"));
  });
});
