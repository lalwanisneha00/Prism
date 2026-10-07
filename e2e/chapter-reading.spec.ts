import { expect, test } from "@playwright/test";
import { expectNoSidewaysScroll } from "./helpers/layout";

const LESSON =
  "/chapter/lesson?subject=applied-physics&chapter=electricity-and-magnetism&topics=vector-potential,ohms-law,faradays-law&level=exam-prep&minutes=30&plan=vector-potential:10,ohms-law:10,faradays-law:10";

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

  // The mock test: start, hand in, mark the written answers, save.
  const mock = page.getByTestId("mock-test");
  await mock.getByRole("radio", { name: /15 min/ }).click();
  await mock.getByRole("button", { name: "Start the mock test" }).click();
  await expect(mock.getByTestId("mock-timer")).toContainText(/1[45]:\d\d left/, {
    timeout: 30_000,
  });
  await mock.getByRole("radio").filter({ hasNotText: "min" }).first().check();
  await mock.getByRole("button", { name: "Hand in my answers" }).click();
  await expect(mock.getByTestId("mock-score")).toBeVisible();
  await mock.getByText("States the main idea").click();
  await mock.getByRole("button", { name: "Save my result" }).click();
  await expect(mock.getByRole("button", { name: "✓ Result saved" })).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.goto("/dashboard");
  await expect(page.getByText("Recent mock tests")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Electrostatics · 15 min/)).toBeVisible();
});
