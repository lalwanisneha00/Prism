import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const LESSON =
  "/chapter/lesson?subject=pdeu-applied-physics&chapter=electricity-and-magnetism&topics=vector-potential,ohms-law,faradays-law&level=exam-prep&minutes=30&plan=vector-potential:10,ohms-law:10,faradays-law:10";

test("reading a chapter lesson: progress, resume, mixed quiz, mock test, dashboard", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await page.goto(LESSON);
  await expect(page.getByTestId("chapter-wrap")).toBeVisible({ timeout: 180_000 });

  // Chapter audio: one narration for the whole chapter (short version needs no AI).
  const audio = page.getByTestId("chapter-audio");
  await expect(audio).toContainText("Chapter audio");
  const short = audio.getByRole("button", { name: "or play the short version now" });
  if (await short.count()) {
    await short.click();
    await expect(
      audio.getByRole("button", { name: /Create my 30-minute chapter audio/ }),
    ).toBeVisible();
  }

  const bar = page.getByTestId("reading-bar");
  await expect(bar).toContainText("0 of 3 topics done");
  await expect(bar).toContainText("about 30 min left");

  // Reading to the end of each topic ticks it off.
  for (const end of await page.locator("[data-topic-end]").all()) {
    await end.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  await expect(bar).toContainText("3 of 3 topics done");

  // The reading position is saved: come back after scrolling to topic 2.
  await page.locator('[data-topic-section="ohms-law"]').scrollIntoViewIfNeeded();
  await page
    .locator('[data-topic-section="ohms-law"] h2')
    .first()
    .evaluate((h) => h.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(2500);
  await page.reload();
  await expect(page.getByTestId("resume")).toContainText(/Gauss|Ohm/, { timeout: 30_000 });
  await expect(page.getByTestId("reading-bar")).toContainText("3 of 3 topics done");

  // Chapter extras: revision sheet and the mixed quiz.
  await expect(page.getByTestId("chapter-sheet")).toBeVisible();
  const quiz = page.getByTestId("chapter-quiz");
  await expect(quiz).toBeVisible();

  // The mock test (paper mode): the paper, Finish, the answer sheet, the student's own total.
  const mock = page.getByTestId("mock-test");
  await mock.getByRole("radio", { name: /10 marks/ }).click();
  await mock.getByRole("button", { name: "Start the mock test" }).click();
  await expect(mock.getByTestId("mock-paper")).toBeVisible({ timeout: 60_000 });
  await expect(mock.getByTestId("answer-sheet")).toHaveCount(0);
  await mock.getByRole("button", { name: "Start timer" }).click();
  await mock.getByRole("button", { name: "Finish mock test" }).first().click();
  await expect(mock.getByTestId("answer-sheet")).toBeVisible();
  await mock.getByTestId("self-score").getByRole("textbox").fill("7");
  await mock.getByRole("button", { name: "Save my score" }).click();
  await expect(mock.getByTestId("self-score")).toContainText("✓ Saved: 7 / 10");
  await expectNoSidewaysScroll(page);

  await page.goto("/dashboard");
  await expect(page.getByText("Recent mock tests")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Electricity and Magnetism · \d+ min/)).toBeVisible();
});
